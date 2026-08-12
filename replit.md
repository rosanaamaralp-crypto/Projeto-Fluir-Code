# Projeto Fluir

Fundação técnica do sistema de gestão de atendimentos do Fluir da Vida.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run migrate` — apply pending SQL migrations (safe to re-run; idempotente)
- `pnpm --filter @workspace/db run seed` — seed roles + 5 macas (idempotente; ON CONFLICT DO NOTHING)
- `pnpm --filter @workspace/db run test:migration` — 21 testes de validação do schema da Fase 2
- `pnpm --filter @workspace/db run push` — push DB schema via Drizzle Kit (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm run lint` — check formatting across project source files
- `pnpm run test` — run foundation tests (lib/db)
- `pnpm --filter @workspace/api-server run test` — run API integration tests (98 testes)
- `pnpm --filter @workspace/api-server run test:watch` — modo watch
- `npx tsx scripts/bootstrap-admin.ts` — criar primeiro ADMIN (recusa se já existir um)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `docs/` — documentação oficial e decisões de cada fase
- `artifacts/fluir-da-vida/` — frontend React/Vite
- `artifacts/api-server/` — API Express
- `lib/api-spec/` — contrato OpenAPI
- `lib/db/` — camada Drizzle/PostgreSQL
  - `src/schema/` — definições Drizzle (14 tabelas)
  - `migrations/` — SQL migrations versionadas
  - `src/migrate.ts` — runner de migration com rastreamento
  - `src/seed.ts` — seed idempotente (roles + macas)
  - `src/test-migration.ts` — 21 testes de validação do schema
- `shared/` — espaço reservado para tipos compartilhados
- `tests/` — testes automatizados da fundação

## Architecture decisions

- A Fase 1 manteve somente o health check técnico; módulos de negócio aguardam aprovação por fase.
- **Fase 2 (concluída):** 14 tabelas criadas, seed aplicado, 21 testes de validação passando.
- **Fase 3 (concluída):** API REST completa — autenticação, RBAC, 11 routers, slots, auditoria, 98 testes passando.
- O acesso ao banco é criado sob demanda (`getDatabaseClient()`).
- O contrato OpenAPI é a fonte de verdade para a API e seus clientes gerados.
- O lint inicial usa Prettier; regras de ESLint ficam para quando houver código de produto.
- Migrations rastreadas em `schema_migrations` (custom runner); idempotentes e transacionais.
- Enums implementados como `varchar` + `CHECK` constraint (fácil extensão sem recrear tipos PG nativos).
- EXCLUDE constraints com `btree_gist` protegem conflitos de agendamento em 3 camadas (profissional, cliente, maca).
- `appointment_status_history` e `audit_logs` são append-only garantidos por trigger no banco.
- `price_at_booking` é imutável após criação, garantido por trigger no banco.
- `updated_at` é atualizado automaticamente por trigger em todas as 9 tabelas relevantes.
- Sessões: `express-session` + `connect-pg-simple` (tabela `sessions` auto-criada no primeiro start).
- bcrypt salt rounds = 12 (produção); 10 nos testes para velocidade.
- Rate limit: 10 tentativas de login / 15 minutos por IP.
- Slots em UTC puro: `availability.weekday` e horários interpretados em UTC; `date` recebido como YYYY-MM-DD UTC.
- Primeiro ADMIN via CLI (`scripts/bootstrap-admin.ts`) — sem endpoint público.
- `mapDbError()` extrai erros pg de `DrizzleQueryError` via `.cause` para mapear 23505/23P01/etc. corretamente.
- `validateQuery` usa `Object.defineProperty` pois `req.query` é getter readonly no `router@2.x` (Express 5).

## Product

O produto será uma plataforma para clientes, profissionais e administradores gerenciarem atendimentos presenciais e Home Care. Esses módulos ainda não foram implementados.

## User preferences

- Implementar por fases e aguardar aprovação entre checkpoints.
- Não inventar regras de negócio nem avançar para módulos não autorizados.

## Gotchas

- Após alterar `lib/api-spec/openapi.yaml`, executar o codegen antes de usar os tipos gerados.
- `appointment_status_history` e `audit_logs` são append-only no nível do banco — triggers bloqueiam UPDATE/DELETE.
- Durante cleanup de testes, desabilitar temporariamente `trg_appt_history_no_delete` e `trg_audit_logs_no_delete`.
- Email é case-insensitive: normalizar para lowercase na aplicação antes de qualquer INSERT/UPDATE em `users`.
- `price_at_booking` nunca pode ser alterado após criação — trigger `trg_appt_price_immutable` rejeita UPDATE.
- `btree_gist` extension é requerida pelas EXCLUDE constraints — já criada pela migration 0001.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
