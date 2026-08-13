---
source_sequence: "02"
internal_document: "Documento 04"
source_pdf: "2 - Modelo de Dados Fluir da Vida.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 04 — MODELO DE DADOS

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

> ⚠️ **DOCUMENTO SUPERADO — NÃO USAR COMO FONTE VIGENTE.**
> Este documento (Doc 04) representa uma versão inicial do modelo de dados e foi **superado pelo Documento 13 — Arquitetura Técnica e Banco de Dados** ([13-DOCUMENTO-13-ARQUITETURA-T-CNICA-E-BANCO-DE-DADOS.md](13-DOCUMENTO-13-ARQUITETURA-T-CNICA-E-BANCO-DE-DADOS.md)), conforme a hierarquia do Doc 00. Qualquer análise, alteração ou verificação do banco de dados deve usar o Doc 13 e o schema real em `lib/db` como referência. Mantido apenas como registro histórico. *(Nota adicionada no Saneamento Pré-F16, 13/08/2026.)*

FLUIR DA VIDA OFICIAL
DOCUMENTO 04 — MODELO DE DADOS
Versão: 1.0
Objetivo: Definir a estrutura lógica do banco de dados.

1. USERS
   Tabela principal de autenticação.

Campos

       • id;
       • name;
       • email;
       • phone;
       • password/auth_provider;
       • role;
       • status;
       • created_at;
       • updated_at.

Role

ADMIN
PROFESSIONAL
CLIENT

2. CLIENTS
   Dados específicos do cliente.

Campos

       • id;
       • user_id;
       • full_name;
       • birth_date;
       • phone;
       • email;
       • address;
       • notes;

                                                   1

     • status;
     • created_at;
     • updated_at.

3. PROFESSIONALS
Dados específicos do profissional.

Campos

     • id;
     • user_id;
     • specialty;
     • phone;
     • email;
     • bio;
     • status;
     • created_at;
     • updated_at.

4. SERVICES
Serviços oferecidos.

Campos

     • id;
     • name;
     • description;
     • duration_minutes;
     • price;
     • status;
     • created_at;
     • updated_at.

5. PROFESSIONAL_SERVICES
Relacionamento entre profissionais e serviços.

Campos

     • id;
     • professional_id;
     • service_id;

                                                 2

     • status.

Um profissional poderá realizar vários serviços.

Um serviço poderá ser realizado por vários profissionais.

6. PROFESSIONAL_AVAILABILITY
   Disponibilidade recorrente.

Campos

     • id;
     • professional_id;
     • day_of_week;
     • start_time;
     • end_time;
     • active.

7. AVAILABILITY_BLOCKS
Bloqueios de agenda.

Campos

     • id;
     • professional_id;
     • start_datetime;
     • end_datetime;
     • reason;
     • created_by.

8. RESOURCES
Recursos físicos do espaço.

Inicialmente:

Maca 01
Maca 02
Maca 03
Maca 04
Maca 05

                                                   3

Campos

     • id;
     • name;
     • type;
     • status;
     • created_at.

Type

Inicialmente:

MASSAGE_BED

A arquitetura deverá permitir futuramente:

ROOM
EQUIPMENT
CABIN
OTHER

9. APPOINTMENTS
   Tabela principal da agenda.

Campos

     • id;
     • client_id;
     • professional_id;
     • service_id;
     • resource_id;
     • start_datetime;
     • end_datetime;
     • modality;
     • status;
     • home_care_address;
     • notes;
     • created_by;
     • created_at;
     • updated_at.

                                             4

10. MODALITY
Valores:

IN_PERSON
HOME_CARE

11. APPOINTMENT_HISTORY
    Histórico.

Campos

      • id;
      • appointment_id;
      • user_id;
      • action;
      • previous_data;
      • new_data;
      • created_at.

12. NOTIFICATIONS
Estrutura preparada para notificações.

Campos

      • id;
      • user_id;
      • type;
      • title;
      • message;
      • read_at;
      • created_at.

13. FUTURE — CLIENT_ADDRESSES
Para clientes com múltiplos endereços.

Campos planejados:

      • id;

                                         5

     • client_id;
     • label;
     • street;
     • number;
     • complement;
     • neighborhood;
     • city;
     • state;
     • zip_code;
     • reference;
     • latitude;
     • longitude.

Não necessariamente será implementado no MVP.

14. FUTURE — PAYMENTS
    Preparado para futura implementação financeira.

Possíveis campos:

     • id;
     • appointment_id;
     • amount;
     • payment_method;
     • status;
     • paid_at.

15. FUTURE — REVIEWS
Avaliações futuras.

Campos:

     • id;
     • appointment_id;
     • client_id;
     • professional_id;
     • rating;
     • comment;
     • created_at.

                                                  6

16. RELACIONAMENTOS PRINCIPAIS

USER
│
├── CLIENT
│
└── PROFESSIONAL

PROFESSIONAL
│
├── AVAILABILITY
├── BLOCKS
└── SERVICES

CLIENT
│
└── APPOINTMENTS

PROFESSIONAL
│
└── APPOINTMENTS

SERVICE
│
└── APPOINTMENTS

RESOURCE
│
└── APPOINTMENTS

17. REGRA CRÍTICA DO BANCO
    A aplicação deverá garantir que:

PROFISSIONAL +
INTERVALO DE TEMPO

não possua conflito.

                                   7

E:

     RECURSO/MACA
     +
     INTERVALO DE TEMPO

não possua conflito.

Essas validações deverão ocorrer no backend.

Não confiar somente na interface.

18. HOME CARE
    Quando:

    modality = HOME_CARE

o campo:

     resource_id

deverá permanecer vazio/nulo.

O endereço deverá ser informado conforme a implementação definida.

19. PRESENCIAL
    Quando:

    modality = IN_PERSON

o sistema deverá exigir:

     resource_id

O recurso deverá ser uma das cinco macas disponíveis.

                                                 8

20. ESCALABILIDADE
Apesar de o espaço possuir cinco macas atualmente, não devemos criar cinco tabelas separadas.

❌ Não criar:

maca_01
maca_02
maca_03
maca_04
maca_05

Correto:

Uma tabela:

resources

com cinco registros.

Isso permitirá crescimento futuro.

21. AUDITORIA
    Alterações críticas deverão ser rastreáveis.

Exemplos:

Quem criou?
Quem alterou?
Quem cancelou?
Quando?
O que mudou?

22. DADOS SENSÍVEIS
    Dados pessoais deverão ser tratados com segurança e acesso baseado em função.

Nunca expor informações de clientes para usuários sem autorização.

                                                 9

23. PRINCÍPIO ARQUITETURAL
O banco deverá ser estruturado para permitir evolução sem reconstrução completa.

O MVP deverá ser simples.

A arquitetura deverá ser preparada para crescimento.

24. REGRA PARA O REPLIT AGENT
    Antes de criar ou modificar tabelas:

    1. analisar este documento;
    2. verificar relacionamentos existentes;
    3. verificar impacto nas funcionalidades;
    4. preservar dados existentes;
    5. explicar migrações necessárias;
    6. somente então implementar.

Nunca apagar dados ou tabelas sem autorização explícita.

                                                 10
