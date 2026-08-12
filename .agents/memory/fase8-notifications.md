---
name: Fase 8 — Notificações
description: Quirks e decisões da implementação do módulo de notificações internas (F8).
---

## Regra: session.userId, não session.user.id

O objeto de sessão tem `userId` (não `id`). O campo correto é `req.session.user.userId`.

**Why:** O tipo de sessão é `{ userId, roleId, name, email }` — não tem campo `id`.
**How to apply:** Em qualquer controller novo que precise do userId autenticado, usar `req.session!.user!.userId`.

## Regra: seed FK order — notifications antes de appointments e users

O `cleanTestData()` em `tests/helpers/seed.ts` precisou ser atualizado para deletar `notifications` antes de `appointments` (FK `notifications.appointment_id`) e antes de `users` (FK `notifications.user_id`).

**Why:** A tabela `notifications` tem duas FKs: `user_id → users` e `appointment_id → appointments`. A ordem original de cleanup violava ambas.
**How to apply:** Qualquer nova tabela com FK para `appointments` ou `users` precisa ser limpa antes delas no `cleanTestData`.

## Regra: teste de concorrência é flaky pré-existente

O teste "Caso A — mesmo client, profissionais diferentes, mesmo horário → excl_client_no_overlap" em `concurrency/appointments.concurrent.test.ts` falha ocasionalmente com 500 em vez de 409. Isso é pré-existente (race condition no ambiente de testes), não relacionado a F8.

**Why:** Dois INSERTs concorrentes podem gerar 23P01, mas em ambiente de testes sob carga a propagação do erro pode ser 500. Já ocorria antes de F8.
**How to apply:** Se 1 test de concorrência falha isoladamente mas passa na segunda execução, é o flaky conhecida — não é regressão.

## Best-effort pattern para side-effects em services

Notificações geradas em `appointments.service.ts` usam o padrão:
```typescript
const result = await db.transaction(async (tx) => { ... });
try {
  // side-effect best-effort
  await NotificationService.notifyX(db, { ... });
} catch { /* ignora */ }
return result;
```

**Why:** Falha na notificação não deve reverter operação principal (D5 aprovado).
**How to apply:** Qualquer side-effect post-transaction deve seguir este padrão.
