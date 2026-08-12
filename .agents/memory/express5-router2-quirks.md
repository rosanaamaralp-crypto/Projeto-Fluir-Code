---
name: Express 5 / router@2.x quirks
description: Comportamentos não-óbvios do Express 5 com router@2.x que afetam middlewares de validação e testes.
---

## `req.query` é getter readonly no router@2.x

`router@2.x` (usado pelo Express 5) define `req.query` como getter no protótipo — atribuição direta (`req.query = ...`) lança `TypeError: Cannot set property query`.

**Solução:** `Object.defineProperty` para criar propriedade própria que sombra o getter:
```typescript
Object.defineProperty(req, "query", {
  value: result.data,
  writable: true,
  configurable: true,
  enumerable: true,
});
```

**Why:** `req.params` (setter definido pela rota) continua funcionando com atribuição normal; somente `query` tem esse comportamento.

**How to apply:** Qualquer middleware que precisa sobrescrever `req.query` deve usar `Object.defineProperty`.

---

## Vitest 4 — `fileParallelism: false`

Em Vitest 4, `test.poolOptions` foi removido. Para testes sequenciais (necessário quando múltiplos suites compartilham BD):

```typescript
export default defineConfig({
  test: {
    fileParallelism: false,
    // ...
  }
});
```

`singleFork: true` não é opção válida em Vitest 4.

---

## Drizzle wraps pg errors em `.cause`

`DrizzleQueryError` não expõe o código pg diretamente — o erro pg original fica em `err.cause`. Qualquer `mapDbError()` precisa extrair o pg error via:
```typescript
const pgErr = (err as any)?.cause ?? err;
if (pgErr?.code === "23505") { ... }
```

---

## audit_logs FK durante cleanup de testes

`audit_logs.user_id` tem FK com `ON DELETE RESTRICT`. Para deletar usuários de teste que fizeram login (e geraram audit_logs):
1. Usar `pool.connect()` para pegar um client direto
2. `DISABLE TRIGGER trg_audit_logs_no_delete` (somente em testes)
3. Deletar audit_logs, depois o usuário
4. `ENABLE TRIGGER trg_audit_logs_no_delete` — reativar imediatamente, sempre no finally
