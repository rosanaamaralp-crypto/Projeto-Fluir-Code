---
name: Fase 3.1 corrections
description: Durable lessons from the 9 post-audit fixes — patterns to keep consistent
---

## Error response format
The API error handler wraps ALL errors as `{ error: { code, message } }`.
Tests must check `res.body.error.code`, NOT `res.body.code`.
**Why:** app.ts error handler always nests under `error` key — consistent across AppError, mapDbError, and 404.

## seed.ts cleanup FK order (professionals)
When deleting a professional user in cleanTestData(), must delete in this order:
1. `blocked_periods WHERE professional_id = prof.id`
2. `professional_services WHERE professional_id = prof.id`
3. `availability WHERE professional_id = prof.id`
4. `professionals WHERE user_id = u.id`
**Why:** FK constraint `blocked_periods_professional_id_fkey` prevents deleting professionals before their blocked_periods.

## DrizzleDB union type (P5)
All repositories use `import type { DrizzleDB as DB } from "../lib/db-types.js"`.
DrizzleDB = `NodePgDatabase<typeof schema> | PgTransaction<...>`.
No `tx as typeof db` casts needed.
Rebuild `lib/db` with `tsc -p tsconfig.json` when schema changes (dist/schema/index.d.ts is generated).
**Why:** PgTransaction lacks `$client: Pool` so `NodePgDatabase` cast fails typecheck.

## @workspace/db rebuild required after schema changes
`lib/db/tsconfig.json` uses `composite: true` with `emitDeclarationOnly`.
If `dist/schema/index.d.ts` is empty (`export {}`), run `cd lib/db && pnpm exec tsc -p tsconfig.json`.
`test-migration.ts` and `seed.ts` are excluded from the tsconfig to avoid a `Client` type error.
**Why:** TypeScript project references require the referenced project's dist to be up to date.

## validateParams + P6
All routes with UUID path params have `validateParams(ParamsXxxSchema)` BEFORE the controller.
Route-level validation returns 400 before touching the bank.
`errors.ts` also maps pg `22P02` → ValidationError as defense-in-depth.

## P9: blocked_periods PATCH authorization pattern
All "admin-only mutation" routes use `requireAuth, requireAdmin` at route level.
No role checks in controller body (redundant and inconsistent with the rest).

## P8: role-specific schemas
When schema selection depends on role:
1. Remove `validateBody` from the route
2. Controller selects schema based on `session.roleId`
3. Uses `formatZodError` exported from `validate.ts` for consistent error formatting

## UpdateBlockedPeriodSchema
Only allows `status: "ACTIVE" | "CANCELLED"` — NOT "INACTIVE".
Tests that test admin PATCH must use `"CANCELLED"` as the valid status.
