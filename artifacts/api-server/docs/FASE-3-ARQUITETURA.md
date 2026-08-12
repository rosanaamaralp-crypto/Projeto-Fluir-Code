# Fase 3 — Arquitetura da API REST

## Visão Geral

API REST completa para o sistema de agendamentos "Fluir da Vida", construída em Node.js + TypeScript + Express 5.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 (router@2.x) |
| ORM | Drizzle ORM (apenas queries, sem migrations) |
| DB | PostgreSQL 16 (schema gerenciado pela Fase 2) |
| Sessões | express-session + connect-pg-simple |
| Validação | Zod |
| Logging | Pino + pino-http |
| Testes | Vitest + Supertest |

## Estrutura de Diretórios

```
src/
├── app.ts                     # Express app (middlewares, error handler)
├── index.ts                   # Entry point (servidor HTTP)
├── controllers/               # Lógica de negócio HTTP
├── repositories/              # Acesso ao banco via Drizzle
├── routes/                    # Definição de rotas + middlewares
├── middlewares/               # requireAuth, requireRole, validate
├── validators/                # Schemas Zod
├── services/                  # SlotsService, AuthService
└── lib/
    ├── db.ts                  # Singleton getDatabaseClient()
    ├── db-types.ts            # DrizzleDB (union type — P5)
    ├── errors.ts              # AppError, mapDbError
    ├── logger.ts              # Pino logger
    └── session.ts             # express-session config

scripts/
└── bootstrap-admin.ts         # CLI para criar primeiro ADMIN (P1)

tests/
├── helpers/
│   ├── app.ts                 # Supertest instance
│   ├── db.ts                  # DB helper para testes
│   └── seed.ts                # seedTestData / cleanTestData
└── integration/               # Testes e2e por feature
└── unit/                      # Testes unitários de services/lib
```

## Autenticação e Sessões

- `express-session` com `connect-pg-simple` (tabela `sessions`)
- Cookie HTTP-only, `sameSite: strict`, `secure` em produção
- `SESSION_SECRET` obrigatório via variável de ambiente
- Sessão armazena `{ userId, roleId, email }`

## Roles e RBAC

| Role | ID | Acesso |
|------|-----|--------|
| ADMIN | 1 | Tudo |
| PROFESSIONAL | 2 | Próprios dados + listagem |
| CLIENT | 3 | Próprios dados |

Middlewares:
- `requireAuth` — verifica sessão ativa
- `requireAdmin` — exige roleId = 1
- `requireProfessional` — exige roleId ∈ {1, 2}
- `requireClient` — exige roleId ∈ {1, 3}

## Algoritmo de Slots (SlotsService)

Parâmetros de entrada: `professionalId`, `serviceId`, `date` (YYYY-MM-DD UTC), `modality?`, `clientId?`

Regras aplicadas em ordem:
1. Service ACTIVE
2. Professional ACTIVE
3. Professional oferece o service (`professional_services.active = true`)
4. Disponibilidade ativa para o weekday (UTC)
5. Gera slots de `durationMinutes` dentro das janelas
6. Respeita `SLOT_MIN_NOTICE_HOURS` (boundary **ESTRITO** — ver P7)
7. Respeita `SLOT_MAX_ADVANCE_DAYS`
8. Exclui conflitos com appointments ativos do profissional
9. Exclui conflitos com blocked_periods ativos
10. Se modality=`IN_PERSON`: exige ≥1 resource ACTIVE disponível (P4)
11. Exclui conflitos com appointments do cliente (se clientId fornecido)

### P7 — Boundary de SLOT_MIN_NOTICE_HOURS (ESTRITO)

```
slot.start <= minStart → REJEITADO
slot.start >  minStart → ACEITO
```

Com `SLOT_MIN_NOTICE_HOURS=2`:
- `now + 2h00m00s000ms` → **REJEITADO** (`<=`)
- `now + 2h00m00s001ms` → **ACEITO** (`>`)

Configurável via variável de ambiente `SLOT_MIN_NOTICE_HOURS` (padrão: 2).

## Bootstrap do Primeiro ADMIN (P1)

O sistema não expõe endpoint público para criar ADMIN.
O primeiro ADMIN é criado via script CLI:

```bash
BOOTSTRAP_ADMIN_NAME="Nome Completo" \
BOOTSTRAP_ADMIN_EMAIL="email@dominio.com" \
BOOTSTRAP_ADMIN_PASSWORD="SenhaMuitoForte123!" \
pnpm --filter @workspace/api-server run bootstrap:admin
```

Comportamento:
- Verifica existência de ADMIN antes de criar (idempotente)
- Recusa criar segundo ADMIN (proteção de segurança)
- Executa criação em transação atômica
- Nunca loga senha ou password_hash
- Fecha o pool após execução

## Correções da Fase 3.1

### P1 (HIGH) — Bootstrap admin faltando
**Problema:** Não havia mecanismo para criar o primeiro ADMIN.  
**Correção:** `scripts/bootstrap-admin.ts` + `pnpm run bootstrap:admin`.

### P2 (MEDIUM) — UsersRepository.update fora da transação
**Problema:** Em `professionals.controller.ts`, `UsersRepository.update` (name/phone) era chamado fora da transação que atualizava `professionals` + criava o audit_log. Falha parcial deixava dados inconsistentes.  
**Correção:** `UsersRepository.update` movido para dentro de `db.transaction()`. Users + professionals + audit_logs executados atomicamente.

### P3 (MEDIUM) — Double cast de req.body em professionals
**Problema:** O controller usava `req.body` duas vezes: uma para `name`/`phone` e outra para `specialty`/`bio`. O schema `UpdateProfessionalSchema` já contém `name` e `phone` — o segundo cast era desnecessário e bypass a validação.  
**Correção:** Único destructuring da variável validada (`UpdateProfessionalInput`) que já inclui todos os campos.

### P4 (MEDIUM) — IN_PERSON sem resources retorna slots livremente
**Problema:** `if (modality === "IN_PERSON" && allResources.length > 0)` — se não existir nenhum resource ativo, o bloco de verificação era pulado e slots IN_PERSON eram retornados sem restrição.  
**Correção:** `if (modality === "IN_PERSON") { if (allResources.length === 0) continue; ... }`. Se não há resource ACTIVE, nenhum slot IN_PERSON é gerado.

### P5 (MEDIUM) — 76 erros de TypeScript (PgTransaction ≠ NodePgDatabase)
**Problema:** Repositories usavam `type DB = NodePgDatabase<typeof schema>`. A tipagem não aceitava `PgTransaction` (resultado de `db.transaction(tx => ...)`), gerando 76 erros de typecheck.  
**Correção:** `src/lib/db-types.ts` — `DrizzleDB` é um union type `NodePgDatabase | PgTransaction`. Todos os repositories usam `DrizzleDB`. Nenhum cast `tx as typeof db` necessário.

### P6 (LOW) — UUIDs inválidos retornavam 500 em vez de 400
**Problema:** UUIDs malformados em path params chegavam ao banco e causavam erro `22P02` — convertido para 500 pelo handler genérico.  
**Correção:** `src/validators/params.validator.ts` + `validateParams()` nas rotas (antes de chegar ao controller). UUID inválido retorna 400 antes de tocar o banco. `errors.ts` também mapeia `22P02` → 400 como defesa adicional.

### P7 (LOW) — Boundary de SLOT_MIN_NOTICE_HOURS não documentado/testado
**Problema:** O comportamento `slot.start <= minStart → REJEITADO` não estava documentado nem testado.  
**Correção:** Comentário detalhado em `slots.service.ts` + testes unitários em `tests/unit/services/slots-boundary.test.ts`.

### P8 (LOW) — UpdateClientSchema aceita status independente de role
**Problema:** Um único schema `UpdateClientSchema` era usado na rota PATCH `/clients/:id`. Qualquer role podia tentar enviar `status`, e só o controller fazia a verificação. Schema e rota estavam desacoplados da restrição de role.  
**Correção:** Dois schemas:
- `UpdateClientSchemaSelf` — sem campo `status` (CLIENT)
- `UpdateClientSchemaAdmin` — com campo `status` (ADMIN)
O controller seleciona o schema correto antes de validar, usando `formatZodError` exportado de `validate.ts`. O `validateBody` foi removido da rota PATCH de clients.

### P9 (LOW) — PATCH blocked_periods: verificação de role no controller em vez da rota
**Problema:** A rota PATCH de `blocked_periods` só tinha `requireAuth`. A verificação `session.roleId !== ROLES.ADMIN` estava enterrada no controller — inconsistente com o padrão do restante (services, resources).  
**Correção:** Rota PATCH alterada para `requireAuth, requireAdmin`. Verificação redundante removida do controller.

## Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `DATABASE_URL` | ✅ | — | URL de conexão PostgreSQL |
| `SESSION_SECRET` | ✅ | — | Segredo para assinatura de cookies |
| `SLOT_MIN_NOTICE_HOURS` | ❌ | `2` | Antecedência mínima ESTRITA para slots |
| `SLOT_MAX_ADVANCE_DAYS` | ❌ | `60` | Antecedência máxima para slots |
| `NODE_ENV` | ❌ | `development` | `production` ativa cookie secure |

## Decisões de Design

- **UTC puro**: todos os datetimes armazenados e comparados em UTC
- **Singleton DB**: `getDatabaseClient()` chamado uma vez em `lib/db.ts` — sem new Pool em código de aplicação
- **Drizzle sem migrations**: schema gerenciado pela Fase 2 (custom migration runner)
- **Senha nunca retorna**: `passwordHash` excluído de todos os SELECTs de usuário (safeColumns)
- **Audit logs append-only**: trigger no banco proíbe UPDATE/DELETE — cleanup de testes usa `DISABLE/ENABLE TRIGGER` exclusivamente no script de seed
- **Bootstrap CLI-only**: sem endpoint público para criar ADMIN

## Testes

- **Vitest** com `fileParallelism: false` (evita race conditions no banco compartilhado)
- **Supertest** para testes de integração HTTP
- Seed/cleanup por arquivo de teste (beforeAll/afterAll)
- bcrypt salt rounds = 10 em testes (velocidade), 12 em produção
