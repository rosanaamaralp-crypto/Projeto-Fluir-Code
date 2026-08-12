---
name: Fase 5.6 — ALTER in-place
description: Decisões técnicas da operação alter de appointments (RN-055/RN-056)
---

## Regras fundamentais
- **RBAC W1:** ALTER restrito a ADMIN (CLIENT/PROFESSIONAL → 403 sempre).
- **Status W2:** Somente CONFIRMED pode ser alterado (qualquer outro status → 400).
- **serviceId e clientId são imutáveis** — não fazem parte do AlterAppointmentInput.
- **endDatetime** é recalculado pelo service via `durationMinutes`; nunca vem do input.
- **Audit action:** `"APPOINTMENT_ALTERED"` (string literal, não enum).
- **Idempotência:** se setValues ficou vazio após merge → retorna appointment sem audit/histórico.

## Arquivos modificados
1. `appointments.validator.ts` — AlterAppointmentSchema adicionado ao final do union em F5.6.
2. `appointments.repository.ts` — `resourceId?: string | null` adicionado a `UpdateAppointmentFieldsData` e a `updateFields()`.
3. `appointments.service.ts` — `resolveResource()` ganhou `excludeAppointmentId?` (evita self-conflict em IN_PERSON alter); método `update()` adicionado ao `AppointmentsService`.
4. `appointments.controller.ts` — branch `if ("status" in body)` + `else` (alter) substituem o antigo `else` único.

## Discriminação no union PatchAppointmentSchema
- `"reschedule" in body` → Reschedule
- `"status" in body` → Cancel | UpdateStatus
- `else` → AlterAppointmentInput (cast necessário no controller: `body as AlterAppointmentInput`)

## resolveResource — lógica de exclusão de self-conflict
Quando modality ou startDatetime muda em um appointment IN_PERSON:
- `resolveResource(tx, undefined, effectiveStart, effectiveEnd, appointmentId)` → o appointment sendo alterado é excluído da checagem via `a.id !== excludeAppointmentId`.
- Quando nenhum desses campos muda (só professionalId muda): resource atual é mantido sem re-seleção.

## Validação de endereço HOME_CARE
- Revalidação ocorre somente se `modalityChanged || input.addressId !== undefined`.
- Se appointment já era HOME_CARE e addressId não muda, endereço existente é aceito sem re-validação.

## Testes unitários atualizados
- `appointments.validator.test.ts` tests 10a/10b: mudados de `expect(false)` para `expect(true)` após integração do AlterAppointmentSchema ao union.

**Why:** F5.4 deliberadamente NÃO integrava o schema ao union para evitar quebrar o typecheck do controller. F5.6 completou a integração e atualizou os testes de regressão.

## Baseline pós-F5.6
296/296 testes · typecheck 0 erros · build OK · 16 tabelas · 14 triggers · 3 EXCLUDE constraints (pg_constraint) · 1 migration
