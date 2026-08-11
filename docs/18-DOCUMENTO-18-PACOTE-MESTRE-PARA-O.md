---
source_sequence: "18"
internal_document: "Documento 18"
source_pdf: "18 - Fluir da Vida — Pacote Mestre para o Replit.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 18 — PACOTE MESTRE PARA O

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL

DOCUMENTO 18 — PACOTE MESTRE PARA O
REPLIT
Versão: 1.0
Status: Base oficial para implementação
Objetivo: Servir como fonte operacional para o desenvolvimento no Replit

1. REGRA ABSOLUTA
   Este documento é uma consolidação dos documentos oficiais do projeto.

O Replit Agent deverá:

     • seguir este documento;
     • respeitar as regras de negócio;
     • não inventar funcionalidades;
     • não alterar decisões já aprovadas sem autorização;
     • trabalhar por etapas;
     • executar testes antes de avançar.

2. OBJETIVO DO SISTEMA
Construir uma plataforma de gestão de atendimentos do Fluir da Vida, permitindo administrar:

     • clientes;
     • profissionais;
     • serviços;
     • disponibilidade;
     • agendamentos;
     • atendimentos presenciais;
     • Home Care;
     • cinco recursos/macas;
     • cancelamentos;
     • remarcações;
     • histórico;
     • notificações;
     • relatórios;
     • auditoria.

                                                  1

3. PERFIS
Existem três perfis principais:

ADMINISTRADOR
PROFISSIONAL
CLIENTE

Cada perfil possui permissões próprias.

4. REGRA DE SEGURANÇA
   Nunca confiar apenas na interface para controlar permissões.

Toda operação deverá ser validada no backend.

5. ARQUITETURA
   Arquitetura lógica:

┌──────────────────────────┐
│ FRONTEND │
│ │
│ Telas / Componentes │
└────────────┬─────────────┘
│
↓
┌──────────────────────────┐
│ API │
│ │
│ Controllers / Routes │
└────────────┬─────────────┘
│
↓
┌──────────────────────────┐
│ REGRAS DE NEGÓCIO │
│ │
│ Services / Domain │
└────────────┬─────────────┘
│
↓
┌──────────────────────────┐

                                                 2

│ BANCO │
└──────────────────────────┘

6. PRINCÍPIO ARQUITETURAL
   Não colocar regras críticas diretamente nos componentes da interface.

Exemplo:

Errado:

Tela decide se uma maca está disponível.

Correto:

Tela
↓
API
↓
Regra de disponibilidade
↓
Banco

7. DOMÍNIO PRINCIPAL
   Os principais módulos serão:

Authentication
Users
Clients
Professionals
Services
Availability
Resources
Appointments
Notifications
Reports
Audit

                                                  3

8. BANCO DE DADOS
Estrutura inicial:

users
roles
clients
professionals
services
professional_services
addresses
availability
blocked_periods
resources
appointments
appointment_status_history
notifications
audit_logs

9. RECURSOS
   O sistema começa com cinco macas:

Maca 01
Maca 02
Maca 03
Maca 04
Maca 05

Esses recursos serão utilizados nos atendimentos presenciais.

10. MODALIDADES
    Existem duas modalidades principais:

IN_PERSON
HOME_CARE

                                                  4

11. ATENDIMENTO PRESENCIAL
Fluxo:

Serviço
↓
Profissional
↓
Data
↓
Horário
↓
Verificar maca
↓
Reservar maca
↓
Criar agendamento

12. HOME CARE
    Fluxo:

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
Criar agendamento

Não utilizar maca.

13. REGRA MAIS IMPORTANTE DA AGENDA
    Um horário somente é válido quando:

                                      5

PROFISSIONAL DISPONÍVEL +
SERVIÇO ATIVO +
PROFISSIONAL HABILITADO +
SEM BLOQUEIO +
SEM CONFLITO +
RECURSO DISPONÍVEL

No Home Care:

RECURSO DISPONÍVEL

não é necessário.

14. DURAÇÃO
    A duração deverá vir do serviço.

O frontend não deverá ser a fonte definitiva da duração.

15. AGENDAMENTO
    O backend deverá validar novamente tudo no momento da criação.

Nunca confiar apenas no horário previamente mostrado na tela.

16. CONCORRÊNCIA
    Se dois clientes tentarem reservar simultaneamente:

Cliente A ─┐
├── mesmo horário
Cliente B ─┘

somente uma operação poderá vencer.

A segunda deverá receber conflito.

                                                   6

17. CAPACIDADE DAS MACAS
Para atendimento presencial:

1 maca → 1 atendimento simultâneo

Com cinco macas:

5 atendimentos simultâneos

O sexto deverá ser bloqueado quando não houver outra capacidade disponível.

18. STATUS DO AGENDAMENTO
    Utilizar estados claros.

Exemplo:

CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
NO_SHOW

Os estados finais deverão seguir exatamente as regras do domínio.

19. HISTÓRICO
    Alterações importantes deverão gerar histórico.

Exemplo:

Agendado
↓
Remarcado
↓
Iniciado
↓
Concluído

                                                  7

20. AUDITORIA
Ações administrativas relevantes deverão gerar auditoria.

Registrar:

usuário
ação
entidade
registro
data/hora

21. API
    Estrutura inicial:

/api/auth
/api/users
/api/clients
/api/professionals
/api/services
/api/availability
/api/resources
/api/appointments
/api/notifications
/api/reports
/api/audit-logs

22. ENDPOINTS PRINCIPAIS

POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

GET /api/clients
POST /api/clients
GET /api/clients/:id
PATCH /api/clients/:id

GET /api/professionals
POST /api/professionals

                                                  8

GET /api/professionals/:id
PATCH /api/professionals/:id

GET /api/services
POST /api/services
PATCH /api/services/:id

GET /api/resources
GET /api/resources/status

GET /api/appointments
GET /api/appointments/:id
POST /api/appointments
PATCH /api/appointments/:id

POST /api/appointments/:id/cancel
POST /api/appointments/:id/start
POST /api/appointments/:id/complete
POST /api/appointments/:id/no-show

GET /api/appointments/available-slots

23. TELAS ADMINISTRATIVAS

Dashboard
Agenda
Clientes
Profissionais
Serviços
Recursos
Relatórios
Auditoria
Configurações

24. TELAS PROFISSIONAIS

Dashboard
Minha Agenda
Atendimento
Clientes
Disponibilidade
Bloqueios

                                         9

Notificações
Meu Perfil

25. TELAS CLIENTE

Dashboard
Novo Agendamento
Meus Agendamentos
Histórico
Meus Endereços
Meu Perfil
Notificações

26. FLUXO CLIENTE

Login
↓
Dashboard
↓
Novo Agendamento
↓
Serviço
↓
Modalidade
↓
Profissional
↓
Data
↓
Horário
↓
Confirmação
↓
Agendamento

27. FLUXO ADMINISTRADOR

Login
↓
Dashboard

                     10

↓
Agenda
↓
Gerenciamento
↓
Clientes
Profissionais
Serviços
Recursos
↓
Relatórios

28. FLUXO PROFISSIONAL

Login
↓
Dashboard
↓
Minha Agenda
↓
Atendimento
↓
Iniciar
↓
Concluir

29. DESIGN
    A interface deverá seguir o Design System aprovado nos documentos anteriores.

Prioridades:

     • clareza;
     • simplicidade;
     • consistência;
     • responsividade;
     • acessibilidade.

30. ESTADOS DE INTERFACE
Toda tela deverá tratar:

                                                11

LOADING
EMPTY
SUCCESS
ERROR

31. RESPONSIVIDADE
    Obrigatório:

Desktop
Notebook
Tablet
Celular

32. TECNOLOGIA
    A stack definitiva deverá ser escolhida no início do projeto considerando:

    • compatibilidade com Replit;
    • facilidade de manutenção;
    • banco relacional;
    • autenticação;
    • testes;
    • escalabilidade.

Não mudar a stack no meio do projeto sem decisão registrada.

33. ESTRUTURA DE PASTAS
    A estrutura final deverá separar:

frontend
backend
database
shared
tests
docs

A nomenclatura concreta poderá ser adaptada à stack escolhida.

                                                   12

34. SERVIÇOS DE DOMÍNIO
Criar serviços específicos para regras importantes:

AppointmentService
AvailabilityService
ResourceService
NotificationService
AuditService

35. APPOINTMENT SERVICE
    Responsável por:

    • criar;
    • alterar;
    • cancelar;
    • iniciar;
    • concluir;
    • ausência;
    • validar conflitos.

36. AVAILABILITY SERVICE
    Responsável por:

    • disponibilidade;
    • bloqueios;
    • horários;
    • conflitos;
    • duração.

37. RESOURCE SERVICE
    Responsável por:

    • disponibilidade das macas;
    • ocupação;
    • reserva;
    • liberação.

                                                      13

38. NOTIFICATION SERVICE
    Responsável por gerar notificações internas.

39. AUDIT SERVICE
    Responsável pelo registro das ações auditáveis.

40. FASES DE DESENVOLVIMENTO
    FASE 1
    Fundação.

FASE 2
Banco.

FASE 3
Autenticação.

FASE 4
Permissões.

FASE 5
Clientes.

FASE 6
Profissionais.

FASE 7
Serviços.

FASE 8
Disponibilidade.

                                                  14

FASE 9
Recursos.

FASE 10
Agendamento.

FASE 11
Cancelamento.

FASE 12
Remarcação.

FASE 13
Admin.

FASE 14
Profissional.

FASE 15
Cliente.

FASE 16
Home Care.

FASE 17
Dashboards.

FASE 18
Relatórios.

FASE 19
Auditoria.

                15

FASE 20
Notificações.

FASE 21
Testes.

FASE 22
Segurança.

FASE 23
Performance.

FASE 24
Produção.

41. REGRA DE CHECKPOINT
    Depois de cada fase:

IMPLEMENTAR
↓
TESTAR
↓
CORRIGIR
↓
VALIDAR
↓
APROVAR

Somente então avançar.

42. PRIMEIRO PROMPT PARA O REPLIT
    O primeiro prompt não deverá pedir funcionalidades.

Deverá pedir análise e preparação.

                                                16

43. PROMPT 01 — ANÁLISE DO PROJETO
Copiar para o Replit Agent:

Você será o agente responsável pelo desenvolvimento do sistema Fluir da Vida.

Antes de escrever qualquer código, analise cuidadosamente a documentação
oficial do projeto.

Objetivo desta etapa:

1. entender a arquitetura;
2. identificar a stack mais adequada para execução no Replit;
3. propor a estrutura inicial do projeto;
4. identificar dependências necessárias;
5. identificar riscos técnicos;
6. identificar informações que estejam realmente ausentes.

IMPORTANTE:

- Não implemente funcionalidades ainda.
- Não crie telas ainda.
- Não altere regras de negócio.
- Não invente requisitos.
- Não simplifique regras críticas.
- Não avance para a próxima etapa.

Ao final, apresente:

1. stack recomendada;
2. arquitetura proposta;
3. estrutura de pastas;
4. dependências;
5. estratégia de banco;
6. estratégia de autenticação;
7. estratégia de testes;
8. dúvidas que realmente impedem a implementação.

Aguarde aprovação antes de implementar.

44. APROVAÇÃO DA FASE 1
    Depois que o Agent responder, revisar.

Não aceitar automaticamente.

                                         17

Verificar:

      • stack;
      • banco;
      • arquitetura;
      • segurança;
      • estrutura.

45. PROMPT 02 — FUNDAÇÃO
Depois da aprovação:

Implemente somente a fundação técnica aprovada.

Crie:

- estrutura de pastas;
- configuração do projeto;
- configuração do banco;
- variáveis de ambiente;
- sistema de migrations;
- configuração de testes;
- configuração de lint;
- configuração básica de desenvolvimento.

Não implemente:

- telas;
- agenda;
- clientes;
- profissionais;
- serviços;
- autenticação completa.

Execute os testes.

Ao final informe:

1. arquivos criados;
2. comandos executados;
3. testes realizados;
4. resultado;
5. problemas encontrados.

Não avance além do escopo.

                                       18

46. PROMPT 03 — BANCO

Implemente somente o banco de dados conforme a documentação oficial.

Crie as tabelas e relacionamentos necessários para:

- usuários;
- perfis;
- clientes;
- profissionais;
- serviços;
- relação profissional/serviço;
- endereços;
- disponibilidade;
- bloqueios;
- recursos;
- agendamentos;
- histórico;
- notificações;
- auditoria.

Crie migrations.

Crie seed de desenvolvimento com:

- 1 administrador;
- 1 profissional;
- 1 cliente;
- 5 macas;
- serviços de teste.

Não implemente telas.

Não invente campos que não sejam necessários.

Execute migrations e testes.

47. PROMPT 04 — AUTENTICAÇÃO

Implemente somente autenticação e autorização.

Criar:

- login;
- logout;
- sessão;

                                     19

- usuário atual;
- proteção de rotas;
- controle por perfil.

Perfis:

ADMIN
PROFESSIONAL
CLIENT

Testar acesso autorizado e não autorizado.

Não implemente agenda ou outras funcionalidades.

48. PROMPT 05 — CLIENTES

Implemente o módulo de clientes.

Inclua:

- API;
- regras;
- validações;
- CRUD;
- permissões;
- interface administrativa;
- interface necessária para o cliente.

Não implemente agenda ainda.

Execute testes.

49. PROMPT 06 — PROFISSIONAIS

Implemente o módulo de profissionais.

Inclua:

- cadastro;
- edição;
- status;
- especialidade;
- serviços associados;
- API;

                                        20

- permissões;
- interface administrativa.

Não implemente o motor de agendamento ainda.

Execute testes.

50. PROMPT 07 — SERVIÇOS

Implemente o módulo de serviços.

Cada serviço deverá possuir:

- nome;
- descrição;
- duração;
- preço;
- modalidade;
- status.

Implemente:

- API;
- CRUD;
- validações;
- interface administrativa;
- associação com profissionais.

Serviços inativos não devem aparecer para novos agendamentos.

Execute testes.

51. PROMPT 08 — DISPONIBILIDADE

Implemente o módulo de disponibilidade profissional.

Inclua:

- horários;
- dias;
- bloqueios;
- consultas de disponibilidade.

Crie o AvailabilityService.

                                     21

Não implemente ainda a criação definitiva de agendamentos.

Execute testes para:

- profissional disponível;
- profissional indisponível;
- bloqueio;
- conflito.

52. PROMPT 09 — RECURSOS

Implemente o gerenciamento dos cinco recursos/macas.

Criar:

Maca 01
Maca 02
Maca 03
Maca 04
Maca 05

Implementar:

- status;
- disponibilidade;
- ocupação;
- reserva;
- liberação.

Preparar o módulo para integração com agendamentos.

Execute testes.

53. PROMPT 10 — MOTOR DE AGENDAMENTO

Agora implemente o motor principal de agendamento.

Criar AppointmentService.

Ele deverá validar:

1. cliente;
2. serviço;

                                     22

3. profissional;
4. modalidade;
5. disponibilidade;
6. duração;
7. bloqueios;
8. conflitos;
9. recurso;
10. endereço para Home Care.

O backend deverá ser a fonte definitiva da verdade.

O frontend nunca poderá reservar diretamente.

Use transação para operações críticas.

Implemente testes de concorrência.

Não implemente funcionalidades não relacionadas.

54. PROMPT 11 — CANCELAMENTO E
    REMARCAÇÃO

Implemente cancelamento e remarcação.

Ao cancelar:

- alterar status;
- liberar recurso;
- registrar histórico;
- registrar auditoria.

Ao remarcar:

- validar novo horário;
- validar profissional;
- validar recurso;
- liberar horário antigo;
- reservar novo horário;
- registrar histórico.

Execute testes de regressão.

                                        23

55. PROMPT 12 — ADMINISTRADOR

Implemente as interfaces administrativas previstas na documentação.

Inclua:

- dashboard;
- agenda;
- clientes;
- profissionais;
- serviços;
- recursos;
- relatórios;
- auditoria;
- configurações.

Utilize os dados reais da API.

Não utilizar dados fictícios na funcionalidade final.

Respeite permissões.

56. PROMPT 13 — PROFISSIONAL

Implemente a experiência do profissional.

Inclua:

- dashboard;
- minha agenda;
- detalhes do atendimento;
- iniciar;
- concluir;
- ausência;
- clientes;
- disponibilidade;
- bloqueios;
- perfil;
- notificações.

O profissional somente poderá visualizar informações permitidas pelo seu
perfil.

                                     24

57. PROMPT 14 — CLIENTE

Implemente a experiência completa do cliente.

Fluxo:

Login
↓
Dashboard
↓
Novo Agendamento
↓
Serviço
↓
Modalidade
↓
Profissional
↓
Data
↓
Horário
↓
Confirmação
↓
Sucesso

Também implementar:

- meus agendamentos;
- histórico;
- endereços;
- perfil;
- notificações.

A interface deverá ser simples e responsiva.

58. PROMPT 15 — HOME CARE

Implemente completamente a modalidade Home Care.

Regras:

- endereço obrigatório;
- profissional compatível;
- disponibilidade obrigatória;
- nenhuma maca deverá ser reservada;

                                       25

- identificação visual clara.

Teste:

1. Home Care válido;
2. sem endereço;
3. profissional indisponível;
4. conflito de horário.

5. PROMPT 16 — NOTIFICAÇÕES

Implemente notificações internas.

Criar notificações para eventos importantes:

- confirmação;
- alteração;
- cancelamento;
- lembrete;
- conclusão quando aplicável.

Criar API e interface.

Não implementar integrações externas ainda.

60. PROMPT 17 — RELATÓRIOS

Implemente os relatórios previstos.

Inclua:

- atendimentos;
- cancelamentos;
- ausência;
- Home Care;
- ocupação;
- recursos.

Utilize filtros e paginação quando necessário.

Os dados deverão ser reais.

                                      26

61. PROMPT 18 — AUDITORIA

Revise e finalize o sistema de auditoria.

Garanta registro das ações administrativas críticas.

Cada registro deverá possuir:

- usuário;
- ação;
- entidade;
- registro;
- data/hora.

Criar tela administrativa para consulta.

62. PROMPT 19 — TESTES COMPLETOS

Execute uma revisão completa do sistema.

Teste:

- autenticação;
- autorização;
- clientes;
- profissionais;
- serviços;
- disponibilidade;
- bloqueios;
- cinco macas;
- agendamento;
- concorrência;
- Home Care;
- cancelamento;
- remarcação;
- dashboards;
- notificações;
- relatórios;
- auditoria.

Não apenas execute testes existentes.

Identifique também lacunas de cobertura.

Corrija problemas encontrados sem alterar regras de negócio.

                                        27

63. PROMPT 20 — SEGURANÇA

Faça uma auditoria de segurança do sistema.

Verifique:

- autenticação;
- autorização;
- controle de acesso;
- exposição de dados;
- validação de entrada;
- sessões;
- senhas;
- variáveis de ambiente;
- APIs;
- logs;
- acesso direto a URLs;
- acesso direto aos endpoints.

Corrija vulnerabilidades encontradas.

Não altere funcionalidades sem necessidade.

64. PROMPT 21 — PRODUÇÃO

Prepare o sistema para produção.

Verifique:

- build;
- banco;
- migrations;
- variáveis;
- logs;
- erros;
- performance;
- responsividade;
- segurança;
- backup;
- recuperação;
- domínio;
- HTTPS.

Não faça deploy definitivo sem apresentar primeiro um checklist de produção.

                                        28

65. REGRA DE COMUNICAÇÃO COM O AGENT
Depois de cada prompt:

Pergunte:
"O que foi implementado?"

Depois:
"Quais arquivos foram alterados?"

Depois:
"Quais testes foram executados?"

Depois:
"Existe algum problema ou pendência?"

66. REGRA DE CONTROLE
    Se o Agent disser:

    "Também aproveitei para melhorar..."

Verificar exatamente o que foi alterado.

Evitar mudanças fora do escopo.

67. REGRA DE BACKUP
    Antes de alterações grandes:

commit
ou
checkpoint

68. REGRA DE ROLLBACK
    Toda alteração importante deverá poder ser revertida.

                                                 29

69. DEFINIÇÃO DE MVP
    O MVP estará concluído quando o sistema conseguir executar o fluxo:

CLIENTE
↓
LOGIN
↓
ESCOLHER SERVIÇO
↓
ESCOLHER MODALIDADE
↓
ESCOLHER PROFISSIONAL
↓
ESCOLHER DATA
↓
ESCOLHER HORÁRIO
↓
CONFIRMAR
↓
AGENDAMENTO
↓
PROFISSIONAL VISUALIZA
↓
ATENDIMENTO
↓
CONCLUSÃO

E o administrador conseguir gerenciar toda a operação.

70. TESTE REAL FINAL
    Criar cenário:

Cliente: Cliente Teste
Profissional: Profissional Teste
Serviço: Serviço Teste
Modalidade: Presencial
Data: data futura
Horário: horário disponível

Criar agendamento.

Depois:

                                                 30

Cliente → visualiza
Profissional → visualiza
Administrador → visualiza

Depois:

Profissional → inicia
Profissional → conclui

Resultado:

Histórico atualizado +
Auditoria registrada

71. TESTE HOME CARE
    Criar:

Cliente +
Serviço +
Home Care +
Endereço +
Profissional +
Horário

Confirmar.

Resultado:

Agendamento criado +
Nenhuma maca ocupada

                              31

72. TESTE DAS CINCO MACAS
Criar cinco agendamentos simultâneos.

Resultado:

Maca 01 → ocupada
Maca 02 → ocupada
Maca 03 → ocupada
Maca 04 → ocupada
Maca 05 → ocupada

Sexta tentativa:

CONFLITO

73. TESTE DE CONCORRÊNCIA
    Dois clientes:

Cliente A
Cliente B

tentando o mesmo:

Profissional +
Serviço +
Data +
Horário

Resultado:

1 → sucesso
1 → conflito

                                        32

74. TESTE DE SEGURANÇA
Cliente tentando acessar:

/admin

Resultado:

403

ou redirecionamento apropriado.

Cliente tentando consultar outro cliente:

GET /api/clients/outro-id

Resultado:

acesso negado

75. TESTE DE REGRESSÃO
    Depois de cada alteração crítica:

npm test

ou equivalente da stack escolhida.

Nunca assumir que a funcionalidade continua funcionando sem testar.

76. REGRA PARA O USUÁRIO DO SISTEMA
    O usuário não deverá precisar conhecer:

    • banco;
    • API;
    • endpoint;
    • ID;
    • arquitetura;

                                                33

    • regra técnica.

Tudo isso deve ser abstraído pela interface.

77. REGRA PARA O ADMINISTRADOR
    O administrador deverá conseguir controlar a operação sem acessar diretamente o banco.

78. REGRA PARA O PROFISSIONAL
    O profissional deverá enxergar somente o que precisa para executar seus atendimentos.

79. REGRA PARA O CLIENTE
    O cliente deverá conseguir agendar com o mínimo possível de etapas e dúvidas.

80. CRITÉRIO FINAL DE QUALIDADE
    O sistema deverá ser avaliado em cinco dimensões:

FUNCIONAL
SEGURANÇA
USABILIDADE
PERFORMANCE
MANUTENIBILIDADE

Nenhuma delas deverá ser ignorada.

81. FONTE DA VERDADE
    Quando houver conflito entre código e documentação:

DOCUMENTAÇÃO
↓
REGRA DE NEGÓCIO
↓
DECISÃO REGISTRADA

                                                34

↓
CÓDIGO

O código deverá ser ajustado à regra aprovada.

82. PRINCÍPIO FINAL DO PROJETO
    Não construir apenas uma aplicação que "funciona".

Construir um sistema que seja:

      previsível, seguro, simples de usar, testável e fácil de evoluir.

83. COMANDO FINAL PARA O REPLIT AGENT
Somente após todo o projeto estar validado:

Faça uma auditoria final do projeto Fluir da Vida.

Compare a implementação atual com toda a documentação oficial.

Identifique:

1. funcionalidades ausentes;
2. regras de negócio não implementadas;
3. permissões incorretas;
4. endpoints ausentes;
5. telas ausentes;
6. testes ausentes;
7. problemas de segurança;
8. problemas de performance;
9. inconsistências entre frontend e backend;
10. dívida técnica relevante.

NÃO corrija automaticamente.

Primeiro apresente um relatório organizado por prioridade:

CRÍTICO
ALTO
MÉDIO
BAIXO

Depois aguarde aprovação para executar as correções.

                                                  35

84. ENCERRAMENTO
Este documento deverá ser utilizado como:

MANUAL DE EXECUÇÃO +
CHECKLIST +
GUIA DE PROMPTS +
CRITÉRIO DE ACEITE

O desenvolvimento deverá ocorrer de forma incremental.

      Nunca construir tudo de uma vez.

      Nunca permitir que o Agent invente regras críticas.

      Nunca considerar uma funcionalidade concluída sem teste.

      Nunca avançar sem validar o checkpoint anterior.

                                               36
