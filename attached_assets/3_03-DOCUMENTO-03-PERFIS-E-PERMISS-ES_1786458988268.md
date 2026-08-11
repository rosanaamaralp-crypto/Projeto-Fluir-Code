---
source_sequence: "03"
internal_document: "Documento 03"
source_pdf: "3 - Perfis e Permissões.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 03 — PERFIS E PERMISSÕES

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 03 — PERFIS E PERMISSÕES
Versão: 1.0
Status: Regra oficial do sistema
Prioridade: CRÍTICA

1. OBJETIVO
Definir exatamente o que cada perfil pode:

     • visualizar;
     • criar;
     • editar;
     • cancelar;
     • excluir;
     • administrar.

O sistema possui três perfis:

    1. Administrador;
    2. Profissional;
    3. Cliente.

2. PRINCÍPIO DE SEGURANÇA
A interface não será a responsável por garantir segurança.

Mesmo que determinado botão não apareça para um usuário, o backend deverá impedir o acesso à
operação.

Portanto:

       Toda permissão deverá ser validada no servidor.

3. MATRIZ GERAL
                   Funcionalidade            Administrador   Profissional   Cliente

                   Dashboard                            ✅             ✅         ✅

                                                  1

                  Funcionalidade             Administrador      Profissional    Cliente

                  Própria agenda                         ✅                 ✅       ✅*

                  Todas as agendas                       ✅                 ❌        ❌

                  Clientes                               ✅               ✅**        ❌

                  Profissionais                          ✅           👁️***      👁️***

                  Serviços                               ✅                 👁️       👁️

                  Macas                                  ✅                 👁️       ❌

                  Disponibilidade                        ✅                 ✅        ❌

                  Agendamentos                           ✅                 ✅        ✅

                  Criar agendamento                      ✅                 ✅        ✅

                  Alterar agendamento                    ✅                 ✅        ✅

                  Cancelar agendamento                   ✅                 ✅        ✅

                  Home Care                              ✅                 ✅        ✅

                  Relatórios                             ✅          🔒****           ❌

                  Configurações                          ✅               ⚙️*        ❌

                  Usuários                               ✅                 ❌        ❌

Legenda

* Cliente visualiza somente seus próprios agendamentos.

** Profissional visualiza clientes relacionados aos seus atendimentos.

*** Somente informações necessárias para o atendimento/agendamento.

**** Relatórios específicos do profissional poderão existir futuramente.

***** O profissional poderá alterar somente configurações permitidas para seu perfil.

4. ADMINISTRADOR
O administrador possui o maior nível de acesso.

Pode visualizar
     • todos os clientes;
     • todos os profissionais;
     • todos os serviços;

                                                   2

        • todas as agendas;
        • todas as macas;
        • todos os agendamentos;
        • Home Care;
        • relatórios;
        • configurações.

5. ADMINISTRADOR — CLIENTES
Pode:

        • criar;
        • visualizar;
        • editar;
        • ativar;
        • desativar;
        • pesquisar;
        • consultar histórico;
        • visualizar agendamentos;
        • criar agendamento para o cliente.

6. ADMINISTRADOR — PROFISSIONAIS
Pode:

        • criar profissional;
        • editar;
        • ativar;
        • desativar;
        • definir serviços;
        • visualizar disponibilidade;
        • alterar disponibilidade;
        • bloquear horários;
        • visualizar agenda;
        • criar agendamentos.

7. ADMINISTRADOR — SERVIÇOS
Pode:

        • criar;
        • editar;
        • ativar;
        • desativar;

                                              3

        • definir duração;
        • definir preço;
        • associar profissionais.

8. ADMINISTRADOR — MACAS
Pode:

        • visualizar cinco macas;
        • ativar/desativar maca;
        • visualizar ocupação;
        • visualizar profissional;
        • visualizar cliente;
        • visualizar horário;
        • realizar alterações necessárias para a operação.

9. ADMINISTRADOR — AGENDA
Possui visão global.

Pode filtrar:

        • profissional;
        • cliente;
        • serviço;
        • data;
        • horário;
        • maca;
        • modalidade;
        • status.

10. ADMINISTRADOR — AGENDAMENTO
Pode:

        • criar;
        • editar;
        • cancelar;
        • remanejar;
        • concluir;
        • marcar ausência;
        • alterar profissional;
        • alterar maca;
        • alterar modalidade.

                                                      4

Todas as alterações devem respeitar as regras de conflito.

11. PROFISSIONAL
O profissional possui autonomia operacional, mas não possui controle administrativo total.

12. PROFISSIONAL — AGENDA
Pode:

        • visualizar sua agenda;
        • visualizar dia;
        • visualizar semana;
        • visualizar mês;
        • criar disponibilidade;
        • editar disponibilidade;
        • bloquear horários;
        • visualizar atendimentos.

Não pode visualizar a agenda completa de outros profissionais.

13. PROFISSIONAL — CLIENTES
Pode:

        • cadastrar cliente;
        • visualizar clientes relacionados aos seus atendimentos;
        • editar informações permitidas;
        • consultar histórico necessário;
        • criar agendamento para cliente.

Não poderá acessar clientes sem relação operacional quando essa restrição estiver configurada.

14. PROFISSIONAL — AGENDAMENTO
Pode criar:

Para si mesmo

Selecionando:

        • cliente;
        • serviço;

                                                      5

        • horário;
        • modalidade.

Presencial

O sistema atribui uma maca disponível.

Home Care

O sistema solicita endereço.

15. PROFISSIONAL — ALTERAÇÃO
Pode alterar seus próprios atendimentos conforme as regras do sistema.

Pode:

        • mudar horário;
        • mudar serviço;
        • alterar modalidade;
        • alterar maca quando permitido;
        • alterar observações.

A troca de profissional deverá ser restrita ao administrador, salvo regra futura específica.

16. PROFISSIONAL — CANCELAMENTO
Pode cancelar atendimentos sob sua responsabilidade.

O sistema deverá:

        • registrar o cancelamento;
        • liberar horário;
        • liberar maca;
        • registrar histórico.

17. PROFISSIONAL — MACAS
Pode visualizar:

        • maca atribuída;
        • horário;
        • cliente;
        • status.

                                                     6

Não deve necessariamente administrar o cadastro das macas.

Exemplo:

Pode visualizar:

         Maca 03 — 15:00 — Maria Silva

Mas não pode:

         excluir Maca 03.

18. PROFISSIONAL — HOME CARE
Pode:

        • criar atendimento Home Care;
        • visualizar seus Home Care;
        • alterar;
        • cancelar;
        • visualizar endereço;
        • organizar sua agenda.

Não deverá visualizar dados de Home Care de outros profissionais sem permissão.

19. CLIENTE
O cliente possui acesso extremamente restrito.

Seu objetivo é:

         Agendar e acompanhar seus próprios atendimentos.

20. CLIENTE — CADASTRO
Pode cadastrar:

        • nome;
        • data de nascimento;
        • telefone;
        • e-mail;
        • endereço;
        • senha/autenticação.

                                                 7

Pode atualizar seus dados permitidos.

21. CLIENTE — AGENDAMENTO
Pode:

        • visualizar serviços disponíveis;
        • visualizar profissionais disponíveis;
        • visualizar horários;
        • escolher horário;
        • confirmar atendimento.

Não escolhe a maca.

22. CLIENTE — MACA
O cliente não precisa saber qual maca será utilizada.

A maca é um recurso interno do espaço.

O sistema poderá eventualmente apresentar:

         Atendimento presencial confirmado.

Sem expor:

         Maca 03.

Isso é uma decisão de experiência e poderá ser alterado futuramente.

23. CLIENTE — HOME CARE
O cliente poderá selecionar atendimento Home Care quando essa modalidade estiver disponível.

O sistema deverá:

        • solicitar endereço;
        • verificar disponibilidade;
        • mostrar profissionais compatíveis;
        • mostrar horários disponíveis.

                                                    8

24. CLIENTE — MEUS AGENDAMENTOS
O cliente poderá visualizar:

     • próximos atendimentos;
     • atendimentos anteriores;
     • status;
     • profissional;
     • serviço;
     • data;
     • horário;
     • modalidade.

25. CLIENTE — ALTERAÇÃO
Pode alterar seus próprios agendamentos, respeitando as regras configuradas.

Exemplo:

       Alterar horário.

O sistema verifica novamente a disponibilidade.

26. CLIENTE — CANCELAMENTO
Pode cancelar seus próprios agendamentos dentro das regras estabelecidas.

O cancelamento deverá ser registrado.

27. CLIENTE — RESTRIÇÕES
Não pode:

     • visualizar outros clientes;
     • visualizar agenda interna;
     • visualizar macas;
     • visualizar relatórios;
     • alterar profissional;
     • administrar serviços;
     • administrar usuários;
     • alterar configurações administrativas.

                                                  9

28. EXCLUSÃO
Por segurança, registros importantes não deverão ser simplesmente excluídos.

Preferir:

Desativação lógica.

Exemplo:

  status = INACTIVE

Isso preserva histórico.

29. EXCLUSÃO DE AGENDAMENTO
Agendamento não deverá ser fisicamente apagado.

Deverá mudar de estado:

  CANCELLED

E permanecer no histórico.

30. PERMISSÕES FUTURAS
A arquitetura deverá permitir futuramente permissões mais específicas.

Exemplo:

  ADMIN
  MANAGER
  PROFESSIONAL
  RECEPTIONIST
  CLIENT

Também poderá permitir permissões granulares.

                                                 10

31. RECEPÇÃO — FUTURO
Embora não faça parte dos três perfis iniciais, a arquitetura deverá permitir futuramente um perfil:

Recepção

Com acesso a:

     • clientes;
     • agenda;
     • agendamento;
     • cancelamento;
     • macas.

Mas sem acesso a:

     • configurações;
     • usuários;
     • relatórios financeiros.

32. AUTORIZAÇÃO NO BACKEND
Cada operação deverá possuir autorização.

Exemplo conceitual:

  POST /appointments

O servidor deverá verificar:

  usuário autenticado?
  ↓
  qual perfil?
  ↓
  pode criar agendamento?
  ↓
  qual profissional?
  ↓
  qual cliente?
  ↓
  qual recurso?
  ↓
  há conflito?

                                                   11

  ↓
  criar

33. REGRA CRÍTICA
Nunca confiar em dados enviados pelo navegador.

Mesmo que o usuário envie:

  role = ADMIN

o servidor deverá utilizar a função real armazenada no sistema.

34. AUDITORIA
Operações administrativas importantes deverão registrar:

     • usuário;
     • ação;
     • data;
     • entidade;
     • registro alterado;
     • valor anterior;
     • valor posterior.

35. PRINCÍPIO DE MENOR PRIVILÉGIO
Cada usuário deverá possuir somente o acesso necessário para executar sua função.

Isso reduz riscos e protege os dados.

36. REGRA PARA O REPLIT AGENT
O Agent deverá tratar este documento como regra de segurança.

Nunca:

     • ampliar permissões automaticamente;
     • permitir acesso cruzado entre clientes;
     • permitir profissional administrar outro profissional sem autorização;

                                                  12

     • permitir cliente acessar dados internos;
     • confiar somente na interface para bloquear funções.

Qualquer alteração de permissão deverá ser previamente discutida e aprovada.

37. RESUMO
ADMINISTRADOR

Controla o espaço.

PROFISSIONAL

Controla sua agenda e seus atendimentos.

CLIENTE

Controla seus próprios agendamentos.

Essa separação deverá permanecer como princípio fundamental do sistema.

                                                 13
