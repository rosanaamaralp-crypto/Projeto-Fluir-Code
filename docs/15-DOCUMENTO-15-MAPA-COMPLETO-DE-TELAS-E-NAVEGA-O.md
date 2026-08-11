---
source_sequence: "15"
internal_document: "Documento 15"
source_pdf: "15 - Fluir da Vida — Mapa de Telas e Navegação.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 15 — MAPA COMPLETO DE TELAS E NAVEGAÇÃO

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 15 — MAPA COMPLETO DE TELAS E NAVEGAÇÃO
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
Definir todas as telas previstas para o sistema e como cada perfil navegará entre elas.

O documento deverá responder:

     • quem acessa;
     • qual tela vê;
     • o que pode fazer;
     • para onde pode navegar;
     • quais dados são exibidos;
     • quais ações são permitidas.

2. PERFIS
O sistema terá três visões principais:

  ADMINISTRADOR
  PROFISSIONAL
  CLIENTE

Cada perfil deverá possuir experiência própria.

3. FLUXO GERAL
```text id="v8y1dy" LOGIN │ ├── ADMINISTRADOR │ ↓ │ DASHBOARD ADMIN │ ├──
PROFISSIONAL │ ↓ │ DASHBOARD PROFISSIONAL │ └── CLIENTE ↓ DASHBOARD CLIENTE

  ---

  # 4. TELAS PÚBLICAS

                                                    1

  ## T-001 — Landing Page

  ### Acesso

  Público.

  ### Conteúdo

  - apresentação;
  - serviços;
  - diferenciais;
  - chamada para agendamento;
  - login.

  ### Ações

  ```text id="x4prc7"
  Entrar
  Agendar
  Conhecer serviços

5. T-002 — Login
Campos:

     • e-mail;
     • senha.

Ações:

     • entrar;
     • recuperar senha.

6. T-003 — Recuperação de senha
Fluxo:

```text id="t3jv3s" E-mail ↓ Solicitação ↓ Validação ↓ Nova senha

  ---

  # 7. T-004 — Dashboard ADMINISTRADOR

  Visão geral:

                                                   2

  ```text id="2ay0dh"
  ┌─────────────────────────────────────┐
  │ Dashboard Administrativo                      │
  ├─────────────────────────────────────┤
  │ Atendimentos hoje                             │
  │ Próximos atendimentos                         │
  │ Ocupação                                       │
  │ Cancelamentos                                  │
  │ Home Care                                      │
  ├─────────────────────────────────────┤
  │ Agenda                                        │
  │ Clientes                                      │
  │ Profissionais                                 │
  │ Serviços                                      │
  │ Recursos                                      │
  │ Relatórios                                    │
  └─────────────────────────────────────┘

8. MENU ADMINISTRADOR
```text id="q1k2z7" Dashboard Agenda Clientes Profissionais Serviços Recursos Relatórios Notificações
Configurações Auditoria

  ---

  # 9. T-005 — Agenda Administrativa

  Possibilidades:

  - dia;
  - semana;
  - mês.

  Filtros:

  - profissional;
  - cliente;
  - serviço;
  - modalidade;
  - status;
  - recurso.

  ---

  # 10. T-006 — Novo Agendamento Administrativo

  Campos:

                                                   3

- cliente;
- serviço;
- modalidade;
- profissional;
- data;
- horário;
- endereço quando necessário;
- recurso quando necessário;
- observação.

---

# 11. T-007 — Detalhes do Agendamento

Exibir:

- cliente;
- profissional;
- serviço;
- modalidade;
- data;
- horário;
- recurso;
- endereço;
- status;
- histórico.

Ações conforme permissão:

- editar;
- cancelar;
- concluir;
- marcar ausência;
- remanejar.

---

# 12. T-008 — Clientes

Lista:

- nome;
- telefone;
- e-mail;
- status;
- próximo atendimento.

Ações:

- visualizar;

                                        4

  - editar;
  - novo agendamento.

  ---

  # 13. T-009 — Cadastro de Cliente

  Campos definidos no Documento 13.

  Ações:

  - salvar;
  - cancelar.

  ---

  # 14. T-010 — Perfil do Cliente

  Abas:

  ```text id="7w3qri"
  Dados
  Agendamentos
  Histórico
  Endereços

15. T-011 — Profissionais
Lista:

         • nome;
         • especialidade;
         • status;
         • serviços.

Ações:

         • visualizar;
         • editar;
         • ativar;
         • desativar.

16. T-012 — Perfil do Profissional
Abas:

                                      5

```text id="c7y3m9" Dados Serviços Disponibilidade Bloqueios Agenda Histórico

  ---

  # 17. T-013 — Serviços

  Lista:

  - nome;
  - duração;
  - preço;
  - modalidade;
  - status.

  ---

  # 18. T-014 — Cadastro de Serviço

  Campos:

  - nome;
  - descrição;
  - duração;
  - preço;
  - modalidade;
  - status.

  ---

  # 19. T-015 — Recursos

  Exibir:

  ```text id="fr0h1x"
  Maca 01
  Maca 02
  Maca 03
  Maca 04
  Maca 05

Status:

     • disponível;
     • ocupada;
     • bloqueada;
     • inativa.

                                                  6

20. T-016 — Detalhes da Maca
Exibir:

      • nome;
      • status;
      • agenda;
      • bloqueios;
      • ocupação.

21. T-017 — Relatórios
Primeira versão:

      • atendimentos;
      • cancelamentos;
      • ausências;
      • Home Care;
      • ocupação;
      • macas.

22. T-018 — Auditoria
Exibir:

      • usuário;
      • ação;
      • registro;
      • data;
      • hora.

Filtros:

      • usuário;
      • período;
      • entidade;
      • ação.

23. T-019 — Configurações
Configurações gerais:

      • dados da empresa;
      • horários;

                            7

      • regras;
      • recursos;
      • preferências.

24. VISÃO PROFISSIONAL

25. T-020 — Dashboard Profissional
Exibir:

      • atendimento atual;
      • próximos atendimentos;
      • agenda do dia;
      • Home Care;
      • disponibilidade.

26. MENU PROFISSIONAL
```text id="9xkmyt" Dashboard Minha Agenda Clientes Disponibilidade Notificações Meu Perfil

  ---

  # 27. T-021 — Minha Agenda

  Visualizações:

  - dia;
  - semana.

  Cada atendimento deverá mostrar:

  - horário;
  - cliente;
  - serviço;
  - modalidade;
  - endereço quando Home Care;
  - status.

  ---

  # 28. T-022 — Detalhes do Atendimento

  Exibir informações necessárias para realização do atendimento.

                                                  8

Ações:

- iniciar;
- concluir;
- registrar ausência;
- cancelar conforme permissão.

---

# 29. T-023 — Meus Clientes

Lista de clientes relacionados aos atendimentos do profissional.

---

# 30. T-024 — Disponibilidade

Profissional poderá visualizar/configurar sua disponibilidade conforme as
permissões definidas.

---

# 31. T-025 — Bloqueios

Permitir visualizar e, se autorizado:

- criar bloqueio;
- alterar;
- remover.

---

# 32. T-026 — Meu Perfil

Dados:

- nome;
- telefone;
- e-mail;
- especialidade.

---

# 33. VISÃO CLIENTE

---

# 34. T-027 — Dashboard Cliente

Exibir:

                                        9

  ```text id="qv9z1g"
  Próximo atendimento
  Novo agendamento
  Meus agendamentos
  Histórico

35. MENU CLIENTE
```text id="prr4n8" Início Novo Agendamento Meus Agendamentos Histórico Meus Endereços Meu Perfil
Notificações

  ---

  # 36. T-028 — Novo Agendamento

  Fluxo visual:

  ```text id="8q1k9m"
  1. Serviço
        ↓
  2. Modalidade
        ↓
  3. Profissional
        ↓
  4. Data
        ↓
  5. Horário
        ↓
  6. Confirmação

37. T-029 — Seleção de Serviço
Mostrar somente serviços ativos.

38. T-030 — Seleção de Modalidade
Opções:

```text id="f2l6ba" Atendimento presencial Home Care

                                                 10

  Somente mostrar opções compatíveis com o serviço.

  ---

  # 39. T-031 — Seleção de Profissional

  Mostrar profissionais:

  - ativos;
  - habilitados para o serviço;
  - compatíveis com a modalidade.

  ---

  # 40. T-032 — Seleção de Data

  Calendário.

  Dias sem disponibilidade deverão ser visualmente identificados.

  ---

  # 41. T-033 — Seleção de Horário

  Mostrar somente horários realmente disponíveis.

  O backend deverá validar novamente ao confirmar.

  ---

  # 42. T-034 — Confirmação

  Exibir resumo:

  ```text id="hks6a4"
  Serviço
  Profissional
  Modalidade
  Data
  Horário
  Endereço

Botão:

         Confirmar agendamento.

                                          11

43. T-035 — Sucesso
Exibir:

      • confirmação;
      • número/identificador;
      • data;
      • horário;
      • profissional;
      • modalidade.

Ações:

      • visualizar;
      • voltar para início.

44. T-036 — Meus Agendamentos
Separar:

Próximos

Histórico

45. T-037 — Detalhes do Agendamento
Exibir:

      • serviço;
      • profissional;
      • data;
      • horário;
      • modalidade;
      • endereço;
      • status.

Ações:

      • alterar;
      • cancelar.

Quando permitido.

                                12

46. T-038 — Meus Endereços
Permitir:

         • cadastrar;
         • editar;
         • excluir/desativar;
         • definir padrão.

47. T-039 — Meu Perfil
Exibir:

         • nome;
         • telefone;
         • e-mail;
         • dados cadastrais.

48. T-040 — Notificações
Lista:

         • novas confirmações;
         • alterações;
         • cancelamentos;
         • avisos.

49. NAVEGAÇÃO ADMINISTRADOR
```text id="o3u1ly" Dashboard │ ├── Agenda │ ├── Novo agendamento │ └── Detalhes │
├── Clientes │ └── Perfil │ ├── Profissionais │ └── Perfil │ ├── Serviços │ ├──
Recursos │ ├── Relatórios │ ├── Auditoria │ └── Configurações

  ---

  # 50. NAVEGAÇÃO PROFISSIONAL

  ```text id="p7q2h0"
  Dashboard
         │
         ├── Minha Agenda
         │       └── Atendimento

                                          13

      │
      ├── Clientes
      │
      ├── Disponibilidade
      │
      ├── Notificações
      │
      └── Perfil

51. NAVEGAÇÃO CLIENTE
```text id="y1p9oa" Dashboard │ ├── Novo Agendamento │ ├── Serviço │ ├── Modalidade │
├── Profissional │ ├── Data │ ├── Horário │ └── Confirmação │ ├── Meus
Agendamentos │ ├── Histórico │ ├── Endereços │ └── Perfil

  ---

  # 52. REGRA DE NAVEGAÇÃO

  Usuário não deverá conseguir acessar telas fora de sua permissão.

  ---

  # 53. ACESSO DIRETO POR URL

  Mesmo que o usuário digite diretamente a URL:

  ```text id="gq6x4x"
   /admin

o backend deverá verificar autorização.

54. MENU DINÂMICO
O menu deverá ser adaptado ao perfil.

Cliente não verá:

     • Auditoria;
     • Profissionais;
     • Recursos administrativos.

Profissional não verá funcionalidades administrativas não autorizadas.

                                                  14

55. ESTADOS DE TELA
Todas as telas deverão possuir estados:

```text id="g8r5ha" LOADING EMPTY SUCCESS ERROR

  ---

  # 56. ESTADO VAZIO

  Exemplo:

  > Você ainda não possui agendamentos.

  Não apresentar tela quebrada.

  ---

  # 57. ESTADO DE ERRO

  Exemplo:

  > Não foi possível carregar seus agendamentos. Tente novamente.

  ---

  # 58. CONFIRMAÇÕES

  Operações críticas deverão solicitar confirmação.

  Exemplo:

  > Deseja realmente cancelar este atendimento?

  ---

  # 59. MENSAGENS

  Mensagens deverão ser:

  - claras;
  - curtas;
  - orientadas à ação.

  Evitar mensagens técnicas.

  ---

  # 60. RESPONSIVIDADE

                                             15

Todas as telas deverão funcionar em:

- desktop;
- notebook;
- tablet;
- celular.

---

# 61. PRINCÍPIO MOBILE

No celular, ações importantes deverão estar facilmente acessíveis.

Principalmente:

- novo agendamento;
- próximos atendimentos;
- cancelar;
- confirmar.

---

# 62. ACESSIBILIDADE

Campos deverão possuir:

- labels;
- foco;
- mensagens;
- navegação por teclado.

---

# 63. COMPONENTES REUTILIZÁVEIS

Sempre que possível reutilizar:

- botão;
- modal;
- calendário;
- tabela;
- card;
- formulário;
- alerta;
- badge;
- seletor.

---

# 64. REGRA DE CONSISTÊNCIA

                                       16

  A mesma ação deverá possuir comportamento semelhante em todas as telas.

  ---

  # 65. AGENDA

  A agenda deverá utilizar uma representação visual consistente para:

  - confirmado;
  - pendente;
  - em atendimento;
  - concluído;
  - cancelado;
  - ausência.

  ---

  # 66. HOME CARE

  Home Care deverá possuir identificação visual clara.

  Exemplo:

  ```text
  🏠 HOME CARE

A representação final seguirá o Design System.

67. PRESENCIAL
Atendimento presencial deverá possuir identificação própria.

68. RECURSOS
Na visão administrativa, a ocupação das cinco macas deverá ser facilmente compreendida.

69. INDICADORES
Dashboard administrativo deverá destacar:

     • atendimentos do dia;
     • ocupação;
     • cancelamentos;

                                                  17

        • Home Care.

70. PERFORMANCE
A agenda não deverá carregar informações desnecessárias.

Utilizar:

        • filtros;
        • paginação;
        • carregamento sob demanda;
        • consultas otimizadas.

71. REGRA DE API
Cada tela deverá consumir dados reais da API.

Não utilizar dados fictícios na produção.

72. REGRA DE BACKEND
Toda ação importante deverá ser validada novamente pelo backend.

73. REGRA DE EXPERIÊNCIA
O usuário não deverá precisar entender a arquitetura do sistema para conseguir realizar uma operação.

74. FLUXO PRINCIPAL DO CLIENTE
```text id="6f4v8p" LOGIN ↓ DASHBOARD ↓ NOVO AGENDAMENTO ↓ SERVIÇO ↓ MODALIDADE ↓
PROFISSIONAL ↓ DATA ↓ HORÁRIO ↓ CONFIRMAÇÃO ↓ SUCESSO

  ---

  # 75. FLUXO PRINCIPAL DO PROFISSIONAL

  ```text id="m0v5wr"
  LOGIN
    ↓

                                                 18

  DASHBOARD
   ↓
  MINHA AGENDA
   ↓
  ATENDIMENTO
   ↓
  INICIAR
   ↓
  CONCLUIR

76. FLUXO PRINCIPAL DO ADMINISTRADOR
```text id="5n5e8z" LOGIN ↓ DASHBOARD ↓ AGENDA ↓ GERENCIAR ↓ CLIENTES / PROFISSIONAIS /
SERVIÇOS / RECURSOS ↓ RELATÓRIOS

  ---

  # 77. FLUXO HOME CARE

  ```text id="h7ql8s"
  CLIENTE
  ↓
  SERVIÇO
  ↓
  HOME CARE
  ↓
  ENDEREÇO
  ↓
  PROFISSIONAL
  ↓
  DATA
  ↓
  HORÁRIO
  ↓
  VALIDAÇÃO
  ↓
  CONFIRMAÇÃO

78. FLUXO PRESENCIAL
```text id="t8a2jh" CLIENTE ↓ SERVIÇO ↓ PRESENCIAL ↓ PROFISSIONAL ↓ DATA ↓ HORÁRIO ↓
VALIDAR MACA ↓ CONFIRMAÇÃO

                                            19

---

# 79. REGRA FUNDAMENTAL

O mapa de telas não substitui as regras de negócio.

Ele representa a experiência.

As regras permanecem no Documento 14.

---

# 80. REGRA PARA O REPLIT AGENT

Ao construir uma tela, o Agent deverá identificar:

1. perfil;
2. permissão;
3. dados necessários;
4. API;
5. regra de negócio;
6. estados;
7. ações;
8. validações;
9. tratamento de erro;
10. responsividade.

---

# 81. CRITÉRIO DE CONCLUSÃO DE UMA TELA

Uma tela somente estará concluída quando:

```text
UI
+
API
+
DADOS
+
PERMISSÕES
+
VALIDAÇÃO
+
ERROS
+
RESPONSIVIDADE
+
TESTE

                                        20

estiverem funcionando.

82. PRINCÍPIO FINAL
Cada tela deverá existir para cumprir uma necessidade real do negócio.

Não criar telas apenas porque:

      "seria interessante ter".

A necessidade deverá estar registrada em um dos documentos oficiais.

      O mapa de telas transforma a arquitetura em experiência de uso.

                                                 21
