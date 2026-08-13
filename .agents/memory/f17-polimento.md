---
name: F17 — Polimento pré-produção
description: Decisões duráveis da F17 (T-003 sem migration, lock de auto-seleção, teste Caso C)
---

## T-003 recuperação de senha SEM tabela
Token stateless estilo Django: HMAC-SHA256 com chave SESSION_SECRET sobre `payload + sha256(password_hash atual)`; exp embutido (inteiro! — payload usa `.` como separador). Uso único garantido por: (a) hash muda após reset; (b) update condicional `WHERE id AND password_hash = hash validado` (corrida de 2 resets → 1 vence).
**Why:** AuthDoc proibia migration; auditoria de code-review encontrou corrida de reuso e enumeração temporal.
**How to apply:** qualquer mudança futura de auth deve preservar o update condicional e o fire-and-forget do forgot-password (resposta não aguarda e-mail — mitiga enumeração por latência).

## Mailer
`src/lib/mailer.ts` — driver replitmail (REPL_IDENTITY dev / WEB_REPL_RENEWAL deploy, sem secret extra) com fallback console; `MAIL_DRIVER=console` forçado em testes. Link de reset usa `APP_PUBLIC_URL` (produção) — configurar antes do go-live.

## F17.4 auto-seleção de maca
`pg_advisory_xact_lock(hashtext('appointments_resource_auto_select'))` no caminho de auto-seleção (não afeta resourceId explícito) + retry máx 3 em 23P01/excl_resource_no_overlap como backstop. Retry sozinho NÃO converge deterministicamente (perdedores re-escolhem a mesma primeira maca livre).

## Teste Caso C ajustado
`appointments.concurrent.test.ts` Caso C agora passa `resourceId` explícito: a premissa antiga ("auto-seleção colide na mesma maca") deixou de valer com a F17.4. Testes de disputa de maca devem ser explícitos.
