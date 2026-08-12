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

| Evento | action |
|---|---|
| Criação | `APPOINTMENT_CREATED` |
| Mudança de status | `APPOINTMENT_STATUS_UPDATED` |
| Reagendamento | `APPOINTMENT_RESCHEDULED` |

Por decisão da Fase 4 (OBS-2), o audit de appointments é sempre transacional — diferente do login/logout (fire-and-forget legacy da Fase 3).

---

## 10. Testes

| Suite | Arquivo | Cobertura |
|---|---|---|
| Unit | `tests/unit/services/appointments.service.test.ts` | Lógica pura: end_datetime, antecedência, transições, modalidade, resource, ownership, 23P01 |
| Integration | `tests/integration/appointments.test.ts` | Todos os cenários de RBAC, validação, criação, status, história, audit, blocked period, disponibilidade |
| Concurrency | `tests/integration/concurrency/appointments.concurrent.test.ts` | Promise.all de 2 requests idênticos → [201, 409], 1 CONFIRMED no banco |

**Regra de slot nos testes de integração:** `uniqueSlot()` garante slots dentro da janela 08:00–20:00 UTC em dias futuros (d+2 em diante), com incremento de 1h por chamada para evitar sobreposição de 60 min de duração.

---

## 11. Seed de testes (`seedAppointmentExtras`)

Fixtures adicionais para testes de appointments:

- **Resource:** `Sala Teste Fase4` (ACTIVE, tipo MASSAGE_TABLE) — usado em IN_PERSON
- **Serviço HOME_CARE:** `Massagem Domiciliar Teste` (ACTIVE, durationMinutes=60)
- **Availability:** todos os 7 dias da semana, 08:00–20:00 UTC
- **Vínculos:** `professional_services` para ambos os serviços
- **Endereço do cliente:** para testes de HOME_CARE

O cleanup em `cleanTestData()` agora inclui:
1. `DISABLE TRIGGER trg_appt_history_no_delete` (append-only)
2. DELETE `appointment_status_history` e `appointments` para users de teste
3. `ENABLE TRIGGER trg_appt_history_no_delete` — reativado **imediatamente** no mesmo bloco
