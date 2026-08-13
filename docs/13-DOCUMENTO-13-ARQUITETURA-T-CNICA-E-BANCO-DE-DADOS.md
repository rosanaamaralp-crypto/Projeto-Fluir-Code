---
source_sequence: "13"
internal_document: "Documento 13"
source_pdf: "13 - Arquitetura Técnica e Banco de Dados.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 13 — ARQUITETURA TÉCNICA E BANCO DE DADOS

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 13 — ARQUITETURA TÉCNICA E BANCO DE DADOS
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
   Transformar toda a especificação funcional do projeto em uma arquitetura técnica que possa ser
   implementada no Replit.

Este documento define:

     • arquitetura geral;
     • módulos;
     • entidades;
     • relacionamentos;
     • regras de negócio;
     • autenticação;
     • autorização;
     • API;
     • banco de dados;
     • integridade;
     • escalabilidade;
     • preparação para funcionalidades futuras.

2. PRINCÍPIO ARQUITETURAL
O sistema deverá ser construído para separar:

INTERFACE
↓
API / REGRAS DE NEGÓCIO
↓
BANCO DE DADOS

A interface nunca deverá acessar diretamente tabelas sensíveis do banco sem passar pelas regras
apropriadas.

                                                  1

3. ARQUITETURA GERAL
Estrutura conceitual:

┌─────────────────────────────┐
│ CLIENTE │
│ WEB / MOBILE │
└──────────────┬──────────────┘
│
▼
┌─────────────────────────────┐
│ FRONTEND │
│ UI + COMPONENTES + ESTADO │
└──────────────┬──────────────┘
│
▼
┌─────────────────────────────┐
│ BACKEND / API │
│ │
│ Autenticação │
│ Autorização │
│ Agendamento │
│ Clientes │
│ Profissionais │
│ Serviços │
│ Macas │
│ Home Care │
│ Relatórios │
└──────────────┬──────────────┘
│
▼
┌─────────────────────────────┐
│ BANCO │
│ RELACIONAL │
└─────────────────────────────┘

4. PRINCÍPIO DE RESPONSABILIDADE
   Cada camada deverá possuir uma responsabilidade.

Frontend

Responsável por:

      • apresentação;

                                               2

      • interação;
      • validação visual;
      • navegação.

Backend

Responsável por:

      • regras de negócio;
      • segurança;
      • autorização;
      • validação definitiva;
      • transações.

Banco

Responsável por:

      • persistência;
      • integridade;
      • relacionamentos;
      • restrições.

5. BANCO DE DADOS
Recomendação:

Banco relacional.

A estrutura possui muitos relacionamentos entre:

      • clientes;
      • profissionais;
      • serviços;
      • agendas;
      • recursos;
      • usuários;
      • agendamentos.

Portanto, um banco relacional é adequado para o núcleo do sistema.

6. ENTIDADES PRINCIPAIS
   Estrutura inicial:

                                                   3

users
roles
clients
professionals
services
professional_services
availability
blocked_periods
resources
appointments
appointment_status_history
addresses
audit_logs
notifications

7. USERS
   Tabela de autenticação e identidade dos usuários.

Campos conceituais:

id
name
email
password_hash
phone
role_id
status
created_at
updated_at
last_login_at

8. ROLES
   Representa os perfis.

Registros iniciais:

ADMIN
PROFESSIONAL
CLIENT

                                                    4

9. CLIENTS
Informações específicas do cliente.

id
user_id
birth_date
status
created_at
updated_at

O usuário contém informações de autenticação.

O cliente contém informações específicas do cliente.

10. PROFESSIONALS

id
user_id
specialty
status
created_at
updated_at

11. SERVICES

id
name
description
duration_minutes
price
status
created_at
updated_at

12. PROFESSIONAL_SERVICES
    Relacionamento entre profissionais e serviços.

                                                   5

id
professional_id
service_id
active

Isso permite que um profissional execute vários serviços.

E um serviço possa ser executado por vários profissionais.

13. ADDRESSES
    Tabela preparada para endereços.

id
client_id
street
number
complement
neighborhood
city
state
postal_code
reference
latitude
longitude
is_default
created_at
updated_at

Latitude e longitude podem permanecer nulas no MVP.

Isso prepara o sistema para recursos futuros de Home Care.

14. AVAILABILITY
    Representa a disponibilidade recorrente do profissional.

Exemplo:

id
professional_id
weekday
start_time

                                                   6

end_time
active

Exemplo:

Segunda
08:00
18:00

15. BLOCKED_PERIODS
    Representa períodos bloqueados.

id
professional_id
start_datetime
end_datetime
reason
status
created_at

16. RESOURCES
    Representa recursos físicos.

No MVP:

Maca 01
Maca 02
Maca 03
Maca 04
Maca 05

Estrutura:

id
name
type
status

                                  7

created_at
updated_at

17. RESOURCE_TYPES
    Preparar conceitualmente para:

MASSAGE_TABLE
ROOM
EQUIPMENT
OTHER

No MVP, utilizar principalmente:

MASSAGE_TABLE

18. APPOINTMENTS
    Esta é uma das entidades mais importantes.

Campos:

id
client_id
professional_id
service_id
modality
resource_id
address_id
start_datetime
end_datetime
status
notes
created_by
created_at
updated_at

19. MODALITY
    Não utilizar somente booleano.

                                             8

Utilizar conceito enumerado:

IN_PERSON
HOME_CARE

Preparado para expansão futura.

20. STATUS DO AGENDAMENTO
    Valores iniciais:

PENDING
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
NO_SHOW

> ⚠️ **Nota vigente (Saneamento Pré-F16, 13/08/2026):** o status `PENDING` consta acima apenas como referência histórica/documental e **não faz parte do fluxo vigente do MVP**. A decisão aprovada na Fase 4 estabelece que agendamentos são criados diretamente como `CONFIRMED` (`null ──CREATE──► CONFIRMED`), e o CHECK constraint do banco aceita somente `CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED / NO_SHOW`. `PENDING` não deve ser implementado sem nova autorização formal.

21. REGRA DE MACA
    Se:

modality = IN_PERSON

então o sistema deverá garantir recurso compatível quando necessário.

Se:

modality = HOME_CARE

não deverá reservar uma maca presencial.

22. REGRA DE ENDEREÇO
    Se:

modality = HOME_CARE

                                                 9

o agendamento deverá possuir endereço válido.

23. REGRA DE PROFISSIONAL
    O profissional deverá:

    • estar ativo;
    • possuir o serviço;
    • estar disponível;
    • não estar bloqueado;
    • não possuir outro atendimento conflitante.

24. REGRA DE SERVIÇO
    O serviço deverá:

    • estar ativo;
    • possuir duração válida;
    • ser compatível com a modalidade escolhida.

25. CÁLCULO DE HORÁRIO
    O sistema deverá calcular:

start_datetime +
duration_minutes
=

end_datetime

Não permitir que o frontend seja a única fonte dessa regra.

26. CONFLITO DE PROFISSIONAL
    Dois agendamentos não podem ocupar o mesmo profissional em períodos sobrepostos.

Regra:

                                                    10

novo_inicio < existente_fim
AND
novo_fim > existente_inicio

indica sobreposição.

27. CONFLITO DE RECURSO
    A mesma regra deverá ser aplicada às macas.

28. CONCORRÊNCIA
    A confirmação de um agendamento deverá ser feita de maneira transacional.

O sistema deverá:

     1. verificar disponibilidade;
     2. reservar;
     3. salvar agendamento;
     4. confirmar a transação.

Tudo deverá ocorrer de forma segura contra concorrência.

29. DUPLO ENVIO
    A API deverá estar preparada para evitar criação duplicada quando:

         • usuário clicar duas vezes;
         • requisição for reenviada;
         • conexão oscilar.

Sempre que possível utilizar mecanismo de idempotência.

30. HISTÓRICO DO AGENDAMENTO
    Criar:

appointment_status_history

Campos:

                                                 11

id
appointment_id
old_status
new_status
changed_by
changed_at
reason

31. AUDIT_LOGS
    Registrar alterações importantes.

id
user_id
action
entity_type
entity_id
old_data
new_data
created_at

32. NOTIFICATIONS
    Estrutura inicial:

id
user_id
type
title
message
read_at
created_at

33. RELACIONAMENTOS
    Modelo simplificado:

USER
│

                                    12

    ├── CLIENT
    │       │
    │       └── ADDRESS
    │
    └── PROFESSIONAL
            │
            ├── PROFESSIONAL_SERVICE
            │
            ├── AVAILABILITY
            │
            └── BLOCKED_PERIOD

SERVICE
│
└── APPOINTMENT

CLIENT
│
└── APPOINTMENT

PROFESSIONAL
│
└── APPOINTMENT

RESOURCE
│
└── APPOINTMENT

34. FOREIGN KEYS
    Relacionamentos deverão possuir foreign keys apropriadas.

Evitar relacionamentos apenas por texto.

Não utilizar:

professional_name

como referência principal.

Utilizar:

professional_id

                                                13

35. STATUS EM VEZ DE EXCLUSÃO
Sempre que histórico for importante, preferir:

status = INACTIVE

em vez de apagar o registro.

36. TIMESTAMPS
    Entidades importantes deverão possuir:

created_at
updated_at

37. TIMEZONE
    O sistema deverá possuir timezone explicitamente configurado.

A operação do Fluir da Vida deverá utilizar o timezone definido para sua unidade.

As datas armazenadas e exibidas deverão ser tratadas de forma consistente.

38. API
    A API deverá ser organizada por domínio.

Exemplo:

/auth
/users
/clients
/professionals
/services
/availability
/appointments
/resources
/reports
/notifications

                                                  14

39. APPOINTMENTS API
Exemplos conceituais:

GET /appointments
GET /appointments/:id
POST /appointments
PATCH /appointments/:id
DELETE /appointments/:id

O DELETE poderá representar cancelamento lógico conforme a regra definida.

40. ENDPOINT DE DISPONIBILIDADE
    Exemplo:

GET /availability

Deverá considerar:

     • profissional;
     • serviço;
     • modalidade;
     • data;
     • duração;
     • recursos;
     • bloqueios;
     • conflitos.

41. ENDPOINT DE HORÁRIOS DISPONÍVEIS
Exemplo:

GET /appointments/available-slots

O backend deverá retornar somente horários realmente possíveis.

                                                15

42. REGRA CRÍTICA
O frontend não deverá simplesmente esconder horários ocupados.

O backend deverá validar novamente no momento da confirmação.

43. AUTENTICAÇÃO
    O sistema deverá utilizar mecanismo seguro de sessão/autenticação.

Nunca armazenar senha em texto puro.

Utilizar:

password_hash

44. AUTORIZAÇÃO
    Cada endpoint deverá verificar:

    • usuário autenticado;
    • perfil;
    • permissão;
    • propriedade do recurso.

45. EXEMPLO
    Cliente:

GET /appointments/123

Backend verifica:

        O agendamento 123 pertence a esse cliente?

Se não:

403 Forbidden

                                                16

46. ADMINISTRADOR
Administrador poderá acessar informações conforme suas permissões.

47. PROFISSIONAL
    Profissional deverá acessar somente o que estiver autorizado.

Não assumir que profissional possui acesso total apenas por ser usuário interno.

48. VALIDAÇÃO
    Toda entrada deverá ser validada no backend.

Exemplos:

      • e-mail;
      • telefone;
      • data;
      • duração;
      • IDs;
      • status;
      • modalidade.

49. ERROS DA API
Formato padronizado.

Exemplo:

{
code: "APPOINTMENT_CONFLICT",
message: "Horário indisponível."
}

O frontend deverá transformar isso em mensagem amigável.

50. CÓDIGOS DE ERRO
    Exemplos:

                                                  17

AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
APPOINTMENT_CONFLICT
RESOURCE_UNAVAILABLE
PROFESSIONAL_UNAVAILABLE
INVALID_MODALITY
SERVER_ERROR

51. TRANSAÇÕES
    Operações críticas deverão utilizar transações.

Principalmente:

     • criação de agendamento;
     • alteração de agendamento;
     • cancelamento;
     • reserva de recurso.

52. INTEGRIDADE
O banco deverá impedir situações impossíveis sempre que tecnicamente viável.

53. ÍNDICES
    Criar índices para consultas frequentes.

Principalmente:

     • appointment.start_datetime;
     • appointment.professional_id;
     • appointment.client_id;
     • appointment.resource_id;
     • appointment.status;
     • users.email.

                                                  18

54. BUSCA
Listas grandes deverão utilizar:

     • paginação;
     • filtros;
     • ordenação.

55. SOFT DELETE
Para entidades históricas importantes, considerar:

deleted_at

ou status equivalente.

56. SEGURANÇA DE DADOS
    Nunca enviar para o frontend:

    • password_hash;
    • tokens internos;
    • informações desnecessárias;
    • dados administrativos não autorizados.

57. LOGS
    Logs técnicos deverão existir para investigação de erros.

Não registrar dados sensíveis desnecessariamente.

58. BACKUP
    O ambiente de produção deverá possuir estratégia de backup.

59. MIGRAÇÕES
    Alterações do banco deverão ser realizadas por migrations versionadas.

                                                     19

Nunca depender de alterações manuais sem registro.

60. SEED
    O projeto deverá possuir dados iniciais para desenvolvimento.

Exemplo:

Administrador Teste
Profissional Teste
Cliente Teste
5 Macas
Serviços Teste

61. AMBIENTES
    Separar:

development
test
production

Cada ambiente deverá possuir configuração própria.

62. VARIÁVEIS DE AMBIENTE
    Segredos não deverão ser gravados diretamente no código.

Exemplo:

DATABASE_URL
SESSION_SECRET
API_KEYS

63. FRONTEND
    A aplicação deverá possuir componentes reutilizáveis conforme o Documento 09.

                                                 20

Estrutura conceitual:

components/
pages/
layouts/
hooks/
services/
utils/
types/

64. BACKEND
    Estrutura conceitual:

routes/
controllers/
services/
repositories/
middlewares/
validators/
utils/

A estrutura final poderá variar conforme a tecnologia escolhida.

65. REGRA DE NEGÓCIO
    Regras importantes não deverão ficar espalhadas pelas telas.

Exemplo:

A validação das cinco macas deverá existir no domínio/backend.

Não em cinco páginas diferentes.

66. SERVIÇO DE AGENDAMENTO
    Recomendação:

Centralizar a criação de agendamentos em um serviço de domínio.

Exemplo conceitual:

                                                  21

AppointmentService

Responsável por:

     • validar;
     • verificar disponibilidade;
     • verificar profissional;
     • verificar recurso;
     • calcular duração;
     • criar;
     • registrar histórico.

67. SERVIÇO DE DISPONIBILIDADE
Centralizar cálculo de disponibilidade.

Exemplo:

AvailabilityService

68. SERVIÇO DE RECURSOS
    Exemplo:

ResourceService

Responsável por:

     • disponibilidade;
     • ocupação;
     • bloqueios.

69. REGRA DE ARQUITETURA
Não duplicar regras.

Se uma regra é:

       "Não pode existir sexto atendimento presencial simultâneo."

                                                 22

ela deve existir em um ponto central de negócio.

70. ESCALABILIDADE
    A arquitetura deverá permitir futuramente:

    • mais profissionais;
    • mais clientes;
    • mais serviços;
    • mais recursos;
    • múltiplas unidades;
    • pagamentos;
    • WhatsApp;
    • mapas;
    • aplicativo.

71. MULTIUNIDADE FUTURA
    Mesmo que não seja implementado no MVP, a arquitetura deverá evitar decisões que tornem
    impossível adicionar:

organization_id
unit_id

posteriormente.

A inclusão efetiva desses campos deverá ser feita quando a necessidade for priorizada.

72. MULTI-TENANT FUTURO
    O sistema não deverá assumir que jamais poderá existir outra unidade/empresa.

Mas também:

       não implementar multi-tenant complexo no MVP sem necessidade.

73. FUTURO — PAGAMENTOS
A entidade de agendamento deverá poder futuramente relacionar-se com:

                                                   23

payments

sem precisar ser reconstruída.

74. FUTURO — NOTIFICAÇÕES
    O sistema deverá permitir múltiplos canais:

IN_APP
EMAIL
WHATSAPP
SMS

75. FUTURO — MAPAS
    O endereço deverá estar estruturado para permitir:

latitude
longitude

76. FUTURO — CRM
    O cliente deverá possuir identificação estável para permitir análises futuras de:

    • frequência;
    • retorno;
    • histórico;
    • campanhas.

77. FUTURO — IA
    A arquitetura deverá permitir futuramente acesso controlado a dados agregados para:

    • análise;
    • previsão;
    • recomendações.

IA não deverá acessar indiscriminadamente dados sensíveis.

                                                    24

78. DOCUMENTAÇÃO DA API
A API deverá possuir documentação.

Idealmente:

     • OpenAPI;
     • Swagger ou equivalente.

79. TESTES DA API
Deverão existir testes para:

     • autenticação;
     • autorização;
     • clientes;
     • profissionais;
     • serviços;
     • agenda;
     • macas;
     • Home Care.

80. TESTE DE CONCORRÊNCIA
O backend deverá ser testado especificamente para:

Usuário A → reserva horário
Usuário B → reserva mesmo horário

Resultado:

A = sucesso
B = conflito

81. PRINCÍPIO DE SEGURANÇA
    Nunca confiar em:

    • botão oculto;

                                                25

    • URL escondida;
    • ID difícil de adivinhar;
    • validação JavaScript.

Toda autorização deverá existir no backend.

82. PRINCÍPIO DE DADOS
    O banco deverá representar a realidade do negócio.

Não adaptar a regra do negócio para facilitar a implementação.

83. PRINCÍPIO DE EVOLUÇÃO
    A arquitetura deverá ser:

    simples agora, preparada para crescer depois.

Evitar tanto:

      • arquitetura improvisada;

quanto:

      • arquitetura excessivamente complexa para o MVP.

84. CRITÉRIO DE ACEITAÇÃO TÉCNICA
A arquitetura estará adequada quando:

      • os perfis estiverem isolados;
      • os dados estiverem relacionados corretamente;
      • conflitos forem impossíveis;
      • as cinco macas forem controladas;
      • Home Care funcionar;
      • histórico permanecer íntegro;
      • regras estiverem no backend;
      • futuras expansões forem possíveis.

                                                 26

85. REGRA PARA O REPLIT AGENT
O Agent deverá:

    1. ler este documento;
    2. identificar a estrutura existente;
    3. não recriar o projeto sem necessidade;
    4. preservar banco e dados;
    5. criar migrations;
    6. reutilizar serviços;
    7. centralizar regras de negócio;
    8. testar antes de declarar concluído.

86. PROIBIÇÕES
O Agent não deverá:

     • duplicar tabelas sem necessidade;
     • duplicar regras;
     • colocar senha no código;
     • confiar somente no frontend;
     • apagar histórico;
     • criar funcionalidades futuras sem solicitação;
     • modificar regras do negócio por conta própria.

87. PRINCÍPIO FINAL
A arquitetura deverá sustentar a visão definida nos documentos anteriores.

A implementação técnica é consequência da regra de negócio.

      Primeiro definimos como o Fluir da Vida funciona. Depois fazemos o software
      representar isso corretamente.

                                                 27
