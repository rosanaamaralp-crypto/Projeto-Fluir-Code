# Projeto Fluir

Fundação técnica do sistema de gestão de atendimentos do Fluir da Vida.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm run lint` — check formatting across project source files
- `pnpm run test` — run foundation tests

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `docs/` — documentação oficial e decisões da fundação
- `artifacts/fluir-da-vida/` — frontend React/Vite
- `artifacts/api-server/` — API Express
- `lib/api-spec/` — contrato OpenAPI
- `lib/db/` — camada Drizzle/PostgreSQL, sem schema definitivo na Fase 1
- `shared/` — espaço reservado para tipos compartilhados
- `tests/` — testes automatizados da fundação

## Architecture decisions

- A Fase 1 mantém somente o health check técnico; módulos de negócio aguardam aprovação da próxima fase.
- O acesso ao banco é criado sob demanda para que a API possa iniciar sem schema definitivo.
- O contrato OpenAPI é a fonte de verdade para a API e seus clientes gerados.
- O lint inicial usa Prettier, já disponível no workspace; regras de ESLint ficam para quando houver código de produto.

## Product

O produto será uma plataforma para clientes, profissionais e administradores gerenciarem atendimentos presenciais e Home Care. Esses módulos ainda não foram implementados.

## User preferences

- Implementar por fases e aguardar aprovação entre checkpoints.
- Não inventar regras de negócio nem avançar para módulos não autorizados.

## Gotchas

- Após alterar `lib/api-spec/openapi.yaml`, executar o codegen antes de usar os tipos gerados.
- Não criar schema ou migrations definitivas antes da aprovação da Fase 2.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
