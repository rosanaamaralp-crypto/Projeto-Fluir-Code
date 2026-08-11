# Fase 2 — Modelo de Dados
## Fluir da Vida

**Status:** ✅ Concluída  
**Data de implementação:** 2026-08-11  
**Aprovações recebidas:** Modelo conceitual → Revisão com ajustes → Revisão técnica → Execução

---

## 1. Arquivos Criados

### Schema Drizzle (TypeScript — ORM)

| Arquivo | Tabela |
|---|---|
| `lib/db/src/schema/roles.ts` | `roles` |
| `lib/db/src/schema/users.ts` | `users` |
| `lib/db/src/schema/clients.ts` | `clients` |
| `lib/db/src/schema/professionals.ts` | `professionals` |
| `lib/db/src/schema/addresses.ts` | `addresses` |
| `lib/db/src/schema/services.ts` | `services` |
| `lib/db/src/schema/professional-services.ts` | `professional_services` |
| `lib/db/src/schema/availability.ts` | `availability` |
| `lib/db/src/schema/blocked-periods.ts` | `blocked_periods` |
| `lib/db/src/schema/resources.ts` | `resources` |
| `lib/db/src/schema/appointments.ts` | `appointments` |
| `lib/db/src/schema/appointment-status-history.ts` | `appointment_status_history` |
| `lib/db/src/schema/notifications.ts` | `notifications` |
| `lib/db/src/schema/audit-logs.ts` | `audit_logs` |
| `lib/db/src/schema/index.ts` | re-exporta todas as 14 tabelas |

### Infraestrutura de banco

| Arquivo | Propósito |
|---|---|
| `lib/db/migrations/0001_initial_schema.sql` | DDL completo: extensão, funções trigger, 14 tabelas, índices, EXCLUDE constraints, triggers |
| `lib/db/src/migrate.ts` | Runner de migration com rastreamento em `schema_migrations` |
| `lib/db/src/seed.ts` | Seed idempotente: 3 roles + 5 macas |
| `lib/db/src/test-migration.ts` | 21 testes automatizados de validação do schema |

### Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `lib/db/package.json` | Scripts `migrate`, `seed`, `test:migration` adicionados; `tsx` adicionado como devDependency |
| `lib/db/drizzle.config.ts` | Campo `out` adicionado apontando para `./migrations` |
| `replit.md` | Atualizado com comandos da Fase 2, arquitetura, gotchas |

---

## 2. Migration Executada

**Arquivo:** `lib/db/migrations/0001_initial_schema.sql`  
**Rastreada em:** tabela `schema_migrations`  
**Resultado:** aplicada com sucesso, 0 erros

Reexecução segura — segunda execução retorna `[skip] 0001_initial_schema.sql — already applied`.

---

## 3. Tabelas Criadas (14)

Em ordem de criação (respeita FKs):

| # | Tabela | Descrição |
|---|---|---|
| 1 | `roles` | Perfis imutáveis: ADMIN, PROFESSIONAL, CLIENT |
| 2 | `users` | Identidade e autenticação de todos os usuários |
| 3 | `clients` | Dados específicos do cliente (extensão de users) |
| 4 | `professionals` | Dados específicos do profissional (extensão de users) |
| 5 | `addresses` | Endereços dos clientes (1 por cliente no MVP) |
| 6 | `services` | Serviços oferecidos pelo Fluir da Vida |
| 7 | `professional_services` | Habilitação N:N entre profissionais e serviços |
| 8 | `availability` | Disponibilidade recorrente semanal do profissional |
| 9 | `blocked_periods` | Períodos de indisponibilidade do profissional |
| 10 | `resources` | Recursos físicos (5 macas no MVP) |
| 11 | `appointments` | Agendamentos e atendimentos |
| 12 | `appointment_status_history` | Histórico append-only de mudanças de status |
| 13 | `notifications` | Notificações in-app por usuário |
| 14 | `audit_logs` | Rastreabilidade administrativa (append-only) |

---

## 4. Índices Criados

### `users`
| Índice | Tipo | Campos |
|---|---|---|
| `uq_users_email_lower` | UNIQUE funcional | `lower(email)` |
| `idx_users_role_id` | B-tree | `role_id` |
| `idx_users_status` | B-tree | `status` |

### `appointments`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_appt_professional_time` | B-tree | `(professional_id, start_datetime, end_datetime)` |
| `idx_appt_resource_time` | B-tree | `(resource_id, start_datetime, end_datetime)` |
| `idx_appt_client_id` | B-tree | `client_id` |
| `idx_appt_start_datetime` | B-tree | `start_datetime` |
| `idx_appt_professional_status` | B-tree | `(professional_id, status, start_datetime)` |
| `idx_appt_status` | B-tree | `status` |

### `availability`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_availability_prof_weekday` | B-tree | `(professional_id, weekday)` |

### `blocked_periods`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_blocked_prof_time` | B-tree | `(professional_id, start_datetime, end_datetime)` |
| `idx_blocked_status` | B-tree | `status` |

### `notifications`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_notif_user_unread` | B-tree parcial (`WHERE read_at IS NULL`) | `(user_id, created_at DESC)` |
| `idx_notif_user_all` | B-tree | `(user_id, created_at DESC)` |

### `audit_logs`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_audit_entity` | B-tree | `(entity_type, entity_id)` |
| `idx_audit_user_id` | B-tree | `user_id` |
| `idx_audit_created_at` | B-tree | `created_at DESC` |

### `appointment_status_history`
| Índice | Tipo | Campos |
|---|---|---|
| `idx_appt_history_appt_id` | B-tree | `appointment_id` |

**Total: 18 índices**

---

## 5. Constraints Criadas

### CHECK constraints

| Tabela | Constraint | Regra |
|---|---|---|
| `users` | `chk_users_status` | `status IN ('ACTIVE', 'INACTIVE')` |
| `clients` | `chk_clients_status` | `status IN ('ACTIVE', 'INACTIVE')` |
| `professionals` | `chk_professionals_status` | `status IN ('ACTIVE', 'INACTIVE')` |
| `services` | `chk_services_duration` | `duration_minutes > 0` |
| `services` | `chk_services_price` | `price >= 0` |
| `services` | `chk_services_modalities` | `allowed_modalities IN ('IN_PERSON', 'HOME_CARE', 'BOTH')` |
| `services` | `chk_services_status` | `status IN ('ACTIVE', 'INACTIVE')` |
| `availability` | `chk_availability_weekday` | `weekday BETWEEN 0 AND 6` |
| `availability` | `chk_availability_time` | `end_time > start_time` |
| `blocked_periods` | `chk_blocked_periods_dates` | `end_datetime > start_datetime` |
| `blocked_periods` | `chk_blocked_periods_status` | `status IN ('ACTIVE', 'CANCELLED')` |
| `resources` | `chk_resources_type` | `type IN ('MASSAGE_TABLE', 'ROOM', 'EQUIPMENT', 'OTHER')` |
| `resources` | `chk_resources_status` | `status IN ('ACTIVE', 'INACTIVE')` |
| `appointments` | `chk_appt_dates` | `end_datetime > start_datetime` |
| `appointments` | `chk_appt_price` | `price_at_booking >= 0` |
| `appointments` | `chk_appt_status` | `status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')` |
| `appointments` | `chk_appt_modality` | `modality IN ('IN_PERSON', 'HOME_CARE')` |
| `appointments` | `chk_appt_modality_refs` | HOME_CARE exige address_id; IN_PERSON exige resource_id |

### UNIQUE constraints

| Tabela | Constraint | Campo(s) |
|---|---|---|
| `users` | `uq_users_email_lower` (índice funcional) | `lower(email)` |
| `clients` | inline `UNIQUE` | `user_id` |
| `professionals` | inline `UNIQUE` | `user_id` |
| `addresses` | inline `UNIQUE` | `client_id` (MVP: 1 endereço por cliente) |
| `resources` | inline `UNIQUE` | `name` |
| `professional_services` | `uq_professional_services` | `(professional_id, service_id)` |

### FK constraints (todas ON DELETE RESTRICT)

Todas as 20 FKs criadas com `ON DELETE RESTRICT` — nenhum registro referenciado pode ser deletado enquanto existir referência.

---

## 6. EXCLUDE Constraints (btree_gist)

| Constraint | Tabela | Campos | Status excluídos |
|---|---|---|---|
| `excl_professional_no_overlap` | `appointments` | `professional_id` + `tstzrange(start, end)` | CANCELLED, COMPLETED, NO_SHOW |
| `excl_resource_no_overlap` | `appointments` | `resource_id` + `tstzrange(start, end)` | CANCELLED, COMPLETED, NO_SHOW |
| `excl_client_no_overlap` | `appointments` | `client_id` + `tstzrange(start, end)` | CANCELLED, COMPLETED, NO_SHOW |

Requerem a extensão `btree_gist`, criada pela própria migration.

---

## 7. Triggers Criados

### Função: `set_updated_at()` — aplicada a 9 tabelas

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_users_updated_at` | `users` | BEFORE UPDATE |
| `trg_clients_updated_at` | `clients` | BEFORE UPDATE |
| `trg_professionals_updated_at` | `professionals` | BEFORE UPDATE |
| `trg_addresses_updated_at` | `addresses` | BEFORE UPDATE |
| `trg_services_updated_at` | `services` | BEFORE UPDATE |
| `trg_availability_updated_at` | `availability` | BEFORE UPDATE |
| `trg_blocked_periods_updated_at` | `blocked_periods` | BEFORE UPDATE |
| `trg_resources_updated_at` | `resources` | BEFORE UPDATE |
| `trg_appointments_updated_at` | `appointments` | BEFORE UPDATE |

### Função: `prevent_modification()` — append-only

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_appt_history_no_update` | `appointment_status_history` | BEFORE UPDATE |
| `trg_appt_history_no_delete` | `appointment_status_history` | BEFORE DELETE |
| `trg_audit_logs_no_update` | `audit_logs` | BEFORE UPDATE |
| `trg_audit_logs_no_delete` | `audit_logs` | BEFORE DELETE |

### Função: `prevent_price_at_booking_change()` — imutabilidade de preço

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_appt_price_immutable` | `appointments` | BEFORE UPDATE |

**Total: 14 triggers, 3 funções trigger**

---

## 8. Seed Executado

| Entidade | Registros inseridos |
|---|---|
| `roles` | 3 (ADMIN, PROFESSIONAL, CLIENT) |
| `resources` | 5 (Maca 01–05, MASSAGE_TABLE, ACTIVE) |

Seed idempotente via `ON CONFLICT DO NOTHING`. Nenhum usuário, cliente ou profissional fictício criado.

---

## 9. Testes de Validação — 21/21 ✓

Todos os testes obrigatórios passaram:

| # | Teste | Resultado |
|---|---|---|
| 01 | 14 tabelas existem | ✓ |
| 02 | 3 roles existem (ADMIN, PROFESSIONAL, CLIENT) | ✓ |
| 03 | Exatamente 5 macas existem (ACTIVE) | ✓ |
| 04 | Email duplicado com case diferente é rejeitado | ✓ |
| 05 | Cliente não pode ter dois endereços (UNIQUE client_id) | ✓ |
| 06 | Dois agendamentos do mesmo profissional no mesmo intervalo são rejeitados | ✓ |
| 07 | Dois agendamentos do mesmo cliente no mesmo intervalo são rejeitados | ✓ |
| 08 | Duas reservas da mesma maca no mesmo intervalo são rejeitadas | ✓ |
| 09 | HOME_CARE com maca é rejeitado | ✓ |
| 10 | HOME_CARE sem endereço é rejeitado | ✓ |
| 11 | IN_PERSON sem maca é rejeitado | ✓ |
| 12 | IN_PERSON com endereço é rejeitado | ✓ |
| 13 | CANCELLED não bloqueia novo horário | ✓ |
| 14 | COMPLETED não bloqueia novo horário | ✓ |
| 15 | NO_SHOW não bloqueia novo horário | ✓ |
| 16 | price_at_booking preserva preço histórico após mudança no serviço | ✓ |
| 17 | price_at_booking imutável — trigger bloqueia alteração direta | ✓ |
| 18 | FK ON DELETE RESTRICT — role referenciada não pode ser deletada | ✓ |
| 19 | FK ON DELETE RESTRICT — user referenciado não pode ser deletado | ✓ |
| 20 | appointment_status_history append-only — UPDATE rejeitado | ✓ |
| 21 | appointment_status_history append-only — DELETE rejeitado | ✓ |

---

## 10. Comandos

```bash
# Aplicar migrations pendentes (idempotente)
pnpm --filter @workspace/db run migrate

# Aplicar seed (idempotente)
pnpm --filter @workspace/db run seed

# Rodar 21 testes de validação
pnpm --filter @workspace/db run test:migration
```

---

## 11. Decisões Confirmadas Nesta Fase

| Decisão | Status |
|---|---|
| Status inicial CONFIRMED (sem PENDING) | Confirmado |
| Autenticação própria (bcrypt/argon2) | Confirmado — implementação futura |
| Timezone America/Sao_Paulo | Confirmado — `time` sem tz em `availability` |
| Cinco macas em `resources` | Confirmado e seedado |
| HOME_CARE sem maca; IN_PERSON com maca | Confirmado — CHECK de modalidade ativo |
| Um endereço por cliente no MVP | Confirmado — UNIQUE(client_id) no banco |
| Preço congelado em `price_at_booking` | Confirmado — trigger de imutabilidade ativo |
| Remarcação via UPDATE (mesmo UUID) | Confirmado — campos de rastreamento na history |
| Email de usuário INACTIVE continua reservado | Confirmado — sem fluxo de liberação no MVP |

---

## 12. Decisões Pendentes para Fases Futuras

| Item | Observação |
|---|---|
| Reutilização de email de usuários inativos | Definir se o email pode ser liberado para novo cadastro em fases futuras |
| CRUD de entidades (users, clients, professionals, services, appointments) | Não implementado — aguarda autorização |
| Autenticação (login, sessão, JWT/cookie) | Não implementado — aguarda autorização |
| Lógica de disponibilidade (cálculo de slots) | Não implementado — aguarda autorização |
| Fluxo de agendamento e transação completa | Não implementado — aguarda autorização |
| Notificações funcionais (envio in-app) | Não implementado — aguarda autorização |
| Auditoria automática (interceptor de admin) | Não implementado — aguarda autorização |
| Múltiplos endereços por cliente (Fase N) | Remover UNIQUE(client_id) em `addresses` quando autorizado |
| Fluxo HOME_CARE completo | Validação de endereço pertencente ao cliente — camada de serviço futura |

---

## 13. Notas de Segurança

- `password_hash` nunca deve ser exposto em DTOs da API — excluir nos response schemas (implementação futura)
- `audit_logs.old_data` / `new_data` nunca devem conter `password_hash` ou tokens — responsabilidade da camada de serviço
- A autorização é sempre verificada no backend — ocultar menus no frontend é apenas UX

---

*Este documento é a especificação oficial aprovada do banco de dados do Projeto Fluir da Vida — Fase 2.*
