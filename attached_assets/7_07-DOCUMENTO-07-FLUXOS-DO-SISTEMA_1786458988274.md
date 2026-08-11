---
source_sequence: "07"
internal_document: "Documento 07"
source_pdf: "7 - Fluxos do Sistema.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 07 — FLUXOS DO SISTEMA

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 07 — FLUXOS DO SISTEMA
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
Documentar os principais fluxos do sistema para:

     • Cliente;
     • Profissional;
     • Administrador.

Cada fluxo deverá indicar:

     • início;
     • informações solicitadas;
     • validações;
     • resultado;
     • possíveis erros;
     • próximos passos.

2. PRINCÍPIO GERAL
Todo fluxo deverá seguir:

  AÇÃO
  ↓
  VALIDAÇÃO
  ↓
  PROCESSAMENTO
  ↓
  RESULTADO
  ↓
  HISTÓRICO / NOTIFICAÇÃO

                                                   1

3. FLUXO — LOGIN
Aplicável aos três perfis.

  Tela Login
  ↓
  E-mail / credencial
  ↓
  Senha / autenticação
  ↓
  Validar usuário
  ↓
  Identificar perfil
  ↓
  Carregar permissões
  ↓
  Dashboard correspondente

4. LOGIN INVÁLIDO
Se os dados estiverem incorretos:

       Não foi possível realizar o acesso. Verifique seus dados e tente novamente.

Não apresentar detalhes técnicos.

5. USUÁRIO INATIVO
Se o usuário estiver desativado:

       Seu acesso está temporariamente indisponível. Entre em contato com o atendimento.

6. FLUXO — NOVO CLIENTE
Pode ser realizado pelo próprio cliente, profissional ou administrador, conforme permissão.

  Novo cliente
  ↓
  Nome
  ↓
  Data de nascimento

                                                   2

  ↓
  Telefone
  ↓
  E-mail
  ↓
  Endereço
  ↓
  Salvar
  ↓
  Validar dados
  ↓
  Criar cliente

7. DATA DE NASCIMENTO
A data de nascimento deverá ser armazenada como campo próprio.

Não deverá ser colocada dentro de observações.

8. DUPLICIDADE DE CLIENTE
O sistema deverá procurar possíveis duplicidades.

Critérios poderão incluir:

      • e-mail;
      • telefone;
      • combinação de dados.

Se existir possível duplicidade:

       Já existe um cadastro semelhante. Deseja verificar antes de criar um novo?

A implementação poderá ser refinada posteriormente.

9. FLUXO — CLIENTE REALIZANDO
AGENDAMENTO

  Cliente
  ↓
  Novo agendamento
  ↓

                                                    3

  Escolher serviço
  ↓
  Escolher modalidade
  ↓
  Escolher profissional
  ↓
  Escolher data
  ↓
  Visualizar horários disponíveis
  ↓
  Selecionar horário
  ↓
  Validar
  ↓
  Confirmar
  ↓
  Agendamento criado

10. ESCOLHA DE SERVIÇO
O cliente verá somente serviços ativos.

Serviços inativos não deverão aparecer para novos agendamentos.

11. ESCOLHA DE MODALIDADE
Se o serviço permitir:

  Presencial
  Home Care

Se o serviço permitir apenas uma modalidade, mostrar somente a modalidade válida.

12. ESCOLHA DO PROFISSIONAL
O sistema deverá mostrar somente profissionais:

      • ativos;
      • habilitados para o serviço;
      • compatíveis com a modalidade.

                                                  4

13. ESCOLHA DA DATA
O sistema deverá mostrar datas disponíveis.

Datas sem disponibilidade poderão ser desabilitadas.

14. ESCOLHA DO HORÁRIO
O sistema deverá calcular os horários disponíveis considerando:

      • duração do serviço;
      • disponibilidade do profissional;
      • bloqueios;
      • agendamentos;
      • cliente;
      • macas, quando presencial.

15. CONFIRMAÇÃO
Antes de confirmar:

  Serviço
  Profissional
  Data
  Horário
  Modalidade

Para Home Care:

  Endereço

A maca não precisa ser apresentada ao cliente.

16. CONFIRMAÇÃO FINAL
Ao clicar:

Confirmar agendamento

o backend deverá validar novamente.

                                                  5

Somente depois:

criar o agendamento.

17. AGENDAMENTO PRESENCIAL — CLIENTE

  Cliente
  ↓
  Serviço
  ↓
  Presencial
  ↓
  Profissional
  ↓
  Data
  ↓
  Horário
  ↓
  Backend verifica profissional
  ↓
  Backend verifica cliente
  ↓
  Backend encontra maca
  ↓
  Reserva
  ↓
  Confirma

18. AGENDAMENTO HOME CARE — CLIENTE

  Cliente
  ↓
  Serviço
  ↓
  Home Care
  ↓
  Endereço
  ↓
  Profissional
  ↓
  Data
  ↓
  Horário
  ↓

                                  6

  Validar
  ↓
  Confirmar

Nenhuma maca será reservada.

19. CONFLITO NO MOMENTO DA RESERVA
Se outro usuário reservar antes:

       Este horário acabou de ser reservado. Escolha outro horário disponível.

O sistema deverá retornar à seleção de horários.

20. FLUXO — PROFISSIONAL CRIANDO
AGENDAMENTO

  Profissional
  ↓
  Novo agendamento
  ↓
  Selecionar cliente
  ↓
  Selecionar serviço
  ↓
  Escolher modalidade
  ↓
  Data
  ↓
  Horário
  ↓
  Validar
  ↓
  Confirmar

O profissional será automaticamente definido como o profissional responsável.

21. PROFISSIONAL — PRESENCIAL
O sistema deverá:

     • verificar disponibilidade;

                                                   7

     • verificar cliente;
     • encontrar maca;
     • reservar maca;
     • criar atendimento.

22. PROFISSIONAL — HOME CARE
O sistema deverá:

     • verificar disponibilidade;
     • verificar cliente;
     • solicitar/confirmar endereço;
     • criar atendimento;
     • não reservar maca.

23. FLUXO — ADMINISTRADOR CRIANDO
AGENDAMENTO

  Administrador
  ↓
  Novo agendamento
  ↓
  Selecionar cliente
  ↓
  Selecionar profissional
  ↓
  Selecionar serviço
  ↓
  Selecionar modalidade
  ↓
  Data
  ↓
  Horário
  ↓
  Validar
  ↓
  Confirmar

O administrador possui visão completa.

                                         8

24. FLUXO — ALTERAÇÃO DE AGENDAMENTO
Aplicável conforme permissão.

  Abrir agendamento
  ↓
  Editar
  ↓
  Alterar informação
  ↓
  Validar novo cenário
  ↓
  Se válido
  ↓
  Salvar
  ↓
  Registrar histórico

25. ALTERAÇÃO DE HORÁRIO
Ao alterar horário:

      • verificar profissional;
      • verificar cliente;
      • verificar maca;
      • verificar modalidade;
      • verificar disponibilidade.

26. ALTERAÇÃO DE PROFISSIONAL
Permitida ao administrador.

Fluxo:

  Agendamento
  ↓
  Alterar profissional
  ↓
  Selecionar novo profissional
  ↓
  Validar serviço
  ↓
  Validar disponibilidade

                                     9

  ↓
  Validar modalidade
  ↓
  Validar maca
  ↓
  Salvar

27. ALTERAÇÃO DE MODALIDADE
Exemplo:

  Presencial
  ↓
  Home Care

O sistema deverá:

    1. liberar a maca antiga;
    2. exigir endereço;
    3. validar disponibilidade;
    4. alterar modalidade;
    5. salvar histórico.

28. HOME CARE → PRESENCIAL
Fluxo inverso:

  Home Care
  ↓
  Presencial
  ↓
  Validar maca
  ↓
  Encontrar maca
  ↓
  Reservar
  ↓
  Remover necessidade de endereço operacional
  ↓
  Salvar

O endereço original poderá permanecer no histórico quando necessário.

                                                10

29. TROCA DE MACA

  Abrir agendamento
  ↓
  Alterar maca
  ↓
  Selecionar nova maca
  ↓
  Validar disponibilidade
  ↓
  Reservar nova maca
  ↓
  Liberar antiga
  ↓
  Salvar

30. CANCELAMENTO

  Abrir agendamento
  ↓
  Cancelar
  ↓
  Solicitar confirmação
  ↓
  Registrar motivo, quando aplicável
  ↓
  Alterar status
  ↓
  Liberar recursos
  ↓
  Registrar histórico

31. CANCELAMENTO DE PRESENCIAL
Liberar:

      • profissional;
      • cliente;
      • maca.

                                       11

32. CANCELAMENTO DE HOME CARE
Liberar:

      • profissional;
      • cliente.

Não existe maca para liberar.

33. FLUXO — REMANEJAMENTO

  Agendamento
  ↓
  Remanejar
  ↓
  Escolher novo horário
  ↓
  Validar
  ↓
  Reservar novos recursos
  ↓
  Liberar recursos antigos
  ↓
  Atualizar
  ↓
  Registrar histórico

34. REGRA DE SEGURANÇA NO REMANEJAMENTO
Não liberar o horário antigo antes da validação do novo.

Isso evita perder a reserva caso o novo horário seja inválido.

35. FLUXO — INÍCIO DO ATENDIMENTO
Profissional poderá iniciar o atendimento.

  Agendamento confirmado
  ↓
  Iniciar atendimento

                                                    12

  ↓
  Status = EM_ATENDIMENTO

36. FLUXO — CONCLUSÃO

  Em atendimento
  ↓
  Finalizar
  ↓
  Status = CONCLUÍDO
  ↓
  Registrar horário de conclusão

37. FLUXO — AUSÊNCIA
Profissional ou administrador poderá registrar:

Cliente ausente

Status:

  NO_SHOW

38. FLUXO — DISPONIBILIDADE DO
PROFISSIONAL

  Agenda
  ↓
  Disponibilidade
  ↓
  Selecionar dia
  ↓
  Definir horário inicial
  ↓
  Definir horário final
  ↓
  Salvar

                                                  13

39. FLUXO — BLOQUEIO DE HORÁRIO

  Agenda
  ↓
  Bloquear horário
  ↓
  Data
  ↓
  Hora inicial
  ↓
  Hora final
  ↓
  Motivo
  ↓
  Salvar

40. BLOQUEIO COM AGENDAMENTO EXISTENTE
O sistema deverá impedir bloqueio que gere conflito com atendimento existente, ou solicitar
tratamento explícito.

Exemplo:

      Existem atendimentos neste período. Revise a agenda antes de bloquear.

41. FLUXO — ADMINISTRADOR GERENCIANDO
PROFISSIONAL

  Profissionais
  ↓
  Novo profissional
  ↓
  Dados
  ↓
  Serviços
  ↓
  Disponibilidade
  ↓
  Salvar

                                                 14

42. FLUXO — ADMINISTRADOR GERENCIANDO
SERVIÇO

  Serviços
  ↓
  Novo serviço
  ↓
  Nome
  ↓
  Descrição
  ↓
  Duração
  ↓
  Preço
  ↓
  Modalidades
  ↓
  Salvar

43. FLUXO — PROFISSIONAL ASSOCIADO AO
SERVIÇO

  Profissional
  ↓
  Serviços
  ↓
  Selecionar serviço
  ↓
  Ativar
  ↓
  Salvar

O serviço somente deverá aparecer para agendamento quando existir profissional habilitado.

44. FLUXO — VISUALIZAÇÃO DA AGENDA
Administrador
Pode visualizar:

                                                15

  Dia
  Semana
  Mês

e filtrar:

       • profissional;
       • cliente;
       • maca;
       • serviço;
       • modalidade;
       • status.

45. PROFISSIONAL
Visualização principal:

  Hoje
  ↓
  Próximo atendimento
  ↓
  Demais atendimentos

46. CLIENTE
Visualização:

  Próximo atendimento
  ↓
  Meus agendamentos
  ↓
  Histórico

47. FLUXO — MACAS
Administrador:

  Macas
  ↓

                          16

  Selecionar maca
  ↓
  Visualizar ocupação

48. VISÃO DAS CINCO MACAS

  Maca 01
  Maca 02
  Maca 03
  Maca 04
  Maca 05

Cada uma deverá mostrar o estado atual.

49. FLUXO — NOTIFICAÇÕES FUTURAS
Após confirmação:

  Agendamento confirmado
  ↓
  Gerar notificação

Canais futuros:

      • sistema;
      • e-mail;
      • WhatsApp;
      • SMS.

A integração poderá ser implementada posteriormente.

50. FLUXO — HISTÓRICO
Toda alteração importante:

  Ação
  ↓
  Usuário
  ↓
  Data/hora
  ↓

                                               17

  Dados anteriores
  ↓
  Dados novos

51. FLUXO — CLIENTE VISUALIZANDO HISTÓRICO
O cliente poderá visualizar somente:

     • seus atendimentos;
     • datas;
     • serviços;
     • profissionais;
     • modalidade;
     • status.

52. FLUXO — PROFISSIONAL VISUALIZANDO
HISTÓRICO
O profissional poderá visualizar os atendimentos relacionados à sua atuação, conforme permissões.

53. FLUXO — ADMINISTRADOR
Administrador poderá consultar histórico global conforme necessidade operacional.

54. FLUXO DE ERRO
Qualquer erro operacional deverá seguir:

  Detectar problema
  ↓
  Impedir operação inválida
  ↓
  Explicar ao usuário
  ↓
  Sugerir solução

Exemplo:

       Não há maca disponível nesse horário. Escolha outro horário.

                                                 18

55. ERRO TÉCNICO
Nunca apresentar:

  SQL Error
  500 Internal Server Error
  Stack trace
  Database constraint failed

ao usuário final.

Registrar tecnicamente nos logs.

Apresentar mensagem amigável.

56. PRINCÍPIO UX
O sistema deverá evitar formulários desnecessariamente longos.

Sempre que possível:

       mostrar somente a próxima decisão necessária.

57. FLUXO RESUMIDO DO SISTEMA

  USUÁRIO
     ↓
  AUTENTICAÇÃO
     ↓
  PERFIL
     ↓
  PERMISSÕES
     ↓
  AÇÃO
     ↓
  VALIDAÇÃO
     ↓
  BANCO
     ↓
  HISTÓRICO

                                                19

     ↓
  NOTIFICAÇÃO

58. FLUXO CENTRAL DE AGENDAMENTO

  CLIENTE / PROFISSIONAL / ADMIN
                      ↓
                NOVO AGENDAMENTO
                      ↓
                   SERVIÇO
                      ↓
                  MODALIDADE
             ↙               ↘
      PRESENCIAL               HOME CARE
           ↓                       ↓
      PROFISSIONAL             ENDEREÇO
            ↓                       ↓
           DATA                   DATA
            ↓                       ↓
          HORÁRIO                HORÁRIO
           ↓                        ↓
      VALIDAR                    VALIDAR
            ↓                       ↓
          MACA                   SEM MACA
           ↘                 ↙
                CONFIRMAR
                   ↓
              AGENDAMENTO

59. PRINCÍPIO FINAL
Todos os perfis utilizam o mesmo motor de agenda.

O que muda é:

       quem pode executar cada ação e quais informações pode visualizar.

Isso evita criar três sistemas diferentes e facilita manutenção e evolução.

                                                    20

60. REGRA PARA O REPLIT AGENT
Antes de implementar qualquer fluxo:

    1. consultar este documento;
    2. consultar Regras de Negócio;
    3. consultar Perfis e Permissões;
    4. consultar Modelo de Dados;
    5. consultar Agenda e Macas;
    6. implementar;
    7. testar o fluxo completo;
    8. testar cenários de erro;
    9. registrar alterações.

O Agent não deverá criar fluxos paralelos que contradigam estes documentos.

                                                21
