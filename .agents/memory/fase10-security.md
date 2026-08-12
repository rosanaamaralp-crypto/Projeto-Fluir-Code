---
name: Fase 10 — Segurança
description: Lições do hardening de segurança — helmet, CORS, trust proxy, body limit, error handler para PayloadTooLargeError
---

# Fase 10 — Segurança

## Regra: PayloadTooLargeError precisa de tratamento explícito no error handler

**Situação:** `express.json({ limit: '50kb' })` lança um erro com `type: 'entity.too.large'` e `status: 413`, mas esse erro **não é um AppError nem um erro de banco**. Sem tratamento explícito, cai no handler genérico e retorna 500.

**Fix:** Verificar `'type' in err && err.type === 'entity.too.large'` antes de chamar `mapDbError` no error handler centralizado.

**How to apply:** Qualquer projeto Express com limite de body size deve ter esse handler. Ver `src/app.ts` (bloco "Erros do body-parser").

---

## Regra: CORS com `credentials: true` exige origin explícita (não wildcard)

**Situação:** `cors({ origin: '*', credentials: true })` é inválido pelo padrão CORS — browsers rejeitam. Para sessões cookie (`credentials: true`), a origin deve ser explícita.

**Fix:** `origin: process.env.CORS_ORIGIN || /\.replit\.dev$/` — env var em prod, regex de fallback em dev Replit.

**How to apply:** Qualquer API com sessão que precise de CORS; o `credentials: true` é obrigatório para cookies cross-origin.

---

## Regra: `trust proxy: 1` deve ser configurado ANTES do rate limiter

**Situação:** Sem `trust proxy`, `express-rate-limit` usa `req.socket.remoteAddress` (IP do proxy Replit), não o IP real do cliente. Rate limit se torna global em vez de por cliente.

**Fix:** `app.set('trust proxy', 1)` antes de qualquer middleware. Permite que `req.ip` reflita corretamente o `x-forwarded-for`.

**How to apply:** Todo projeto Express em Replit (ou qualquer ambiente com 1 nível de reverse proxy).

---

## Baseline pós-F10

- Commit: `d2d657e`
- 500/500 testes · 0 erros typecheck · build OK
- Arquivos novos: `src/lib/ip.ts`, `tests/integration/security-headers.test.ts`
- Próxima fase: F11 — Performance (Doc17 #23)
