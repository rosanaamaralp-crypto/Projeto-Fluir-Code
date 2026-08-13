---
name: Fase 15 — Módulo Cliente
description: Decisões, gaps resolvidos e quirks encontrados na implementação do módulo cliente (F15).
---

# Fase 15 — Módulo Cliente

## Status
CONCLUÍDA. 503/503 testes passando (inclui 3 testes D5: edição name/phone/birthDate, proteção de campos, IDOR no PATCH clients). TypeScript 0 erros.

## Decisões formalizadas (AuthDoc F15)

- **D1**: Endereço único por cliente no MVP. `useUpsertClientAddress` (POST/PUT). Sem migration, sem multiple addresses.
- **D2**: CLIENT pode cancelar e remarcar (nova data/horário). Profissional/serviço/modalidade imutáveis via reschedule. `AppointmentsService.reschedule` já restringe corretamente.
- **D3**: Dashboard usa `GET /api/dashboard/client` + segunda consulta `GET /api/appointments?status=COMPLETED` para histórico resumido.
- **D4**: Wizard single-route `/client/book`, 7 etapas, estado local.
- **D5**: `UpdateClientSchemaSelf` expandido com `name` e `phone`. Controller atualiza `users` + `clients` na mesma transação.

## Backend alterado (D5)
- `artifacts/api-server/src/validators/clients.validator.ts` — adicionados `name` e `phone` ao `UpdateClientSchemaSelf`
- `artifacts/api-server/src/controllers/clients.controller.ts` — método `update` agora atualiza `users.name`/`users.phone` via `UsersRepository.update` na mesma transação
- `lib/api-spec/openapi.yaml` — `UpdateClientRequest` expandido com `name` e `phone`
- Codegen executado com sucesso

## Quirks identificados

- `AppointmentStatusHistoryRow` usa `changedAt` (não `createdAt`) para timestamp.
- `oldStatus` em `AppointmentStatusHistoryRow` é `string | null | undefined` — não pode ser usado como index sem null-coalesce.
- Padrão obrigatório para hooks com `enabled`: `{ query: { enabled: !!id } } as any` (mesmo comportamento de F14).
- `useListSlots` precisa de `as any` no segundo argumento quando passando apenas `{ query: { enabled } }`.

## Rotas registradas

```
/client/book                  → ClientBook (lazy)
/client/appointments/:id      → ClientAppointmentDetail (lazy)
/client/appointments          → ClientAppointments (lazy)
/client/addresses             → ClientAddresses (lazy)
/client/profile               → ClientProfile (lazy)
/client/notifications         → ClientNotifications (lazy)
/client                       → ClientDashboard (síncrono)
```

## Menu CLIENT_NAV

- Início → `/client`
- Novo Agendamento → `/client/book`
- Meus Agendamentos → `/client/appointments`
- Histórico → `/client/appointments` (mesma rota, página com dois grupos)
- Meus Endereços → `/client/addresses`
- Meu Perfil → `/client/profile`
- Notificações → `/client/notifications`
