---
source_sequence: "01"
internal_document: "Documento 02"
source_pdf: "1 - Fluir da Vida — Regras de Negócio.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 02 — REGRAS DE NEGÓCIO

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 02 — REGRAS DE NEGÓCIO
Versão: 1.0
Status: Base oficial para desenvolvimento
Prioridade: Alta

1. PRINCÍPIO FUNDAMENTAL
   O sistema deverá facilitar o agendamento sem transferir a complexidade operacional para o usuário.

A regra geral é:

       O usuário informa o que deseja; o sistema resolve a disponibilidade.

2. PERFIS
Existem três perfis:

      • Administrador;
      • Profissional;
      • Cliente.

Cada perfil possui permissões diferentes.

Nenhum usuário poderá acessar informações que não estejam dentro de sua permissão.

3. CLIENTE
   O cliente poderá:

   • criar sua conta;
   • cadastrar seus dados;
   • informar data de nascimento;
   • visualizar serviços;
   • visualizar profissionais disponíveis;
   • consultar horários;
   • realizar agendamentos;
   • alterar seus agendamentos;
   • cancelar seus agendamentos;
   • consultar histórico.

                                                 1

O cliente somente poderá visualizar seus próprios dados e atendimentos.

4. PROFISSIONAL
   O profissional poderá:

   • cadastrar sua disponibilidade;
   • bloquear horários;
   • visualizar sua agenda;
   • cadastrar clientes;
   • visualizar seus clientes;
   • criar agendamentos;
   • alterar agendamentos;
   • cancelar agendamentos;
   • remanejar atendimentos;
   • realizar atendimentos presenciais;
   • realizar Home Care.

O profissional não poderá alterar informações administrativas que pertençam exclusivamente ao
administrador.

5. ADMINISTRADOR
   O administrador terá visão completa.

Poderá:

     • gerenciar profissionais;
     • gerenciar clientes;
     • gerenciar serviços;
     • gerenciar agendas;
     • visualizar todas as agendas;
     • criar agendamentos;
     • alterar;
     • cancelar;
     • remanejar;
     • controlar as cinco macas;
     • gerenciar configurações;
     • consultar relatórios.

6. AGENDAMENTO
Todo agendamento deverá possuir:

     • cliente;

                                                 2

     • profissional;
     • serviço;
     • data;
     • horário;
     • modalidade;
     • status.

Para atendimento presencial:

     • maca.

Para Home Care:

     • endereço.

7. ATENDIMENTO PRESENCIAL
Um atendimento presencial somente poderá ser confirmado quando houver:

    1. profissional disponível;
    2. horário disponível;
    3. serviço compatível;
    4. maca disponível;
    5. ausência de conflito.

8. HOME CARE
Um atendimento Home Care:

     • possui profissional;
     • possui cliente;
     • possui serviço;
     • possui horário;
     • possui endereço;
     • não utiliza maca.

9. CINCO MACAS
Existem cinco recursos:

     • Maca 01;
     • Maca 02;
     • Maca 03;
     • Maca 04;
     • Maca 05.

                                              3

Uma maca não pode possuir dois atendimentos simultâneos.

10. RESERVA AUTOMÁTICA DA MACA
    O cliente não precisa escolher a maca.

O sistema deverá identificar automaticamente uma maca disponível.

Caso várias estejam livres, o sistema poderá selecionar uma conforme a estratégia definida.

A administração e o profissional poderão visualizar qual maca foi atribuída.

11. CONFLITO DE PROFISSIONAL
    Um profissional não poderá possuir dois atendimentos simultâneos.

Exemplo:

14:00 — Maria
Profissional: Ana

14:00 — João
Profissional: Ana

O segundo atendimento deverá ser bloqueado.

12. CONFLITO DE MACA
    Uma maca não poderá ser utilizada simultaneamente.

Exemplo:

Maca 03
14:00 — Maria

Novo atendimento:

Maca 03
14:00 — João

                                                    4

Deverá ser rejeitado.

13. DURAÇÃO
    Cada serviço possuirá uma duração.

Exemplo:

Atendimento Individual
50 minutos

O sistema utilizará a duração para determinar o período ocupado.

14. INTERVALOS
    O sistema deverá considerar o tempo necessário entre atendimentos quando essa regra estiver
    configurada.

Isso será especialmente importante para Home Care.

15. DISPONIBILIDADE DO PROFISSIONAL
    O profissional poderá cadastrar:

    • dias;
    • horários;
    • recorrência;
    • bloqueios.

Exemplo:

Segunda
08:00 — 18:00

Terça
08:00 — 18:00

Quarta
14:00 — 20:00

                                                 5

16. BLOQUEIO DE HORÁRIO
Um profissional poderá bloquear:

      • horário;
      • período;
      • dia inteiro.

Motivos possíveis:

      • férias;
      • compromisso;
      • reunião;
      • indisponibilidade.

17. ALTERAÇÃO
Ao alterar um agendamento, o sistema deverá executar novamente todas as validações.

Não basta verificar apenas o novo horário.

Deverá verificar:

      • profissional;
      • serviço;
      • maca;
      • modalidade;
      • horário.

18. CANCELAMENTO
O cancelamento deverá alterar o status do agendamento.

O registro histórico deverá permanecer.

O horário e a maca deverão voltar a ficar disponíveis.

19. REMANEJAMENTO
    Ao remanejar um atendimento, o sistema deverá liberar os recursos antigos somente depois de validar
    os novos recursos.

Isso evita inconsistências.

                                                    6

20. HISTÓRICO
Toda alteração importante deverá registrar:

     • usuário que realizou;
     • data;
     • horário;
     • ação;
     • valor anterior;
     • novo valor, quando aplicável.

21. STATUS
Estados possíveis:

     • Disponível;
     • Pendente;
     • Confirmado;
     • Em atendimento;
     • Concluído;
     • Cancelado;
     • Ausente;
     • Bloqueado.

22. PRIVACIDADE
Cliente não poderá visualizar:

     • outros clientes;
     • agendas internas completas;
     • ocupação das macas;
     • informações administrativas.

Profissional poderá visualizar somente os dados necessários para seus atendimentos.

Administrador terá acesso completo conforme suas permissões.

23. REGRA DE OURO
    O sistema nunca deverá permitir:

    Conflito de profissional + horário.

                                                 7

E nunca deverá permitir:

       Conflito de maca + horário.

Essas são regras críticas.

24. REGRA DE PRECEDÊNCIA
    Quando duas pessoas tentarem reservar o mesmo horário simultaneamente:

    1.  o sistema deverá processar a primeira reserva válida;
    2.  a segunda deverá ser rejeitada;
    3.  o usuário deverá receber uma mensagem clara;
    4.  o sistema deverá sugerir outros horários disponíveis.

25. MENSAGENS
    As mensagens deverão ser humanas.

Exemplo:

       Este horário acabou de ser reservado. Escolha outro horário.

Nunca apresentar mensagens técnicas ao usuário final.

26. REGRA PARA NOVOS RECURSOS
    Qualquer nova funcionalidade deverá respeitar:

    • permissões;
    • agenda;
    • conflitos;
    • histórico;
    • privacidade;
    • experiência simples.

27. REGRA PARA O DESENVOLVIMENTO
    Nenhuma regra deste documento deverá ser alterada pelo Agent sem autorização.

                                                    8

Se existir conflito entre uma solicitação futura e este documento, o Agent deverá:

    1. identificar o conflito;
    2. explicar;
    3. aguardar decisão.

                                                   9
