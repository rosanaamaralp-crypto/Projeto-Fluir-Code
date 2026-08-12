# Fase 4 — Módulo de Appointments: Arquitetura e Decisões

## 1. Escopo

A Fase 4 implementa o módulo central do sistema Fluir da Vida: agendamentos de consultas/sessões.

Novos recursos:

| Recurso | Descrição |
|---|---|
| `POST /api/appointments` | Criar agendamento (CLIENT ou ADMIN) |
| `GET /api/appointments` | Listar agendamentos com filtros RBAC |
| `GET /api/appointments/:id` | Buscar por ID com ownership check |
| `GET /api/appointments/:id/history` | Histórico de status |
| `PATCH /api/appointments/:id` | Cancelar / mudar status / reagendar |

---

## 2. Camadas

```
routes/appointments.ts          ← RBAC no nível de rota
  └─ controllers/appointments.controller.ts   ← parsing HTTP, thin
       └─ services/appointments.service.ts     ← toda a lógica de negócio
            ├─ repositories/appointments.repository.ts
            ├─ repositories/appointment-status-history.repository.ts
            ├─ repositories/audit-logs.repository.ts
            ├─ repositories/services.repository.ts
            ├─ repositories/professionals.repository.ts
            └─ (+ clients, professional-services, resources, addresses, etc.)
```

---

## 3. Modalidades

O banco aceita exatamente dois valores para `modality`:

| Valor | Significado | resource_id | address_id |
|---|---|---|---|
| `IN_PERSON` | Atendimento presencial | NOT NULL (auto-selecionado) | NULL |
| `HOME_CARE` | Atendimento domiciliar | NULL | NOT NULL (fornecido pelo client) |

A CHECK constraint `chk_appt_modality_refs` garante essa regra no banco.

O validador Zod (`CreateAppointmentSchema`) rejeita qualquer valor diferente de `IN_PERSON` ou `HOME_CARE` com 400 antes de chegar ao serviço.

---

## 4. Fluxo de criação (`AppointmentsService.create`)

```
1.  Resolver clientId (session para CLIENT; payload para ADMIN)
2.  Verificar professional ACTIVE
3.  Verificar service ACTIVE
4.  Verificar vínculo professional_services.active = true
5.  Checar allowedModalities do serviço vs modality solicitada
5.5 Validação rápida: HOME_CARE sem addressId → ValidationError(400)  [antes de queries de disponibilidade]
6.  Calcular endDatetime = startDatetime + durationMinutes
7.  Checar antecedência mínima (SLOT_MIN_NOTICE_HOURS=2h, boundary estrito: start <= limit → rejeitado)
8.  Checar antecedência máxima (SLOT_MAX_ADVANCE_DAYS=60)
9.  Checar janela de disponibilidade do profissional
10. Checar blocked_periods do profissional (sobreposição = ConflictError 409)
11. Checar sobreposição client (SELECT pre-check, otimista)
12. Checar sobreposição professional (SELECT pre-check, otimista)
13a. IN_PERSON: selecionar resource disponível (primeiro ACTIVE sem conflito)
13b. HOME_CARE: verificar endereço existe e pertence ao client
14. Transação:
    a. INSERT appointments → retorna appointment com status CONFIRMED
    b. INSERT appointment_status_history (oldStatus=null, newStatus=CONFIRMED)
    c. INSERT audit_logs (APPOINTMENT_CREATED)
    ← Commit ou ROLLBACK
```

---

## 5. Estratégia de concorrência

**Problema:** duas requisições simultâneas podem passar nos SELECT de pre-check (etapas 11 e 12) e tentar inserir no mesmo horário.

**Solução adotada:**

- SELECT pre-checks para mensagens de erro claras (4xx humanizado)
- EXCLUDE constraints como linha definitiva de defesa no banco:
  - `excl_client_no_overlap` — usando `tstzrange(start, end) WITH &&`, excluindo status `CANCELLED/COMPLETED/NO_SHOW`
  - `excl_professional_no_overlap` — mesma lógica para o profissional
  - `excl_resource_no_overlap` — mesma lógica para o resource (sala)
- `23P01` (exclusion_violation) → mapeado para `ConflictError` (409) em `mapDbError()`
- `SELECT FOR UPDATE` **não** foi usado — não previne INSERT concorrente, apenas UPDATE/DELETE

**Decisão registrada:** aceito como padrão correto para este caso de uso (otimistic pre-checks + DB constraints como guarda definitiva).

---

## 6. Transições de status

```
null ──CREATE──► CONFIRMED
                    │
              ┌─────┴─────┐
              ▼           ▼
          IN_PROGRESS  CANCELLED (todos os roles)
              │
       ┌──────┴──────┐
       ▼             ▼
   COMPLETED      NO_SHOW    ── ADMIN pode cancelar IN_PROGRESS
```

| Transição | Roles permitidos |
|---|---|
| CONFIRMED → CANCELLED | CLIENT, PROFESSIONAL, ADMIN |
| CONFIRMED → IN_PROGRESS | PROFESSIONAL, ADMIN |
| IN_PROGRESS → COMPLETED | PROFESSIONAL, ADMIN |
| IN_PROGRESS → NO_SHOW | PROFESSIONAL, ADMIN |
| IN_PROGRESS → CANCELLED | ADMIN apenas |
| Qualquer → qualquer (terminal) | ❌ Bloqueado |

Estados terminais: `COMPLETED`, `CANCELLED`, `NO_SHOW` são imutáveis.

---

## 7. Reagendamento

Não existe status `RESCHEDULED`. O reagendamento é implementado como:

1. `PATCH /api/appointments/:id` com `{ reschedule: true, newStartDatetime }`
2. Na transação: cancela o original (status → CANCELLED) e cria um novo `CONFIRMED`
3. O registro em `appointment_status_history` usa os campos de reagendamento:
   `old_start_datetime`, `new_start_datetime`, `old_professional_id`, `new_professional_id`

---

## 8. price_at_booking

O preço é congelado no momento da criação:

```typescript
priceAtBooking: service.price  // string "100.00" do Drizzle
```

Independe de alterações futuras no preço do serviço.

---

## 9. Audit log

Todo evento de appointment dispara um registro em `audit_logs` **dentro da mesma transação**:

| Evento | action | entityId |
|---|---|---|
| Criação | `APPOINTMENT_CREATED` | ID do novo appointment |
| Mudança de status | `APPOINTMENT_STATUS_UPDATED` | ID do appointment |
| Cancelamento | `APPOINTMENT_CANCELLED` | ID do appointment cancelado |
| Reagendamento | `APPOINTMENT_RESCHEDULED` | ID do **novo** appointment criado |

> **OBS-A (Fase 4.1):** Durante `reschedule()`, o appointment original recebe um audit
> `APPOINTMENT_CANCELLED` (entityId = ID original), seguido do `APPOINTMENT_RESCHEDULED`
> (entityId = ID do novo appointment). Ambos ficam na mesma transaction — se qualquer
> operação falhar, tudo sofre rollback e nenhum audit é gravado.

Por decisão da Fase 4 (OBS-2), o audit de appointments é sempre transacional — diferente do login/logout (fire-and-forget legacy da Fase 3).

---

## 10. Testes

| Suite | Arquivo | Cobertura |
|---|---|---|
| Unit | `tests/unit/services/appointments.service.test.ts` | Lógica pura: end_datetime, antecedência, transições, modalidade, resource, ownership, 23P01 |
| Integration | `tests/integration/appointments.test.ts` | Todos os cenários de RBAC, validação, criação, status, história, audit, blocked period, disponibilidade, **reagendamento (OBS-E)** |
| Concurrency | `tests/integration/concurrency/appointments.concurrent.test.ts` | Promise.all → [201, 409] para Casos A, B, C e D (OBS-C) |
| Slots CLIENT filter | `tests/integration/slots-client-filter.test.ts` | CLIENT sem clientId → usa sessão; CLIENT com appointment → slot oculto; CLIENT envia clientId de outro → ignorado; ADMIN sem filtro (OBS-D) |

**Regra de slot nos testes de integração:**
- `uniqueSlot()` usa d+2 em diante, horas 10–13 UTC, incremento de 1h por chamada.
- `rSlot()` (testes de reagendamento) usa d+20 em diante para evitar colisão com os demais.

**Casos de concorrência (OBS-C):**
- **Caso A** (d+11): mesmo client, profissionais diferentes → `excl_client_no_overlap`
- **Caso B** (d+12): mesmo profissional, clientes diferentes → `excl_professional_no_overlap`
- **Caso C** (d+13): mesmo resource, client+professional diferentes → `excl_resource_no_overlap`
- **Caso D** (d+10): mesma combinação completa → qualquer EXCLUDE constraint

---

## 11. Seed de testes

### `seedAppointmentExtras`

Fixtures adicionais para testes de appointments:

- **Resource:** `Sala Teste Fase4` (ACTIVE, tipo MASSAGE_TABLE) — usado em IN_PERSON
- **Serviço HOME_CARE:** `Massagem Domiciliar Teste` (ACTIVE, durationMinutes=60)
- **Availability:** todos os 7 dias da semana, 08:00–20:00 UTC
- **Vínculos:** `professional_services` para ambos os serviços
- **Endereço do cliente:** para testes de HOME_CARE

### `seedConcurrencyExtras` (Fase 4.1 — OBS-C)

Fixtures adicionais para os Casos A, B e C de concorrência:

- **prof2** (`prof2-appt@fluir.test`): segundo profissional com availability 08:00–20:00 e vínculo ao serviceId de teste
- **client2** (`client2-appt@fluir.test`): segundo cliente para testes de Caso B e C

O cleanup em `cleanTestData()` inclui `client2-appt@fluir.test` e `prof2-appt@fluir.test`.

---

## 12. Fase 4.1 — Correção das ressalvas da auditoria independente

### OBS-A — Audit log do cancelamento durante reagendamento ✅ CORRIGIDA

**Problema:** `reschedule()` só emitia `APPOINTMENT_RESCHEDULED`. O cancelamento do original não tinha `APPOINTMENT_CANCELLED`.

**Correção:** Após o status history do cancelamento (passo 5), adicionado `APPOINTMENT_CANCELLED` com `entityId = appointmentId` (original), dentro da mesma transaction. O `APPOINTMENT_RESCHEDULED` permanece inalterado no entityId do novo appointment.

### OBS-B — addresses sem coluna status ✅ SEM AÇÃO

Por decisão de schema, `addresses` não possui coluna `status`. Nenhuma alteração necessária.

### OBS-C — Testes de concorrência para Casos A, B, C ✅ CORRIGIDA

Adicionados três casos ao `appointments.concurrent.test.ts` com `Promise.all`, verificando que a EXCLUDE constraint correspondente é a proteção definitiva em cada cenário.

### OBS-D — GET /api/slots para CLIENT ✅ CORRIGIDA (já implementada, testes adicionados)

O `SlotsController` já derivava `clientId` exclusivamente da session para role CLIENT (o `SlotsQuerySchema` não inclui `clientId`, então qualquer parâmetro enviado pelo cliente é descartado pelo middleware). Adicionado `slots-client-filter.test.ts` provando o comportamento end-to-end.

### OBS-E — Testes de integração do reagendamento ✅ CORRIGIDA

Adicionados 6 testes de integração em `appointments.test.ts` cobrindo: CLIENT happy path (com verificação de audit APPOINTMENT_CANCELLED + APPOINTMENT_RESCHEDULED), ADMIN happy path, PROFESSIONAL → 403, appointment não CONFIRMED → 400, conflito com rollback → 409, regra de negócio inválida → erro.
