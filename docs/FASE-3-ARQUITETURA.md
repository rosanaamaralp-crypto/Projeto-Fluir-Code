# Fase 3 — Arquitetura da API REST

## Visão Geral

A Fase 3 implementa a API REST completa do sistema Fluir da Vida sobre a fundação de banco de dados da Fase 2. O servidor é um Express 5 em TypeScript com autenticação por sessão, RBAC por roles, e suíte completa de testes de integração.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Servidor HTTP | Express 5 (`router@2.x`) |
| ORM | Drizzle ORM (queries) |
| Banco | PostgreSQL (Fase 2) |
| Sessão | `express-session` + `connect-pg-simple` |
| Hash | bcrypt (salt rounds = 12) |
| Validação | Zod |
| Rate limit | `express-rate-limit` |
| Testes | Vitest + Supertest |

---

## Autenticação e Sessões

- **Mecanismo:** `express-session` com store PostgreSQL (`connect-pg-simple`)
- **Tabela:** `sessions` — criada automaticamente pelo `connect-pg-simple` na primeira inicialização do servidor
- **Secret:** variável de ambiente `SESSION_SECRET`
- **Regeneração de sessão:** após login bem-sucedido (`req.session.regenerate()`) para prevenir session fixation
- **Destruição:** `req.session.destroy()` no logout
- **Conteúdo da sessão:** `req.session.user = { userId, roleId }` — sem dados sensíveis

### Rate Limit

- Endpoint `/api/auth/login`: máximo 10 tentativas por 15 minutos por IP
- Resposta ao exceder: HTTP 429

---

## RBAC (Controle de Acesso por Roles)

Três roles definidos na tabela `roles` (Fase 2):

| roleId | Nome | Permissões principais |
|--------|------|-----------------------|
| 1 | ADMIN | Tudo: criar/inativar professionals e clients, alterar status, ver todos |
| 2 | PROFESSIONAL | Gerenciar própria disponibilidade, blocked_periods, professional_services |
| 3 | CLIENT | Ver próprio perfil, agendar, ver slots |

### Middlewares

```
requireAuth     → 401 se sem sessão
requireRole(r)  → 403 se role incorreta
requireAdmin    → atalho para requireRole(ADMIN)
requireProfessional → atalho
requireClient   → atalho
```

### Ownership

- **CLIENT** só pode ver/editar seus próprios dados (`client.userId === session.userId`)
- **PROFESSIONAL** só pode editar sua própria disponibilidade/serviços
- **ADMIN** tem acesso irrestrito
- Violação de ownership → HTTP 403

---

## Estrutura de Arquivos

```
artifacts/api-server/src/
├── app.ts                    # Express app: middlewares, routers, error handler
├── index.ts                  # Entry point (porta via env PORT)
├── lib/
│   ├── db.ts                 # Singleton getDatabaseClient() → { db, pool }
│   ├── errors.ts             # AppError e subclasses; mapDbError() para erros pg/Drizzle
│   ├── logger.ts             # pino logger
│   └── session.ts            # express-session + connect-pg-simple config
├── middlewares/
│   ├── require-auth.ts       # 401 se sem sessão
│   ├── require-role.ts       # ROLES constante + requireRole() factory
│   └── validate.ts           # validateBody/Query/Params — wrappers Zod
├── validators/               # Schemas Zod por entidade
│   ├── auth.validator.ts
│   ├── clients.validator.ts
│   ├── professionals.validator.ts
│   ├── services.validator.ts
│   ├── resources.validator.ts
│   ├── professional-services.validator.ts
│   ├── availability.validator.ts
│   ├── blocked-periods.validator.ts
│   ├── addresses.validator.ts
│   └── slots.validator.ts
├── repositories/             # Camada de acesso a dados (Drizzle)
│   ├── users.repository.ts
│   ├── clients.repository.ts
│   ├── professionals.repository.ts
│   ├── services.repository.ts
│   ├── resources.repository.ts
│   ├── professional-services.repository.ts
│   ├── availability.repository.ts
│   ├── blocked-periods.repository.ts
│   ├── addresses.repository.ts
│   ├── appointments.repository.ts   # read-only (para slots)
│   └── audit-logs.repository.ts     # sanitize() antes de gravar
├── services/
│   ├── auth.service.ts       # hashPassword, authenticate (timing-safe), recordLogin/Logout
│   └── slots.service.ts      # SlotsService.getAvailableSlots() — algoritmo completo
├── controllers/              # Request handlers Express
│   ├── auth.controller.ts
│   ├── clients.controller.ts
│   ├── professionals.controller.ts
│   ├── services.controller.ts
│   ├── resources.controller.ts
│   ├── professional-services.controller.ts
│   ├── availability.controller.ts
│   ├── blocked-periods.controller.ts
│   ├── addresses.controller.ts
│   └── slots.controller.ts
└── routes/
    ├── index.ts              # Registra todos os 11 routers em /api
    ├── auth.ts
    ├── clients.ts
    ├── professionals.ts
    ├── services.ts
    ├── resources.ts
    ├── professional-services.ts
    ├── availability.ts
    ├── blocked-periods.ts
    ├── addresses.ts
    └── slots.ts
scripts/
└── bootstrap-admin.ts        # CLI interativo para primeiro ADMIN
tests/
├── helpers/
│   ├── app.ts                # supertest wrapper + loginAs()
│   ├── db.ts                 # db + pool para testes
│   └── seed.ts               # seedTestData() / cleanTestData()
├── unit/
│   ├── lib/errors.test.ts
│   └── services/
│       ├── auth.service.test.ts
│       └── slots.service.test.ts
└── integration/
    ├── auth.test.ts
    ├── clients.test.ts
    ├── professionals.test.ts
    ├── services.test.ts
    ├── slots.test.ts
    └── rbac.test.ts
```

---

## Endpoints

### Auth

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | — | Login (rate-limited: 10/15min) |
| POST | `/api/auth/logout` | Sim | Logout (destroy session) |
| GET | `/api/auth/me` | Sim | Usuário autenticado |

### Clients

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients` | ADMIN | Listar todos |
| GET | `/api/clients/:id` | ADMIN ou próprio CLIENT | Buscar por ID |
| POST | `/api/clients` | ADMIN | Criar (tx: users + clients) |
| PATCH | `/api/clients/:id` | ADMIN ou próprio CLIENT | Atualizar |

### Professionals

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/professionals` | Autenticado | Listar (ADMIN vê inativos) |
| GET | `/api/professionals/:id` | Autenticado | Buscar por ID |
| POST | `/api/professionals` | ADMIN | Criar (tx: users + professionals) |
| PATCH | `/api/professionals/:id` | ADMIN ou próprio PROF | Atualizar |

### Services

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/services` | Autenticado | Listar |
| GET | `/api/services/:id` | Autenticado | Buscar por ID |
| POST | `/api/services` | ADMIN | Criar |
| PATCH | `/api/services/:id` | ADMIN | Atualizar |
| DELETE | `/api/services/:id` | ADMIN | Inativar (soft delete) |

### Resources

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/resources` | Autenticado | Listar |
| GET | `/api/resources/:id` | Autenticado | Buscar por ID |
| POST | `/api/resources` | ADMIN | Criar |
| PATCH | `/api/resources/:id` | ADMIN | Atualizar |
| DELETE | `/api/resources/:id` | ADMIN | Inativar (soft delete) |

### Professional Services

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/professionals/:profId/services` | Autenticado | Listar serviços do profissional |
| POST | `/api/professionals/:profId/services` | ADMIN ou próprio PROF | Adicionar (upsert — reativa se inativo) |
| DELETE | `/api/professionals/:profId/services/:serviceId` | ADMIN ou próprio PROF | Remover (soft delete) |

### Availability

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/professionals/:profId/availability` | Autenticado | Listar |
| POST | `/api/professionals/:profId/availability` | ADMIN ou próprio PROF | Criar |
| PATCH | `/api/professionals/:profId/availability/:id` | ADMIN ou próprio PROF | Atualizar |
| DELETE | `/api/professionals/:profId/availability/:id` | ADMIN ou próprio PROF | Remover (active=false) |

### Blocked Periods

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/professionals/:profId/blocked-periods` | ADMIN ou próprio PROF | Listar |
| POST | `/api/professionals/:profId/blocked-periods` | ADMIN ou próprio PROF | Criar |
| PATCH | `/api/professionals/:profId/blocked-periods/:id` | ADMIN ou próprio PROF | Atualizar status |

### Addresses

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients/:clientId/address` | ADMIN ou próprio CLIENT | Buscar endereço |
| PUT | `/api/clients/:clientId/address` | ADMIN ou próprio CLIENT | Criar/atualizar (upsert) |
| DELETE | `/api/clients/:clientId/address` | ADMIN ou próprio CLIENT | Remover |

### Slots

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/slots` | Autenticado | Slots disponíveis |

**Query params de `/api/slots`:**
- `professionalId` (UUID, obrigatório)
- `serviceId` (UUID, obrigatório)
- `date` (YYYY-MM-DD UTC, obrigatório)
- `modality` (IN_PERSON ou HOME_CARE, opcional)

---

## Algoritmo de Slots (`SlotsService.getAvailableSlots`)

O algoritmo é executado **puramente em UTC**. Nenhum timezone é aplicado.

### Passos

1. Buscar e validar service (ACTIVE)
2. Validar modality vs `allowed_modalities` do service
3. Buscar e validar professional (ACTIVE)
4. Verificar que `professional_services.active = true`
5. Calcular weekday da data em UTC (`dateUtc.getUTCDay()`)
6. Buscar janelas de `availability` ativas para o weekday
7. Gerar slots candidatos de `durationMinutes` dentro de cada janela
8. Filtrar por antecedência mínima (`SLOT_MIN_NOTICE_HOURS=2`)
9. Filtrar por janela máxima (`SLOT_MAX_ADVANCE_DAYS=60`)
10. Excluir slots que conflitem com appointments ativos do profissional
11. Excluir slots que conflitem com blocked_periods ativos do profissional
12. Se `modality = IN_PERSON`: excluir slots sem resource ACTIVE disponível
13. Se `clientId` fornecido: excluir slots que conflitem com appointments do cliente

### Configuração

| Variável | Default | Descrição |
|----------|---------|-----------|
| `SLOT_MIN_NOTICE_HOURS` | `2` | Antecedência mínima em horas |
| `SLOT_MAX_ADVANCE_DAYS` | `60` | Janela máxima de agendamento em dias |

### Formato de resposta

```json
{
  "slots": [
    {
      "startDatetime": "2026-09-01T09:00:00.000Z",
      "endDatetime": "2026-09-01T10:00:00.000Z"
    }
  ],
  "date": "2026-09-01",
  "professionalId": "...",
  "serviceId": "...",
  "modality": null
}
```

---

## Repositórios

Todos os repositórios são objetos estáticos com métodos puros que recebem `db` como primeiro argumento (permitindo uso dentro de transações):

```typescript
ClientsRepository.findById(db, id)
ClientsRepository.findById(tx as typeof db, id)  // dentro de transação
```

### Padrão de transações (controllers)

```typescript
const result = await db.transaction(async (tx) => {
  const entity = await SomeRepository.create(tx as typeof db, data);
  await AuditLogsRepository.create(tx as typeof db, { ... });
  return entity;
});
```

### Notas importantes

- `services.price` retorna `string` no Drizzle (tipo `numeric` do PostgreSQL) — normalizar no frontend
- `professional-services.repository.ts` faz upsert: reativa registro inativo em vez de duplicar
- `audit-logs.repository.ts` chama `sanitize()` antes de gravar — nunca grava `password`, `password_hash`, `SESSION_SECRET`

---

## Tratamento de Erros

### Hierarquia de erros

```
AppError (statusCode, code, message)
├── NotFoundError       404  NOT_FOUND
├── ConflictError       409  CONFLICT
├── ForbiddenError      403  FORBIDDEN
├── UnauthorizedError   401  UNAUTHORIZED
└── ValidationError     400  VALIDATION_ERROR
```

### `mapDbError(err)`

Mapeia erros PostgreSQL/Drizzle para `AppError`:

| Código pg | Tipo | HTTP |
|-----------|------|------|
| `23505` | Unique violation | 409 CONFLICT |
| `23503` | FK violation | 409 CONFLICT |
| `23514` | Check violation | 400 VALIDATION_ERROR |
| `23P01` | Exclusion violation | 409 CONFLICT (horário sobrepostos) |
| `P0001` | Raise exception (trigger) | 403 ou 400 conforme mensagem |

`mapDbError` também extrai o erro pg original de `DrizzleQueryError` (via `err.cause`) para interceptar erros não capturados pelos controllers.

### Formato de resposta de erro

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Recurso não encontrado."
  }
}
```

---

## Auditoria

### Eventos auditados

- `USER_LOGIN`, `USER_LOGOUT`
- `CLIENT_CREATED`, `CLIENT_UPDATED`
- `PROFESSIONAL_CREATED`, `PROFESSIONAL_UPDATED`
- `SERVICE_CREATED`, `SERVICE_UPDATED`, `SERVICE_DEACTIVATED`
- `RESOURCE_CREATED`, `RESOURCE_UPDATED`, `RESOURCE_DEACTIVATED`

### Campos nunca gravados

`password`, `password_hash`, `SESSION_SECRET`, tokens, cookies.  
A função `sanitize()` em `audit-logs.repository.ts` remove esses campos dos `oldData`/`newData`.

---

## Segurança

- **Sem enumeração de usuários:** login retorna sempre `"Email ou senha inválidos."` independente se o email existe
- **Timing-safe:** `bcrypt.compare` sempre é executado mesmo quando o usuário não existe (compara contra hash dummy)
- **Rate limit:** 10 tentativas de login por 15 minutos por IP — retorna HTTP 429
- **Session regeneration:** após login bem-sucedido, evita session fixation
- **`password_hash` nunca exposto:** removido de todas as queries de leitura de usuário; verificado por teste dedicado
- **HTTPS em produção:** obrigatório; `SESSION_SECRET` deve ser forte (≥32 chars aleatórios)

---

## Testes

### Estrutura

```
9 suites, 98 testes — todos passando
├── tests/unit/lib/errors.test.ts           (AppError, mapDbError)
├── tests/unit/services/auth.service.test.ts (bcrypt hash)
├── tests/unit/services/slots.service.test.ts (algoritmo, overlap, UTC)
└── tests/integration/
    ├── auth.test.ts      (login, logout, me, rate limit, user enumeration)
    ├── clients.test.ts   (CRUD, ownership 403, 409 duplicate email)
    ├── professionals.test.ts (CRUD, 409 duplicate)
    ├── services.test.ts  (CRUD, soft delete)
    ├── slots.test.ts     (query validation, formato ISO8601, duração, passado, >60 dias, 404)
    └── rbac.test.ts      (401 sem sessão, 403 role violations, ownership)
```

### Execução

```bash
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run test:watch  # modo watch
```

### Configuração Vitest

- `fileParallelism: false` — testes sequenciais para evitar race conditions no BD
- `testTimeout: 30000` — timeout 30s para operações de banco
- Seed helpers: `seedTestData()` / `cleanTestData()` por suite

### Cleanup de testes

O `cleanTestData()` usa `DISABLE/ENABLE TRIGGER trg_audit_logs_no_delete` dentro de uma transação para deletar `audit_logs` de usuários de teste. Os triggers são reativados imediatamente — esse mecanismo existe **exclusivamente nos helpers de teste**.

---

## Bootstrap do Primeiro ADMIN

Não existe endpoint público para criar ADMIN. O primeiro ADMIN é criado via CLI:

```bash
npx tsx scripts/bootstrap-admin.ts
```

O script:
1. Verifica se já existe algum usuário com `role_id = 1` — recusa se sim
2. Solicita nome, email e senha (input oculto)
3. Gera hash bcrypt (salt = 12)
4. Insere em transação atômica

---

## Decisões de Projeto

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Timezone | UTC puro | Sem ambiguidade; `availability.weekday` e `start_time/end_time` em UTC |
| Rescheduling | Cancel + Create | Sem status `RESCHEDULED` no schema (não muda Fase 2) |
| Enumeração de usuários | Proibida | Mesmo erro de 401 para email inexistente e senha errada |
| Primeiro ADMIN | CLI apenas | Sem endpoint público — reduz superfície de ataque |
| Sessão | express-session + PG | Sem JWT; sessão stateful revogável |
| Concorrência | EXCLUDE constraints | Garantia no banco (23P01 → 409) |
| Transações | `db.transaction()` | Atomicidade entre inserts relacionados |

---

## Pendências para Fase 4

- **Appointments (CRUD completo):** criar, cancelar, listar, reagendar
- **Rescheduling:** cancel + create em transação com regras de negócio
- **Notificações:** email de confirmação/cancelamento
- **Filtros avançados:** busca de slots por múltiplos profissionais
- **Dashboard:** métricas de agendamentos por período
- **Testes de carga:** verificar comportamento das EXCLUDE constraints sob concorrência
