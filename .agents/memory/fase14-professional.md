---
name: Fase 14 — Módulo Profissional
description: Learnings e decisões da implementação do módulo do profissional (F14).
---

# Fase 14 — Módulo Profissional

## Regra: profId a partir da sessão
`AuthContext` só tem `userId`. Para obter o `profId` (PK da tabela professionals) em rotas
como `/professionals/:profId/availability`, use o hook `useProfessionalSelf()` que chama
`useListProfessionals()` e filtra por `prof.userId === user.userId`.
**Why:** sessão não expõe profId diretamente; GET /api/professionals é acessível a PROFESSIONAL
e retorna todos ativos (onlyActive = true para não-ADMIN).

## Regra: enabled condicional em hooks Orval
`useListProfessionalAvailability(id, { query: { enabled: !!id } })` falha em TypeScript
porque o tipo requer `queryKey`. Solução: `as any` no segundo argumento.
Este padrão já existia no Fase 13 (`useListSlots`).

## Restrição: T-023 (Meus Clientes) — gap no API
`GET /api/clients` para role PROFESSIONAL retorna apenas o próprio registro (findByUserIdWithUser),
não a lista de clientes atendidos. `AppointmentRow` tem `clientId` mas não `clientName`.
Workaround aprovado: mostrar clientes agrupados a partir de `GET /api/appointments`
(auto-escopado ao profissional), exibindo clientId truncado. Um endpoint enriquecido seria
necessário para uma experiência completa.
**How to apply:** ao implementar qualquer tela de clientes para PROFESSIONAL, confirmar
se um endpoint dedicado foi adicionado antes de usar workaround.

## Regra: DELETE /blocked-periods/:id — sem profId na URL
Diferente das rotas de availability (/:profId/availability/:id), o soft-delete de bloqueios
usa DELETE /blocked-periods/:id (sem profId). O controller busca o blocked period, valida
ownership (professional: prof.id === bp.professionalId via findByUserId), e chama
`BlockedPeriodsRepository.updateStatus(tx, id, "CANCELLED")`.

## Schemas adicionados ao OpenAPI em F14
- CreateBlockedPeriodRequest, BlockedPeriodItemResponse
- NotificationRow, NotificationsListResponse, NotificationReadResult, NotificationReadResponse
Paths novos: DELETE /professionals/{profId}/availability/{id},
POST /professionals/{profId}/blocked-periods, DELETE /blocked-periods/{id},
GET /notifications, POST /notifications/{id}/read.
