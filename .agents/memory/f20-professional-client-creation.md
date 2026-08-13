---
name: F20 — Cadastro de cliente pelo profissional
description: Relacionamento profissional→cliente estendido via audit log CLIENT_CREATED
---
Regra: o predicado de ownership profissional→cliente (usado em /me/professional/clients) é: tem atendimento com o profissional OU foi cadastrado por ele (exists em audit_logs action=CLIENT_CREATED + entityType=clients, join professionals por userId). POST /clients aceita ADMIN e PROFESSIONAL; CLIENT continua 403.

**F21 (decisão explícita da proprietária, ago/2026):** PROFESSIONAL pode listar/buscar a base COMPLETA via GET /clients, agendar para QUALQUER cliente ACTIVE (sem exigir relacionamento) e ler endereço de qualquer cliente (GET /clients/:id/addresses, somente leitura, para Home Care). Anti-spoof do professionalId mantido. /me/professional/clients continua restrito ao relacionamento. Não "corrigir" isso de volta em auditorias futuras.

**Why:** permitir que o profissional agende para cliente recém-cadastrado sem depender do ADMIN, reutilizando estruturas existentes (sem migration, sem mudança de OpenAPI). Apagar a linha de audit revogaria o vínculo derivado — não existe caminho de deleção na aplicação hoje.

**How to apply:** qualquer nova checagem de "cliente do profissional" deve usar `professionalRelationshipPredicate` do clients.repository, não refazer JOIN em appointments. Frontend: após criar cliente, invalidar o cache de useListMyProfessionalClients; wizard /professional/book aceita `?clientId=` (preselect só marca concluído quando o cliente aparece na lista). Testes com criação de usuário devem usar e-mails únicos por execução (`Date.now()`) — cleanTestData não remove e-mails fixos novos e a 2ª rodada dá 409.
