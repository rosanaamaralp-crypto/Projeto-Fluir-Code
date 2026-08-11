---
source_sequence: "08"
internal_document: "Documento 08"
source_pdf: "8 - Mapa de Telas e Navegação.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 08 — MAPA DE TELAS E NAVEGAÇÃO

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 08 — MAPA DE TELAS E NAVEGAÇÃO
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
Definir todas as telas previstas para o sistema e identificar claramente:

       • qual perfil utiliza;
       • objetivo da tela;
       • informações apresentadas;
       • ações disponíveis;
       • origem do acesso;
       • nível de prioridade.

Perfis:

       • ADMINISTRADOR;
       • PROFISSIONAL;
       • CLIENTE.

2. PRINCÍPIO
Nenhuma tela deverá ser criada sem definir:

      1. quem utiliza;
      2. o que pode visualizar;
      3. o que pode fazer;
      4. de onde chegou;
      5. para onde pode ir.

3. ESTRUTURA GERAL

  SISTEMA
  │
  ├── AUTENTICAÇÃO
  │
  ├── ADMINISTRADOR

                                                     1

  │
  ├── PROFISSIONAL
  │
  └── CLIENTE

4. AUTENTICAÇÃO
TELA 01 — LOGIN
Perfil: Todos

Elementos

      • Logo;
      • e-mail;
      • senha;
      • entrar;
      • recuperar senha;
      • criar conta, quando aplicável.

Ação

Após autenticação:

  ADMIN → Dashboard Administrativo
  PROFISSIONAL → Dashboard Profissional
  CLIENTE → Dashboard do Cliente

5. TELA 02 — RECUPERAR SENHA
Perfil: Todos

Elementos

      • e-mail;
      • botão recuperar;
      • mensagem de confirmação.

6. TELA 03 — CRIAR CONTA
Perfil: Cliente

                                          2

Campos

      • nome;
      • data de nascimento;
      • telefone;
      • e-mail;
      • senha;
      • confirmação de senha.

7. CLIENTE — NAVEGAÇÃO
Menu principal:

  Início
  Agendar
  Meus Agendamentos
  Histórico
  Meu Perfil
  Sair

8. CLIENTE — DASHBOARD
TELA 10
Perfil: Cliente

Objetivo

Mostrar rapidamente:

      • próximo atendimento;
      • botão novo agendamento;
      • últimos atendimentos;
      • informações importantes.

Exemplo

  Olá, Maria!

  Seu próximo atendimento

  📅 15/08
  ⏰ 14:00
  Serviço: ...

                                   3

  Profissional: ...

  [Ver atendimento]

  [Novo agendamento]

9. CLIENTE — NOVO AGENDAMENTO
TELA 11
Perfil: Cliente

Etapa 1

Selecionar serviço.

Etapa 2

Selecionar modalidade.

  Presencial
  Home Care

Etapa 3

Selecionar profissional.

Etapa 4

Selecionar data.

Etapa 5

Selecionar horário.

Etapa 6

Confirmar.

10. CLIENTE — ENDEREÇO HOME CARE
TELA 12
Perfil: Cliente

                           4

Somente aparece quando:

Home Care

Campos

      • CEP;
      • endereço;
      • número;
      • complemento;
      • bairro;
      • cidade;
      • estado;
      • referência.

11. CLIENTE — CONFIRMAÇÃO
TELA 13
Perfil: Cliente

Mostrar:

      • serviço;
      • profissional;
      • modalidade;
      • data;
      • horário;
      • endereço, se Home Care.

Botão

Confirmar agendamento

12. CLIENTE — SUCESSO
TELA 14
Mostrar:

       Agendamento confirmado!

Informações:

      • serviço;
      • profissional;

                                  5

      • data;
      • horário;
      • modalidade.

Ações

      • Ver agendamento;
      • Voltar para início.

13. CLIENTE — MEUS AGENDAMENTOS
TELA 15
Mostrar:

      • próximos;
      • futuros;
      • cancelados.

Filtros simples:

      • período;
      • status.

14. CLIENTE — DETALHE DO AGENDAMENTO
TELA 16
Mostrar:

      • serviço;
      • profissional;
      • data;
      • horário;
      • modalidade;
      • endereço, quando Home Care;
      • status.

Ações

      • Alterar;
      • Cancelar.

                                      6

15. CLIENTE — HISTÓRICO
TELA 17
Mostrar atendimentos concluídos.

Informações:

     • data;
     • serviço;
     • profissional;
     • modalidade;
     • status.

16. CLIENTE — MEU PERFIL
TELA 18
Campos:

     • nome;
     • data de nascimento;
     • telefone;
     • e-mail;
     • endereço.

Ações

     • editar;
     • salvar.

17. PROFISSIONAL — NAVEGAÇÃO
Menu:

  Início
  Minha Agenda
  Agendamentos
  Clientes
  Disponibilidade
  Home Care
  Meu Perfil
  Sair

                                   7

18. PROFISSIONAL — DASHBOARD
TELA 20
Mostrar:

      • próximo atendimento;
      • quantidade de atendimentos do dia;
      • próximos horários;
      • Home Care do dia;
      • alertas.

19. PROFISSIONAL — MINHA AGENDA
TELA 21
Visualizações:

      • dia;
      • semana;
      • mês.

Prioridade:

Dia

20. PROFISSIONAL — DETALHE DO ATENDIMENTO
TELA 22
Mostrar:

      • cliente;
      • serviço;
      • horário;
      • modalidade;
      • maca, se presencial;
      • endereço, se Home Care;
      • observações.

Ações

      • iniciar;
      • concluir;
      • alterar;

                                             8

      • cancelar.

21. PROFISSIONAL — NOVO AGENDAMENTO
TELA 23
Fluxo:

  Cliente
  ↓
  Serviço
  ↓
  Modalidade
  ↓
  Data
  ↓
  Horário
  ↓
  Confirmação

O profissional já estará definido.

22. PROFISSIONAL — CLIENTES
TELA 24
Lista de clientes relacionados aos seus atendimentos.

Buscar

      • nome;
      • telefone.

23. PROFISSIONAL — DETALHE DO CLIENTE
TELA 25
Mostrar somente dados necessários:

      • nome;
      • data de nascimento;
      • telefone;

                                                  9

     • e-mail;
     • histórico de atendimentos permitidos;
     • endereço quando necessário para Home Care.

24. PROFISSIONAL — NOVO CLIENTE
TELA 26
Campos:

     • nome;
     • data de nascimento;
     • telefone;
     • e-mail;
     • endereço.

25. PROFISSIONAL — DISPONIBILIDADE
TELA 27
Permitir configurar:

  Segunda
  08:00 — 18:00

  Terça
  08:00 — 18:00

26. PROFISSIONAL — BLOQUEIO
TELA 28
Campos:

     • data;
     • hora inicial;
     • hora final;
     • motivo.

                                              10

27. PROFISSIONAL — HOME CARE
TELA 29
Lista de Home Care.

Mostrar:

     • horário;
     • cliente;
     • endereço;
     • serviço;
     • status.

28. PROFISSIONAL — MEU PERFIL
TELA 30
Mostrar:

     • nome;
     • telefone;
     • e-mail;
     • especialidade;
     • serviços.

29. ADMINISTRADOR — NAVEGAÇÃO
Menu principal:

  Dashboard
  Agenda
  Agendamentos
  Clientes
  Profissionais
  Serviços
  Macas
  Relatórios
  Configurações
  Sair

                        11

30. ADMINISTRADOR — DASHBOARD
TELA 40
Mostrar indicadores:

      • atendimentos hoje;
      • próximos atendimentos;
      • ocupação;
      • macas;
      • Home Care;
      • cancelamentos;
      • profissionais ativos.

31. ADMINISTRADOR — AGENDA
TELA 41
Tela operacional principal.

Visualizações:

      • dia;
      • semana;
      • mês.

32. AGENDA ADMINISTRATIVA — FILTROS
Filtros:

      • profissional;
      • cliente;
      • serviço;
      • maca;
      • modalidade;
      • status;
      • período.

                                 12

33. ADMINISTRADOR — NOVO AGENDAMENTO
TELA 42
Fluxo:

  Cliente
  ↓
  Profissional
  ↓
  Serviço
  ↓
  Modalidade
  ↓
  Data
  ↓
  Horário
  ↓
  Validação
  ↓
  Confirmação

34. ADMINISTRADOR — DETALHE DO
AGENDAMENTO
TELA 43
Mostrar todas as informações relevantes.

Ações

     • editar;
     • cancelar;
     • remanejar;
     • alterar profissional;
     • alterar maca;
     • alterar modalidade;
     • concluir;
     • registrar ausência.

                                           13

35. ADMINISTRADOR — CLIENTES
TELA 44
Lista completa.

Filtros

         • nome;
         • telefone;
         • e-mail;
         • status.

36. ADMINISTRADOR — DETALHE DO CLIENTE
TELA 45
Mostrar:

         • dados cadastrais;
         • data de nascimento;
         • contatos;
         • endereço;
         • histórico;
         • agendamentos futuros;
         • status.

37. ADMINISTRADOR — NOVO CLIENTE
TELA 46
Cadastro completo.

38. ADMINISTRADOR — PROFISSIONAIS
TELA 47
Lista:

         • nome;
         • especialidade;
         • serviços;

                                   14

      • status;
      • agenda.

39. ADMINISTRADOR — DETALHE DO
PROFISSIONAL
TELA 48
Mostrar:

      • dados;
      • serviços;
      • disponibilidade;
      • bloqueios;
      • agenda;
      • status.

40. ADMINISTRADOR — NOVO PROFISSIONAL
TELA 49
Cadastro:

      • nome;
      • e-mail;
      • telefone;
      • especialidade;
      • serviços;
      • disponibilidade.

41. ADMINISTRADOR — SERVIÇOS
TELA 50
Lista de serviços.

Mostrar:

      • nome;
      • duração;
      • preço;
      • modalidades;

                           15

     • status.

42. ADMINISTRADOR — NOVO SERVIÇO
TELA 51
Campos:

     • nome;
     • descrição;
     • duração;
     • preço;
     • presencial;
     • Home Care;
     • status.

43. ADMINISTRADOR — MACAS
TELA 52
Mostrar:

  Maca 01
  Maca 02
  Maca 03
  Maca 04
  Maca 05

Status:

     • disponível;
     • ocupada;
     • bloqueada.

44. ADMINISTRADOR — DETALHE DA MACA
TELA 53
Mostrar:

     • status;
     • atendimento atual;

                            16

      • próximos atendimentos;
      • histórico de utilização.

45. ADMINISTRADOR — RELATÓRIOS
TELA 54
Estrutura inicial:

      • atendimentos;
      • cancelamentos;
      • faltas;
      • ocupação;
      • Home Care.

Relatórios financeiros poderão ser adicionados posteriormente.

46. ADMINISTRADOR — CONFIGURAÇÕES
TELA 55
Categorias futuras:

      • dados do estabelecimento;
      • horários;
      • regras de agenda;
      • notificações;
      • usuários;
      • permissões;
      • integrações.

47. ADMINISTRADOR — HISTÓRICO/AUDITORIA
TELA 56
Mostrar:

      • usuário;
      • ação;
      • data;
      • entidade;
      • alteração.

                                                 17

48. TELAS FUTURAS
Não fazem parte obrigatoriamente do MVP.

Possíveis telas:

       • pagamentos;
       • avaliações;
       • múltiplos endereços;
       • rotas Home Care;
       • mapas;
       • notificações avançadas;
       • WhatsApp;
       • relatórios avançados;
       • gestão financeira.

49. MAPA DE NAVEGAÇÃO — CLIENTE

  LOGIN
   ↓
  DASHBOARD
   ├── NOVO AGENDAMENTO
   │       ├── SERVIÇO
   │       ├── MODALIDADE
   │       ├── PROFISSIONAL
   │       ├── DATA
   │       ├── HORÁRIO
   │       └── CONFIRMAÇÃO
   │
   ├── MEUS AGENDAMENTOS
   │       └── DETALHE
   │
   ├── HISTÓRICO
   │
   └── MEU PERFIL

50. MAPA DE NAVEGAÇÃO — PROFISSIONAL

  LOGIN
   ↓
  DASHBOARD
   ├── MINHA AGENDA
   │       └── DETALHE

                                           18

   │
   ├── NOVO AGENDAMENTO
   │
   ├── CLIENTES
   │      └── DETALHE
   │
   ├── DISPONIBILIDADE
   │
   ├── HOME CARE
   │
   └── MEU PERFIL

51. MAPA DE NAVEGAÇÃO — ADMINISTRADOR

  LOGIN
   ↓
  DASHBOARD
   ├── AGENDA
   │      └── DETALHE
   │
   ├── NOVO AGENDAMENTO
   │
   ├── CLIENTES
   │      └── DETALHE
   │
   ├── PROFISSIONAIS
   │      └── DETALHE
   │
   ├── SERVIÇOS
   │
   ├── MACAS
   │      └── DETALHE
   │
   ├── RELATÓRIOS
   │
   ├── AUDITORIA
   │
   └── CONFIGURAÇÕES

52. REGRA DE IDENTIFICAÇÃO DAS TELAS
Toda documentação visual futura deverá identificar explicitamente:

PERFIL: CLIENTE

                                                 19

ou

PERFIL: PROFISSIONAL

ou

PERFIL: ADMINISTRADOR

Nunca apresentar uma tela sem informar a qual perfil ela pertence.

53. RESPONSIVIDADE
As telas deverão funcionar em:

     • desktop;
     • tablet;
     • celular.

A experiência deverá ser adaptada para cada tamanho.

54. PRIORIDADE MOBILE
O cliente deverá possuir uma experiência especialmente boa no celular.

O profissional também deverá conseguir utilizar agenda e Home Care pelo celular.

O administrador terá maior prioridade para desktop, mas deverá possuir responsividade.

55. COMPONENTES REUTILIZÁVEIS
O sistema deverá utilizar componentes reutilizáveis:

     • botão;
     • campo;
     • seletor;
     • calendário;
     • card;
     • modal;
     • tabela;
     • agenda;
     • status;
     • alerta;
     • confirmação;
     • navegação.

                                                  20

56. PRINCÍPIO DE CONSISTÊNCIA
Uma mesma ação deverá ter comportamento semelhante em todo o sistema.

Exemplo:

Cancelar agendamento

deverá seguir o mesmo padrão visual e lógico.

57. REGRA PARA O REPLIT AGENT
Antes de criar qualquer tela:

     1. identificar o perfil;
     2. consultar este documento;
     3. consultar permissões;
     4. consultar fluxo correspondente;
     5. consultar modelo de dados;
     6. reutilizar componentes existentes;
     7. não criar uma tela duplicada sem necessidade.

58. REGRA FINAL
As telas são a representação visual das regras.

Portanto:

       A interface nunca poderá permitir uma ação que o backend não autorize.

E:

       O backend nunca deverá permitir uma ação apenas porque ela existe na interface.

                                                  21
