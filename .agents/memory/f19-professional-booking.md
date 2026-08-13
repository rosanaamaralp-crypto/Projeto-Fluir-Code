---
name: F19 — Agendamento pelo profissional
description: Regras de segurança do POST /appointments para PROFESSIONAL
---
Regra: no POST /appointments, PROFESSIONAL nunca escolhe professionalId (sempre derivado da sessão via findByUserId, substituindo o valor do payload) e só pode agendar para clientes com relacionamento real (predicado IDOR-safe `findByIdForProfessional`, mesmo do /me/professional/clients — 404 se não relacionado).

**Why:** revisão de arquitetura reprovou a 1ª versão que aceitava qualquer cliente ativo; o AuthDoc exige "seus próprios clientes" e o padrão IDOR do projeto é 404 sem vazar existência.

**How to apply:** qualquer extensão de escrita para PROFESSIONAL (remarcar, alterar, cancelar em nome do cliente) deve reutilizar esses dois predicados; contrato mantém professionalId obrigatório (sem mudança de OpenAPI) — o backend ignora o valor para PROFESSIONAL. Limitação conhecida: profissional não consegue agendar para cliente novo sem atendimento anterior com ele (precisa do ADMIN na 1ª vez).
