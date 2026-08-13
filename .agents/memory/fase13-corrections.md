---
name: Fase 13 — Bloqueadores de Conformidade
description: Correções pós-auditoria: filtros de reports, enriquecimento clients/professionals, endpoint blocked-periods.
---

# Fase 13 — Resolução de Bloqueadores de Conformidade

## Filtros server-side em GET /reports/appointments (T-005)
Adicionados `clientId` e `resourceId` ao `ReportAppointmentsQuerySchema` e à interface `AppointmentReportFilters`. Colunas já existiam em `appointments`; nenhuma migração necessária.

## Enriquecimento clients/professionals com JOIN users
- Adicionados métodos `findAllWithUser`, `findByIdWithUser`, `findByUserIdWithUser` nos repositórios.
- Drizzle tipa colunas de LEFT JOIN como `string | null` mesmo quando a FK garante não-nulidade. Interfaces `ClientWithUser` e `ProfessionalWithUser` declaram `name: string | null` e `email: string | null`.
**Why:** Tentativa de declarar como `string` causa TS2322 — o return type inferido do Drizzle é `string | null` para colunas da tabela juntada via leftJoin.

## Endpoint blocked-periods (T-012)
`GET /api/professionals/:profId/blocked-periods` existia no backend mas não estava no OpenAPI → sem hook gerado. Adicionado ao openapi.yaml com schemas `BlockedPeriodRow` e `BlockedPeriodsListResponse` e operationId `listProfessionalBlockedPeriods`. Após codegen, hook `useListProfessionalBlockedPeriods` ficou disponível.

## Frontend — telas impactadas
- `schedule.tsx` — filtros clientId + resourceId com selects reais
- `clients/index.tsx` — colunas Nome/E-mail/Telefone
- `clients/detail.tsx` — info tab com nome/email/phone
- `professionals/index.tsx` — coluna Nome/E-mail
- `professionals/detail.tsx` — info enriquecida + aba "Períodos Bloqueados"
- `appointments/new.tsx` — selector de cliente com nome real (não UUID)
