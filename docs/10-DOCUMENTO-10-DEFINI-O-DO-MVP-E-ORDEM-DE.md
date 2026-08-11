---
source_sequence: "10"
internal_document: "Documento 10"
source_pdf: "10 - Fluir da Vida — Definição do MVP e Ordem de Desenvolvimento.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 10 — DEFINIÇÃO DO MVP E ORDEM DE

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 10 — DEFINIÇÃO DO MVP E ORDEM DE
DESENVOLVIMENTO
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
   Definir exatamente o que deverá ser desenvolvido na primeira versão funcional do sistema.

O MVP não significa construir um sistema incompleto.

Significa construir primeiro o conjunto mínimo capaz de:

     • cadastrar usuários;
     • controlar permissões;
     • cadastrar clientes;
     • cadastrar profissionais;
     • cadastrar serviços;
     • controlar disponibilidade;
     • realizar agendamentos;
     • controlar as cinco macas;
     • realizar Home Care;
     • alterar e cancelar atendimentos;
     • manter histórico;
     • oferecer dashboards adequados a cada perfil.

2. PRINCÍPIO DO MVP
O MVP deverá ser:

       pequeno o suficiente para ser desenvolvido, mas completo o suficiente para operar
       o negócio.

Não devemos colocar funcionalidades avançadas antes de validar o núcleo da operação.

3. CLASSIFICAÇÃO
   Utilizaremos três categorias.

                                                  1

🔴 MVP — OBRIGATÓRIO

Necessário para a primeira versão operacional.

🟡 FASE 2

Importante, mas pode ser implementado depois que o núcleo estiver funcionando.

🟢 BACKLOG FUTURO

Funcionalidades avançadas ou expansões.

4. MÓDULO — AUTENTICAÇÃO
   🔴 MVP

   • login;
   • logout;
   • recuperação de senha;
   • controle de sessão;
   • identificação de perfil;
   • proteção de rotas.

🟡 FASE 2

      • autenticação por código;
      • login social.

🟢 FUTURO

      • autenticação multifator avançada.

5. MÓDULO — USUÁRIOS
🔴 MVP

      • usuário;
      • status;
      • perfil;
      • permissões básicas.

Perfis:

      • Administrador;
      • Profissional;
      • Cliente.

                                                 2

🟡 FASE 2

     • múltiplos níveis administrativos;
     • permissões extremamente granulares.

6. MÓDULO — CLIENTES
🔴 MVP

Cadastro:

     • nome;
     • data de nascimento;
     • telefone;
     • e-mail;
     • endereço;
     • status.

Também:

     • edição;
     • busca;
     • histórico;
     • próximos atendimentos.

🟡 FASE 2

     • múltiplos endereços;
     • informações adicionais.

🟢 FUTURO

     • segmentação avançada;
     • perfil comportamental;
     • CRM avançado.

7. MÓDULO — PROFISSIONAIS
🔴 MVP

     • cadastro;
     • especialidade;
     • serviços;
     • disponibilidade;
     • bloqueios;
     • status;
     • agenda.

                                             3

🟡 FASE 2

     • metas;
     • indicadores individuais;
     • relatórios avançados.

🟢 FUTURO

     • avaliação de desempenho;
     • comissão;
     • produtividade avançada.

8. MÓDULO — SERVIÇOS
🔴 MVP

Cada serviço deverá possuir:

     • nome;
     • descrição;
     • duração;
     • preço;
     • modalidade;
     • status.

🟡 FASE 2

     • categorias;
     • pacotes.

🟢 FUTURO

     • planos;
     • assinaturas;
     • combos complexos.

9. MÓDULO — AGENDA
🔴 MVP

Este é o núcleo do sistema.

Implementar:

     • agenda diária;
     • semanal;
     • mensal;

                                  4

     • disponibilidade;
     • bloqueios;
     • criação;
     • alteração;
     • cancelamento;
     • remanejamento;
     • status;
     • conflitos.

10. MÓDULO — CINCO MACAS
🔴 MVP

Cadastrar:

````text id="h5ehqv" Maca 01 Maca 02 Maca 03 Maca 04 Maca 05

  Implementar:

  - disponibilidade;
  - ocupação;
  - bloqueio;
  - reserva automática;
  - liberação.

  ---

  # 11. REGRA FUNDAMENTAL DAS MACAS

  Nunca permitir mais atendimentos presenciais simultâneos do que o número de
  macas disponíveis.

  Atualmente:

  **5**

  ---

  # 12. MÓDULO — HOME CARE

  ### 🔴 MVP

  - modalidade Home Care;
  - endereço;
  - agendamento;
  - alteração;
  - cancelamento;
  - agenda;

                                                5

- conflitos;
- diferenciação visual.

### 🟡 FASE 2

- múltiplos endereços;
- recursos de deslocamento.

### 🟢 FUTURO

- mapas;
- rotas;
- geolocalização;
- otimização de rota;
- previsão de chegada.

---

# 13. MÓDULO — DASHBOARD CLIENTE

### 🔴 MVP

- próximo atendimento;
- meus agendamentos;
- histórico;
- novo agendamento;
- perfil.

---

# 14. MÓDULO — DASHBOARD PROFISSIONAL

### 🔴 MVP

- agenda do dia;
- próximos atendimentos;
- Home Care;
- clientes;
- disponibilidade.

---

# 15. MÓDULO — DASHBOARD ADMINISTRADOR

### 🔴 MVP

- agenda;
- atendimentos;
- clientes;
- profissionais;
- serviços;

                                         6

- macas;
- indicadores básicos.

---

# 16. MÓDULO — HISTÓRICO

### 🔴 MVP

Registrar:

- criação;
- alteração;
- cancelamento;
- remanejamento;
- conclusão;
- ausência.

---

# 17. MÓDULO — AUDITORIA

### 🔴 MVP

Registrar:

- usuário;
- ação;
- data/hora;
- entidade;
- alteração.

---

# 18. MÓDULO — NOTIFICAÇÕES

### 🔴 MVP

A arquitetura deverá estar preparada para notificações.

No mínimo:

- mensagens internas;
- confirmação visual.

### 🟡 FASE 2

- e-mail automático;
- lembrete.

### 🟢 FUTURO

                                      7

- WhatsApp;
- SMS;
- notificações inteligentes.

---

# 19. MÓDULO — RELATÓRIOS

### 🔴 MVP

Relatórios básicos:

- atendimentos;
- cancelamentos;
- ausências;
- Home Care;
- ocupação.

### 🟡 FASE 2

- análises por profissional;
- análises por serviço;
- indicadores de crescimento.

### 🟢 FUTURO

- BI;
- dashboards avançados;
- previsões.

---

# 20. MÓDULO — PAGAMENTOS

### 🔴 MVP

Não é obrigatório implementar pagamento online para colocar o núcleo
operacional em funcionamento.

O serviço deverá possuir preço cadastrado.

### 🟡 FASE 2

- registro de pagamento;
- formas de pagamento;
- status financeiro.

### 🟢 FUTURO

- gateway;

                                      8

- PIX;
- cartão;
- recorrência;
- cobrança automática.

---

# 21. MÓDULO — WHATSAPP

### 🔴 MVP

Não obrigatório.

### 🟡 FASE 2

- confirmação;
- lembrete;
- cancelamento.

### 🟢 FUTURO

- chatbot;
- reagendamento automático;
- atendimento automatizado.

---

# 22. MÓDULO — MAPAS

### 🔴 MVP

Não implementar.

### 🟡 FASE 2

Preparar estrutura de endereço.

### 🟢 FUTURO

- Google Maps;
- cálculo de distância;
- rotas;
- tempo de deslocamento.

---

# 23. MÓDULO — AVALIAÇÕES

### 🔴 MVP

Não implementar.

                                  9

### 🟡 FASE 2

- avaliação do atendimento.

### 🟢 FUTURO

- NPS;
- reputação;
- avaliações públicas.

---

# 24. MÓDULO — FINANCEIRO

### 🔴 MVP

Não implementar gestão financeira completa.

### 🟡 FASE 2

- receitas;
- pagamentos;
- recebimentos.

### 🟢 FUTURO

- despesas;
- fluxo de caixa;
- contas a pagar;
- contas a receber;
- DRE;
- integração bancária.

---

# 25. ORDEM DE DESENVOLVIMENTO

A construção deverá seguir dependências.

---

# FASE 1 — FUNDAÇÃO

### 🔴 Sprint 01

- projeto;
- estrutura;
- banco;
- autenticação;
- usuários;

                                     10

- permissões;
- Design System básico.

---

# FASE 2 — CADASTROS

### 🔴 Sprint 02

- clientes;
- profissionais;
- serviços;
- cinco macas.

---

# FASE 3 — AGENDA

### 🔴 Sprint 03

- disponibilidade;
- bloqueios;
- horários;
- criação;
- validação de conflitos.

---

# FASE 4 — AGENDAMENTO

### 🔴 Sprint 04

- cliente;
- profissional;
- administrador;
- presencial;
- Home Care.

---

# FASE 5 — OPERAÇÃO

### 🔴 Sprint 05

- alteração;
- cancelamento;
- remanejamento;
- início;
- conclusão;
- ausência;
- histórico.

                            11

---

# FASE 6 — DASHBOARDS

### 🔴 Sprint 06

- cliente;
- profissional;
- administrador.

---

# FASE 7 — RELATÓRIOS

### 🔴 Sprint 07

- indicadores;
- relatórios básicos;
- ocupação.

---

# FASE 8 — TESTES

### 🔴 Sprint 08

- testes funcionais;
- testes de conflito;
- permissões;
- responsividade;
- segurança;
- concorrência.

---

# 26. CRITÉRIO PARA PASSAR DE FASE

Nenhuma fase deverá ser considerada concluída simplesmente porque "a tela
está pronta".

Deverá existir:

**Interface + Backend + Banco + Validação + Teste.**

---

# 27. DEFINITION OF DONE

Uma funcionalidade estará concluída quando:

                                     12

  - interface criada;
  - backend implementado;
  - banco funcionando;
  - permissões implementadas;
  - validações implementadas;
  - tratamento de erros;
  - responsividade;
  - teste realizado;
  - fluxo completo validado.

  ---

  # 28. REGRA DE NÃO ANTECIPAÇÃO

  O Agent não deverá implementar funcionalidades futuras sem solicitação.

  Exemplo:

  Se estivermos desenvolvendo o MVP:

  > Não implementar automaticamente mapas, WhatsApp ou pagamentos apenas porque
  a arquitetura permite.

  ---

  # 29. REGRA DE ARQUITETURA

  Embora funcionalidades futuras não sejam implementadas agora, o banco e a
  arquitetura deverão evitar decisões que impeçam sua implementação posterior.

  Exemplo:

  Não criar:

  ```text id="vv0nmt"
  home_care = true

como única estrutura de modalidade.

Preferir:

```text id="3zvkn5" modality = HOME_CARE

  ---

  # 30. PRIORIDADE

  Quando houver dúvida entre funcionalidades:

                                           13

1. agenda;
2. agendamento;
3. conflitos;
4. usuários;
5. clientes;
6. profissionais;
7. serviços;
8. macas;
9. Home Care;
10. dashboards;
11. relatórios;
12. funcionalidades futuras.

---

# 31. O QUE NÃO PODE SER SACRIFICADO

Mesmo que seja necessário simplificar o MVP, nunca sacrificar:

- segurança;
- permissões;
- integridade do banco;
- validação de conflitos;
- histórico;
- controle das cinco macas;
- consistência dos agendamentos.

---

# 32. MVP OPERACIONAL

O sistema poderá ser considerado operacional quando o fluxo abaixo funcionar
integralmente:

```text id="5fcb1j"
CLIENTE
↓
LOGIN
↓
ESCOLHE SERVIÇO
↓
ESCOLHE MODALIDADE
↓
ESCOLHE PROFISSIONAL
↓
ESCOLHE DATA
↓
ESCOLHE HORÁRIO
↓
CONFIRMA
↓

                                       14

  BANCO VALIDA
  ↓
  MACA RESERVADA, SE PRESENCIAL
  ↓
  AGENDAMENTO CRIADO
  ↓
  PROFISSIONAL VISUALIZA
  ↓
  ADMINISTRADOR VISUALIZA
  ↓
  ATENDIMENTO REALIZADO
  ↓
  CONCLUSÃO
  ↓
  HISTÓRICO

33. RESULTADO ESPERADO
Ao final do MVP, o Fluir da Vida deverá conseguir operar sua agenda digital de ponta a ponta sem
depender de planilhas paralelas para controlar:

     • clientes;
     • profissionais;
     • serviços;
     • horários;
     • cinco macas;
     • Home Care;
     • histórico.

34. PRINCÍPIO FINAL
O MVP não deve ser avaliado pela quantidade de telas.

Deve ser avaliado pela capacidade de realizar a operação real.

       Se o cliente consegue agendar, o profissional consegue atender e o administrador
       consegue controlar tudo com segurança, o MVP cumpriu seu objetivo.

                                                  15
````
