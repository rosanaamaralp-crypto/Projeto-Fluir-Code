# Operações — Projeto Fluir da Vida

Guia curto de operação em produção. URL pública: `https://projeto-fluir-docs--rosanaamaralppi.replit.app`

## Publicar (deploy)
1. No workspace, clique em **Publish** (Deployments) e confirme.
2. Aguarde o build; ao final, verifique o healthcheck (abaixo).
3. Atenção: o Publish sincroniza tabelas por diff, mas **não replica constraints EXCLUDE nem extensões**. Após qualquer mudança de schema, rode a migration oficial contra produção (abaixo).

## Healthcheck
```
curl https://projeto-fluir-docs--rosanaamaralppi.replit.app/api/healthz
```
Esperado: HTTP 200.

## Migration / Seed / ADMIN inicial (contra produção)
Obtenha a connection string em **Database → Production → Connection string** e rode no Shell do workspace (todos idempotentes — seguros para repetir):
```
DATABASE_URL="<connection string de produção>" pnpm --filter @workspace/db run migrate
DATABASE_URL="<connection string de produção>" pnpm --filter @workspace/db run seed
DATABASE_URL="<...>" BOOTSTRAP_ADMIN_NAME="..." BOOTSTRAP_ADMIN_EMAIL="..." BOOTSTRAP_ADMIN_PASSWORD="..." \
  pnpm --filter @workspace/api-server run bootstrap:admin
```
- `migrate`: aplica migrations pendentes (registra em `schema_migrations`).
- `seed`: garante 3 roles e as 5 macas (Maca 01–05). Não cria dados fictícios.
- `bootstrap:admin`: cria o primeiro ADMIN somente se nenhum existir; nunca exibe a senha.

## Variáveis de produção
- Gerenciadas pela plataforma: `DATABASE_URL`, `NODE_ENV`, `PORT`.
- Configuradas manualmente (Deployments → Settings): `APP_PUBLIC_URL`, `CORS_ORIGIN` (= URL pública), `SESSION_SECRET` (secret).

## Rollback
Use a aba **Deployments** → histórico → *Redeploy* de uma versão anterior. Para o código, use os checkpoints/histórico Git do workspace.

## Backup do banco
O banco de produção é PostgreSQL (Neon, via Replit). Para backup manual:
```
pg_dump "<connection string de produção>" > backup-$(date +%Y%m%d).sql
```

## Segurança operacional
- Nunca cole a connection string ou senhas no chat/commits; use Secrets.
- Após operações pontuais, remova os secrets temporários `PROD_DATABASE_URL` e `BOOTSTRAP_ADMIN_*` no painel Secrets.
