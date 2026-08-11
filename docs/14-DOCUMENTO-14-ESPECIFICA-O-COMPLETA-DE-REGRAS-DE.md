---
source_sequence: "14"
internal_document: "Documento 14"
source_pdf: "14 - Fluir da Vida — Especificação de Regras de Negócio.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 14 — ESPECIFICAÇÃO COMPLETA DE REGRAS DE

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 14 — ESPECIFICAÇÃO COMPLETA DE REGRAS DE
NEGÓCIO
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
Definir as regras que governam o funcionamento do Fluir da Vida.

As regras deste documento deverão ser consideradas obrigatórias durante o desenvolvimento.

Quando houver conflito entre uma tela e uma regra deste documento:

        A regra de negócio prevalece.

2. CLASSIFICAÇÃO
As regras serão identificadas como:

  RN = Regra de Negócio

Exemplo:

  RN-001

3. USUÁRIOS
RN-001 — Usuário deve possuir perfil
Todo usuário deverá possuir um perfil válido.

Perfis iniciais:

      • ADMIN;

                                                 1

     • PROFESSIONAL;
     • CLIENT.

RN-002 — E-mail único
Não poderá existir mais de um usuário ativo com o mesmo e-mail.

RN-003 — Usuário inativo
Usuário inativo não poderá realizar login.

RN-004 — Senha
Senhas nunca poderão ser armazenadas em texto puro.

4. ADMINISTRADOR
RN-005
Administrador poderá acessar funcionalidades administrativas conforme suas permissões.

RN-006
Administrador poderá:

     • cadastrar;
     • editar;
     • ativar;
     • desativar;

clientes, profissionais e serviços conforme suas permissões.

RN-007
Desativar um profissional não deverá apagar seu histórico.

                                                   2

5. CLIENTE
RN-008
Cliente poderá visualizar somente seus próprios dados.

RN-009
Cliente poderá visualizar seus próprios:

     • agendamentos;
     • histórico;
     • dados pessoais.

RN-010
Cliente não poderá acessar dados privados de outros clientes.

6. PROFISSIONAL
RN-011
Profissional poderá visualizar sua própria agenda.

RN-012
Profissional poderá visualizar informações de clientes necessárias para seus atendimentos, conforme
permissões definidas.

RN-013
Profissional não poderá acessar funcionalidades administrativas não autorizadas.

                                                     3

7. SERVIÇOS
RN-014
Todo serviço deverá possuir:

     • nome;
     • duração;
     • status.

RN-015
Serviço inativo não poderá receber novos agendamentos.

RN-016
Desativar serviço não deverá apagar agendamentos históricos.

8. PROFISSIONAIS E SERVIÇOS
RN-017
Um profissional poderá realizar vários serviços.

RN-018
Um serviço poderá ser realizado por vários profissionais.

RN-019
Profissional somente poderá ser selecionado para um serviço se estiver habilitado para executá-lo.

9. DURAÇÃO
RN-020
A duração do serviço deverá ser utilizada para calcular o horário final.

                                                     4

Exemplo:

  14:00
  +
  60 minutos
  =
  15:00

10. AGENDA
RN-021
Todo agendamento deverá possuir:

     • cliente;
     • profissional;
     • serviço;
     • modalidade;
     • início;
     • fim;
     • status.

RN-022
O horário final deverá ser calculado pelo sistema.

RN-023
O frontend não poderá definir sozinho a disponibilidade final.

11. DISPONIBILIDADE DO PROFISSIONAL
RN-024
Profissional somente poderá receber atendimento dentro de sua disponibilidade.

RN-025
Períodos bloqueados tornam o profissional indisponível.

                                                     5

RN-026
Um bloqueio deverá impedir novos agendamentos sobrepostos.

12. CONFLITO DE PROFISSIONAL
RN-027
Um profissional não poderá possuir dois atendimentos simultâneos.

RN-028
A verificação deverá considerar intervalos sobrepostos.

Exemplo:

  Atendimento A:
  10:00–11:00

  Novo atendimento:
  10:30–11:30

  Resultado:
  CONFLITO

13. MODALIDADES
RN-029
O sistema deverá possuir pelo menos:

  IN_PERSON
  HOME_CARE

RN-030
A modalidade deverá ser armazenada no agendamento.

                                                   6

14. ATENDIMENTO PRESENCIAL
RN-031
Atendimento presencial deverá respeitar a capacidade de recursos físicos.

15. CINCO MACAS
RN-032
O sistema deverá iniciar com cinco macas.

  Maca 01
  Maca 02
  Maca 03
  Maca 04
  Maca 05

RN-033
Cada maca somente poderá atender um atendimento simultaneamente.

RN-034
Um atendimento presencial deverá possuir uma maca compatível quando a operação exigir o recurso.

RN-035
Uma maca não poderá ser reservada para dois atendimentos simultâneos.

16. LIMITE DAS MACAS
RN-036
Nunca poderão existir mais de cinco atendimentos presenciais simultâneos quando existirem cinco
macas disponíveis.

                                                  7

RN-037
Se as cinco macas estiverem ocupadas:

       novos atendimentos presenciais deverão ser bloqueados.

RN-038
Atendimentos Home Care não consomem uma das cinco macas.

17. CONCORRÊNCIA
RN-039
Se dois usuários tentarem reservar simultaneamente a mesma maca, somente um poderá obter
sucesso.

RN-040
O segundo usuário deverá receber mensagem de indisponibilidade.

18. HOME CARE
RN-041
Todo Home Care deverá possuir endereço de atendimento.

RN-042
O endereço deverá estar associado ao agendamento.

RN-043
Home Care não deverá ocupar maca presencial.

RN-044
Profissional deverá estar disponível no horário do Home Care.

                                                  8

19. ENDEREÇOS
RN-045
Cliente poderá possuir mais de um endereço futuramente.

RN-046
Um endereço poderá ser definido como padrão.

20. CRIAÇÃO DE AGENDAMENTO
RN-047
Antes de confirmar um agendamento, o sistema deverá verificar:

    1. cliente;
    2. profissional;
    3. serviço;
    4. modalidade;
    5. duração;
    6. disponibilidade;
    7. bloqueios;
    8. conflitos;
    9. recurso, quando necessário;
   10. endereço, quando Home Care.

21. TRANSAÇÃO
RN-048
A confirmação do agendamento deverá ser transacional.

A verificação e gravação deverão ser protegidas contra concorrência.

                                                  9

22. DUPLICIDADE
RN-049
Uma mesma solicitação não poderá criar dois agendamentos.

23. DUPLO CLIQUE
RN-050
Clicar duas vezes em "Confirmar" não poderá criar dois registros.

24. STATUS
RN-051
Status inicial permitido:

  PENDING

ou:

  CONFIRMED

dependendo do fluxo definido.

RN-052
Fluxo operacional:

  PENDING
  ↓
  CONFIRMED
  ↓
  IN_PROGRESS
  ↓
  COMPLETED

                                                  10

RN-053
Cancelamento:

  PENDING / CONFIRMED
  ↓
  CANCELLED

RN-054
Ausência:

  CONFIRMED
  ↓
  NO_SHOW

25. ALTERAÇÃO
RN-055
Um agendamento poderá ser alterado somente se o usuário possuir permissão.

RN-056
Ao alterar data ou horário, todas as regras de disponibilidade deverão ser recalculadas.

26. REMANEJAMENTO
RN-057
Ao remanejar um atendimento:

     • horário anterior deve ser liberado;
     • novo horário deve ser validado;
     • recurso anterior deve ser liberado;
     • novo recurso deve ser reservado quando necessário.

                                                   11

27. CANCELAMENTO
RN-058
Cancelamento deverá alterar o status.

RN-059
Cancelamento deverá liberar:

     • horário do profissional;
     • maca;
     • demais recursos.

RN-060
Cancelamento não deverá apagar o registro.

28. HISTÓRICO
RN-061
Alterações importantes deverão permanecer registradas.

RN-062
O sistema deverá registrar:

     • criação;
     • alteração;
     • cancelamento;
     • conclusão;
     • ausência.

29. AUDITORIA
RN-063
Alterações administrativas importantes deverão gerar log.

                                                 12

RN-064
O log deverá registrar:

     • usuário;
     • ação;
     • entidade;
     • data/hora.

30. CLIENTE — NOVO AGENDAMENTO
RN-065
Cliente deverá conseguir iniciar um novo agendamento pelo seu dashboard.

RN-066
O sistema deverá mostrar somente opções compatíveis.

31. PROFISSIONAL — AGENDA
RN-067
Profissional deverá visualizar somente sua agenda autorizada.

32. ADMINISTRADOR — AGENDA
RN-068
Administrador deverá visualizar a agenda geral conforme suas permissões.

33. FILTROS
RN-069
Agenda administrativa deverá permitir filtros adequados.

                                                 13

Possíveis filtros:

      • data;
      • profissional;
      • cliente;
      • serviço;
      • modalidade;
      • status;
      • recurso.

34. HISTÓRICO DO CLIENTE
RN-070
Cliente poderá visualizar seus atendimentos históricos permitidos.

35. HISTÓRICO DO PROFISSIONAL
RN-071
Profissional poderá visualizar histórico relacionado à sua atuação conforme permissão.

36. SERVIÇOS INATIVOS
RN-072
Serviço inativo:

      • não aparece para novos agendamentos;
      • permanece no histórico.

37. PROFISSIONAL INATIVO
RN-073
Profissional inativo:

      • não recebe novos agendamentos;
      • permanece no histórico.

                                                  14

38. MACA INATIVA
RN-074
Maca inativa:

      • não pode ser utilizada em novos agendamentos;
      • histórico permanece preservado.

39. HORÁRIO PASSADO
RN-075
Não permitir novos agendamentos em horários já passados.

40. DURAÇÃO
RN-076
O sistema deverá impedir sobreposição considerando a duração completa do serviço.

41. INTERVALOS
Se existir futuramente intervalo entre atendimentos, este deverá ser configurável.

42. DISPONIBILIDADE
RN-077
Horário disponível deve representar uma possibilidade real de atendimento.

Não basta o profissional estar livre.

Também deverá ser considerado:

      • serviço;
      • duração;
      • modalidade;
      • recurso;
      • bloqueios.

                                                  15

43. RECURSOS FUTUROS
RN-078
A arquitetura deverá permitir recursos além das cinco macas.

Exemplos:

     • salas;
     • equipamentos;
     • cabines.

44. RELATÓRIOS
RN-079
Relatórios deverão considerar dados reais do banco.

Não utilizar números fixos ou simulados em produção.

45. DASHBOARD
RN-080
Indicadores deverão ser calculados a partir dos dados existentes.

46. SEGURANÇA
RN-081
Nenhuma informação deverá ser liberada apenas porque o usuário conhece o ID.

47. AUTORIZAÇÃO
RN-082
Toda operação protegida deverá validar autorização no backend.

                                                  16

48. VALIDAÇÃO DUPLA
RN-083
Validação poderá existir no frontend para experiência.

Mas:

       a validação definitiva deverá ocorrer no backend.

49. ERROS
RN-084
Erros técnicos não deverão ser exibidos diretamente ao cliente.

50. DADOS HISTÓRICOS
RN-085
Dados históricos relevantes não deverão ser apagados sem uma regra específica de retenção.

51. DESATIVAÇÃO
RN-086
Quando possível, preferir desativar registros em vez de excluí-los.

52. NOTIFICAÇÕES FUTURAS
RN-087
Notificações deverão estar associadas ao usuário correto.

                                                   17

53. PAGAMENTOS FUTUROS
RN-088
Pagamento deverá ser tratado como entidade própria.

Não misturar informações financeiras diretamente no agendamento.

54. MULTIUNIDADE FUTURA
RN-089
A arquitetura deverá permitir expansão futura para unidades.

55. INTELIGÊNCIA ARTIFICIAL FUTURA
RN-090
IA não poderá executar ações críticas automaticamente sem as validações do sistema.

Exemplo:

IA pode sugerir horário.

Mas:

         o backend deve confirmar a disponibilidade.

56. REGRA DE PRIORIDADE
Quando duas regras entrarem em conflito:

       1. segurança;
       2. integridade dos dados;
       3. capacidade física;
       4. disponibilidade;
       5. operação;
       6. experiência do usuário.

                                                   18

57. REGRA DE OURO
Nenhuma interface poderá permitir uma operação que o backend considere inválida.

58. REGRA DAS CINCO MACAS — RESUMO
A regra mais importante da capacidade física:

  ATENDIMENTO PRESENCIAL
          ↓
  PRECISA DE MACA
          ↓
  MACAS DISPONÍVEIS?
     ↙         ↘
   SIM               NÃO
   ↓                  ↓
  RESERVA            BLOQUEIA

59. REGRA DE HOME CARE — RESUMO

  HOME CARE
     ↓
  ENDEREÇO
     ↓
  PROFISSIONAL DISPONÍVEL?
     ↓
  SIM
     ↓
  AGENDAMENTO

Não reservar maca.

60. REGRA DE AGENDAMENTO — RESUMO

  CLIENTE
  ↓
  SERVIÇO
  ↓
  MODALIDADE
  ↓

                                                19

  PROFISSIONAL
  ↓
  DATA/HORA
  ↓
  VALIDAÇÃO
  ↓
  CONFLITOS
  ↓
  RECURSO
  ↓
  CONFIRMAÇÃO

61. REGRA DE ALTERAÇÃO — RESUMO

  ALTERAR
  ↓
  VALIDAR NOVAMENTE
  ↓
  LIBERAR RECURSO ANTIGO
  ↓
  RESERVAR NOVO RECURSO
  ↓
  SALVAR
  ↓
  HISTÓRICO

62. REGRA DE CANCELAMENTO — RESUMO

  CANCELAR
  ↓
  ALTERAR STATUS
  ↓
  LIBERAR RECURSOS
  ↓
  REGISTRAR MOTIVO
  ↓
  HISTÓRICO

63. REGRA DE CONCLUSÃO
Quando atendimento for concluído:

                                    20

  status = COMPLETED

e deverá permanecer no histórico.

64. REGRA DE AUSÊNCIA
Quando cliente não comparecer:

  status = NO_SHOW

O registro deverá permanecer no histórico.

65. REGRA DE AUDITORIA
Toda alteração administrativa relevante deverá ser rastreável.

Deverá ser possível responder:

       Quem fez?

       O que fez?

       Quando fez?

       Em qual registro?

66. REGRA DE CONSISTÊNCIA
Nunca deverá existir:

     • agendamento sem cliente;
     • agendamento sem serviço;
     • agendamento sem profissional quando o serviço exigir;
     • Home Care sem endereço;
     • recurso reservado por dois atendimentos simultâneos;
     • profissional em dois atendimentos simultâneos.

67. REGRA DE FUTURO
Funcionalidades do backlog não deverão alterar as regras fundamentais sem revisão deste documento.

                                                   21

68. CONTROLE DE ALTERAÇÕES
Qualquer alteração de regra deverá:

    1. identificar a regra;
    2. registrar nova versão;
    3. documentar o motivo;
    4. avaliar impacto;
    5. atualizar o sistema.

69. PRINCÍPIO FINAL
As telas podem mudar.

O design pode mudar.

A tecnologia pode mudar.

Mas as regras fundamentais do negócio deverão permanecer documentadas.

      O software deve obedecer às regras do Fluir da Vida — e não o contrário.

                                              22
