---
name: F11 — Frontend Marco Visual
description: Decisões e quirks do marco visual F11 (login + auth + dashboards)
---

## Problema: orval v8.23 gera Zod v4 para openapi.yaml com format/type especiais

`format: email`, `format: uuid`, `type: integer` no spec fazem o orval v8.23 gerar
`zod.email()`, `zod.uuid()`, `zod.int()` — métodos que só existem no Zod v4.
O projeto usa Zod v3. Solução: remover esses formats do openapi.yaml (usar `type: string` e
`type: number`). O api-client-react (React Query) não é afetado pelos formats — só o zod output.

## Problema: orval schemas option causa duplicate named export no api-zod

O orval config tinha `schemas: { path: "generated/types", type: "typescript" }`.
Isso gerava uma pasta `types/` com interfaces TypeScript E o `api.ts` com Zod schemas —
ambos exportando `LoginResponse`, `SessionUser`, etc. Causa TS2308.

**Fix permanente:** remover `schemas` do output `zod` no `lib/api-spec/orval.config.ts`.
Consumers do api-zod usam `z.infer<typeof Schema>` para obter os tipos TypeScript.

## Problema: orval appenda ao index.ts existente

O orval NÃO substitui `lib/api-zod/src/index.ts` — ele apenas appenda suas re-exports.
Se o arquivo já tiver conteúdo estale, o conteúdo antigo + o novo criam conflito.
Após cada codegen, o `lib/api-zod/src/index.ts` deve ter APENAS:
```ts
export * from "./generated/api";
```

## AuthContext — shape de usuário é diferente entre login e /me

- `POST /api/auth/login` → `{ user: { id, roleId, name, email, ... } }` (usa `id`)
- `GET /api/auth/me` → `{ user: { userId, roleId, name, email } }` (usa `userId`)

O AuthContext normaliza para `{ userId, roleId, name, email }` em ambos os casos,
convertendo `id` → `userId` após o login.

**Why:** O backend usa shape de sessão distinto do user object do banco.

## Estrutura criada em F11

```
artifacts/fluir-da-vida/src/
  contexts/auth-context.tsx       AuthProvider + useAuth
  components/private-route.tsx    Proteção por role
  lib/roles.ts                    ROLES const + getDashboardPath
  pages/login.tsx                 Formulário login
  layouts/app-layout.tsx          Sidebar + header por role
  pages/admin/dashboard.tsx       GET /api/dashboard/admin
  pages/professional/dashboard.tsx GET /api/dashboard/professional
  pages/client/dashboard.tsx      GET /api/dashboard/client
  App.tsx                         Roteamento completo
```
