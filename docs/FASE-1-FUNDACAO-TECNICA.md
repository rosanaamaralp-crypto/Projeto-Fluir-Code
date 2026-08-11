# Fase 1 — Fundação Técnica

## Objetivo

Preparar a base de desenvolvimento do Projeto Fluir sem implementar módulos de
negócio. A documentação oficial em `docs/` continua sendo a fonte das regras
do produto.

## Camadas preparadas

```text
Frontend React/Vite
        ↓
API Express
        ↓
Serviços de domínio
        ↓
Repositórios
        ↓
Camada de acesso PostgreSQL/Drizzle
```

O endpoint técnico `GET /api/healthz` permanece disponível para verificar que a
API está iniciando. Ele não representa uma funcionalidade do produto.

## Estrutura preparada

- `artifacts/fluir-da-vida/`: aplicação web e configuração Vite.
- `artifacts/api-server/src/routes/`: rotas HTTP.
- `artifacts/api-server/src/controllers/`: ponto reservado para controllers.
- `artifacts/api-server/src/services/`: ponto reservado para serviços de domínio.
- `artifacts/api-server/src/repositories/`: ponto reservado para repositórios.
- `artifacts/api-server/src/validators/`: ponto reservado para validações de entrada.
- `artifacts/api-server/src/domain/`: ponto reservado para regras de domínio.
- `lib/api-spec/`: contrato OpenAPI.
- `lib/api-client-react/`: cliente React gerado a partir do contrato.
- `lib/api-zod/`: schemas gerados a partir do contrato.
- `lib/db/`: cliente Drizzle e ponto reservado para o schema.
- `shared/`: ponto reservado para tipos e validações compartilháveis.
- `tests/`: testes da fundação e, posteriormente, testes unitários e de integração.

## Variáveis de ambiente

O arquivo `.env.example` documenta as variáveis esperadas. Nenhum valor
secreto foi gravado no código. O cliente de banco é criado sob demanda por
`getDatabaseClient()` e não exige conexão durante a inicialização da API.

## Qualidade

- TypeScript: `pnpm run typecheck`
- Formatação e lint de estilo: `pnpm run lint`
- Formatação automática: `pnpm run format`
- Testes da fundação: `pnpm run test`
- Verificação completa: `pnpm run build`

O lint da Fase 1 usa a verificação do Prettier já disponível no workspace.
Regras específicas de ESLint serão definidas quando existirem componentes e
módulos de produto suficientes para justificá-las.

## Não implementado nesta fase

- autenticação, Clerk, login e usuários funcionais;
- schema definitivo, migrations e seed;
- clientes, profissionais e serviços;
- disponibilidade, macas, agenda e agendamentos;
- Home Care funcional;
- notificações, relatórios e auditoria funcional;
- telas de negócio;
- dados de produção.

## Decisões pendentes

Continuam pendentes as decisões registradas no relatório aprovado: timezone
oficial, estratégia final de autenticação, status inicial do agendamento,
escopo de endereços no MVP, compatibilidade de modalidades e regras de
cancelamento.
