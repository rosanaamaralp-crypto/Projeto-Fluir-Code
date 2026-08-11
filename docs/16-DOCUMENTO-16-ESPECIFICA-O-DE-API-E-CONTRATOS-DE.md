---
source_sequence: "16"
internal_document: "Documento 16"
source_pdf: "16 - Especificação de API e Contratos de Dados.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 16 — ESPECIFICAÇÃO DE API E CONTRATOS DE

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 16 — ESPECIFICAÇÃO DE API E CONTRATOS DE
DADOS
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
   Definir como o frontend, backend e banco de dados irão se comunicar.

Este documento estabelece:

     • endpoints;
     • métodos;
     • parâmetros;
     • dados enviados;
     • dados retornados;
     • erros;
     • autenticação;
     • autorização;
     • regras de agendamento;
     • contratos entre frontend e backend.

2. PRINCÍPIO
A interface não deverá acessar diretamente o banco.

Fluxo:

````text id="v2cr31" FRONTEND ↓ API ↓ REGRAS DE NEGÓCIO ↓ BANCO

  ---

  # 3. PADRÃO DE API

  Utilizar API HTTP organizada por recursos.

  Exemplo:

  ```text id="7k1vqn"

                                                 1

  /api/auth
  /api/users
  /api/clients
  /api/professionals
  /api/services
  /api/availability
  /api/appointments
  /api/resources
  /api/reports
  /api/notifications

4. FORMATO
Preferencialmente:

```text id="b8f6kc" JSON

  ---

  # 5. AUTENTICAÇÃO

  Endpoints protegidos deverão exigir usuário autenticado.

  Exemplo conceitual:

  ```text id="2j87fn"
  Authorization

O mecanismo específico será definido pela stack escolhida.

6. RESPOSTA DE SUCESSO
Formato consistente.

Exemplo:

```text id="j25c3h" { "data": {...}, "message": "Operação realizada com sucesso." }

  ---

  # 7. RESPOSTA DE ERRO

  Formato:

                                                     2

  ```text id="b8x7r1"
  {
    "error": {
      "code": "APPOINTMENT_CONFLICT",
          "message": "O horário selecionado não está disponível."
      }
  }

8. CÓDIGOS HTTP
Utilizar adequadamente:

```text id="h9f6mt" 200 OK 201 CREATED 204 NO CONTENT 400 BAD REQUEST 401 UNAUTHORIZED 403
FORBIDDEN 404 NOT FOUND 409 CONFLICT 422 UNPROCESSABLE ENTITY 500 INTERNAL SERVER
ERROR

  ---

  # 9. AUTENTICAÇÃO

  ## POST /api/auth/login

  ### Entrada

  ```text id="k6k1sj"
  {
    "email": "usuario@email.com",
    "password": "senha"
  }

Sucesso

Retornar:

      • usuário;
      • perfil;
      • sessão/token conforme tecnologia escolhida.

10. LOGOUT
POST /api/auth/logout
Encerrar sessão.

                                                  3

11. USUÁRIO ATUAL
GET /api/auth/me
Retornar:

```text id="2x4h6u" { "id": "...", "name": "...", "email": "...", "role": "CLIENT" }

  ---

  # 12. CLIENTES

  ## GET /api/clients

  Acesso administrativo conforme permissão.

  Filtros possíveis:

  ```text id="c2l0f1"
  search
  status
  page
  limit

13. CLIENTE
GET /api/clients/:id
Retornar:

      • dados;
      • endereços;
      • resumo de agendamentos conforme autorização.

14. CRIAR CLIENTE
POST /api/clients
Entrada conceitual:

```text id="xv8j0v" { "name": "...", "email": "...", "phone": "...", "birthDate": "..." }

                                                            4

---

# 15. EDITAR CLIENTE

## PATCH /api/clients/:id

Alterar somente campos permitidos.

---

# 16. ENDEREÇOS DO CLIENTE

## GET /api/clients/:id/addresses

---

## POST /api/clients/:id/addresses

Criar endereço.

---

## PATCH /api/addresses/:id

Editar endereço.

---

## DELETE /api/addresses/:id

Excluir/desativar conforme regra definida.

---

# 17. PROFISSIONAIS

## GET /api/professionals

Filtros:

```text id="1j8n5c"
status
specialty
serviceId

                                      5

18. PROFISSIONAL
GET /api/professionals/:id
Retornar dados autorizados.

19. CRIAR PROFISSIONAL
POST /api/professionals

20. EDITAR PROFISSIONAL
PATCH /api/professionals/:id

21. SERVIÇOS
GET /api/services
Permitir filtros:

```text id="f9m8tc" status modality

  ---

  # 22. CRIAR SERVIÇO

  ## POST /api/services

  Entrada:

  ```text id="j1x3a8"
  {
    "name": "...",
    "description": "...",
    "durationMinutes": 60,
    "price": 150,
    "status": "ACTIVE"
  }

                                      6

23. EDITAR SERVIÇO
PATCH /api/services/:id

24. PROFISSIONAIS POR SERVIÇO
GET /api/services/:id/professionals
Retornar somente profissionais habilitados e ativos.

25. DISPONIBILIDADE
GET /api/professionals/:id/availability
Retornar disponibilidade configurada.

26. CRIAR DISPONIBILIDADE
POST /api/professionals/:id/availability

27. BLOQUEIOS
GET /api/professionals/:id/blocked-periods

POST /api/professionals/:id/blocked-periods

DELETE /api/blocked-periods/:id

28. RECURSOS
GET /api/resources
Retornar recursos disponíveis.

                                                   7

29. RECURSO
GET /api/resources/:id

30. STATUS DOS RECURSOS
GET /api/resources/status
Retornar situação atual das cinco macas.

Exemplo:

```text id="u1m2v4" [ { "id": "1", "name": "Maca 01", "status": "AVAILABLE" } ]

  ---

  # 31. AGENDAMENTOS

  ## GET /api/appointments

  Filtros:

  ```text id="i3f0i5"
  startDate
  endDate
  professionalId
  clientId
  serviceId
  status
  modality
  resourceId

32. AGENDAMENTO
GET /api/appointments/:id
Retornar dados autorizados.

                                                      8

33. NOVO AGENDAMENTO
POST /api/appointments
Entrada conceitual:

```text id="3p4xsv" { "clientId": "...", "serviceId": "...", "professionalId": "...", "modality": "IN_PERSON",
"startDatetime": "...", "addressId": null }

  ---

  # 34. REGRA

  O frontend não deverá enviar:

  ```text id="o5t7ue"
  endDatetime
  resourceId

como fonte definitiva da verdade.

Esses dados deverão ser calculados/validados pelo backend.

35. RESPOSTA DO AGENDAMENTO
Exemplo:

```text id="ksv4sh" { "id": "...", "client": {...}, "professional": {...}, "service": {...}, "modality": "IN_PERSON",
"startDatetime": "...", "endDatetime": "...", "resource": { "id": "...", "name": "Maca 03" }, "status":
"CONFIRMED" }

  ---

  # 36. HORÁRIOS DISPONÍVEIS

  ## GET /api/appointments/available-slots

  Parâmetros:

  ```text id="l6zv8c"
  serviceId
  professionalId
  modality

                                                           9

  date
  addressId

37. RESPOSTA
Exemplo:

```text id="f2u4e6" [ { "startDatetime": "2026-08-12T10:00:00", "endDatetime": "2026-08-12T11:00:00" },
{ "startDatetime": "2026-08-12T11:00:00", "endDatetime": "2026-08-12T12:00:00" } ]

  Somente horários realmente disponíveis deverão ser retornados.

  ---

  # 38. VALIDAÇÃO FINAL

  Mesmo que um horário tenha sido exibido como disponível:

  ```text id="d4w0c9"
  POST /api/appointments

deverá verificar novamente a disponibilidade.

39. CONFLITO
Se o horário ficar ocupado antes da confirmação:

```text id="g7a1b4" HTTP 409

  Código:

  ```text id="h5p2c0"
  APPOINTMENT_CONFLICT

40. ALTERAÇÃO
PATCH /api/appointments/:id
Entrada:

                                                   10

```text id="q8s4a2" { "startDatetime": "...", "professionalId": "...", "modality": "...", "addressId": "..." }

  O backend deverá recalcular todas as regras.

  ---

  # 41. CANCELAMENTO

  ## POST /api/appointments/:id/cancel

  Entrada opcional:

  ```text id="f4d8p7"
  {
    "reason": "..."
  }

42. INICIAR ATENDIMENTO
POST /api/appointments/:id/start
Alterar:

```text id="x9v2k6" CONFIRMED → IN_PROGRESS

  ---

  # 43. CONCLUIR ATENDIMENTO

  ## POST /api/appointments/:id/complete

  Alterar:

  ```text id="z1r5k3"
  IN_PROGRESS
  →
  COMPLETED

44. AUSÊNCIA
POST /api/appointments/:id/no-show
Alterar:

                                                         11

```text id="h6m9q2" CONFIRMED → NO_SHOW

  ---

  # 45. HISTÓRICO

  ## GET /api/appointments/:id/history

  Retornar mudanças do agendamento.

  ---

  # 46. NOTIFICAÇÕES

  ## GET /api/notifications

  Retornar notificações do usuário autenticado.

  ---

  # 47. MARCAR COMO LIDA

  ## POST /api/notifications/:id/read

  ---

  # 48. DASHBOARD ADMINISTRATIVO

  ## GET /api/dashboard/admin

  Retornar indicadores calculados no backend.

  Exemplos:

  ```text id="y8s2v4"
  appointmentsToday
  upcomingAppointments
  completedToday
  cancelledToday
  homeCareToday
  resourceOccupancy

49. DASHBOARD PROFISSIONAL
GET /api/dashboard/professional
Retornar somente informações daquele profissional.

                                                12

50. DASHBOARD CLIENTE
GET /api/dashboard/client
Retornar:

      • próximo atendimento;
      • próximos agendamentos;
      • resumo do histórico;
      • notificações relevantes.

51. RELATÓRIOS
GET /api/reports/appointments
Filtros:

```text id="c1m4q7" startDate endDate professionalId serviceId modality status

  ---

  # 52. RELATÓRIO DE RECURSOS

  ## GET /api/reports/resources

  Permitir analisar utilização das macas.

  ---

  # 53. AUDITORIA

  ## GET /api/audit-logs

  Somente usuários autorizados.

  ---

  # 54. PAGINAÇÃO

  Listagens deverão aceitar:

  ```text id="p7n4s2"
  page
  limit

                                                  13

Resposta poderá conter:

```text id="w2k8c6" { "data": [], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }

  ---

  # 55. ORDENAÇÃO

  Listagens deverão permitir ordenação quando necessário.

  ---

  # 56. FILTROS

  Filtros deverão ser aplicados no backend.

  Não carregar milhares de registros para filtrar somente no navegador.

  ---

  # 57. SEGURANÇA

  Toda API protegida deverá validar:

  ```text id="s5m8d1"
  AUTENTICAÇÃO
  ↓
  AUTORIZAÇÃO
  ↓
  VALIDAÇÃO
  ↓
  REGRA DE NEGÓCIO
  ↓
  BANCO

58. ID
IDs deverão ser tratados como identificadores internos.

Não confiar no ID enviado pelo cliente para determinar autorização.

59. PERMISSÃO
Exemplo:

                                                        14

```text id="r4p8x2" CLIENT → somente seus agendamentos

PROFESSIONAL → seus atendimentos

ADMIN → dados administrativos autorizados

  ---

  # 60. VALIDAÇÃO DE AGENDAMENTO

  O endpoint POST /appointments deverá executar:

  ```text id="v5k9m3"
  1. autenticar
  2. autorizar
  3. validar cliente
  4. validar serviço
  5. validar profissional
  6. validar modalidade
  7. calcular duração
  8. verificar disponibilidade
  9. verificar bloqueios
  10. verificar conflito
  11. verificar recurso
  12. verificar endereço
  13. criar transação
  14. salvar
  15. registrar histórico
  16. retornar resultado

61. MACAS
Para atendimento presencial:

```text id="q7c2n8" buscar maca disponível ↓ reservar dentro da transação ↓ criar agendamento

  ---

  # 62. HOME CARE

  Para Home Care:

  ```text id="k4w8s1"
  validar endereço
  ↓
  validar profissional

                                                15

  ↓
  validar disponibilidade
  ↓
  criar agendamento

Nenhuma maca deverá ser reservada.

63. CANCELAMENTO
Ao cancelar:

```text id="m3r7y9" alterar status ↓ liberar recurso ↓ registrar histórico ↓ registrar auditoria

  ---

  # 64. REMARCAÇÃO

  Ao remarcar:

  ```text id="n8x2q4"
  validar novo horário
  ↓
  validar profissional
  ↓
  validar serviço
  ↓
  validar modalidade
  ↓
  validar recurso
  ↓
  liberar antigo
  ↓
  reservar novo
  ↓
  registrar histórico

65. IDEMPOTÊNCIA
Operações críticas deverão possuir mecanismo para evitar duplicidade.

Principalmente:

```text id="y6f3w8" POST /appointments

                                                    16

  ---

  # 66. TRANSFERÊNCIA DE DADOS

  Nunca retornar mais dados do que a tela precisa.

  ---

  # 67. DTO

  A API deverá utilizar estruturas de resposta próprias quando necessário.

  Evitar expor diretamente modelos internos do banco.

  ---

  # 68. VERSIONAMENTO

  A API deverá ser preparada para versionamento.

  Exemplo:

  ```text id="z4q7m1"
  /api/v1/...

69. DOCUMENTAÇÃO
Todos os endpoints deverão ser documentados.

Idealmente com OpenAPI/Swagger.

70. TESTES
Cada endpoint crítico deverá possuir testes.

Prioridade:

    1. login;
    2. permissões;
    3. disponibilidade;
    4. criação de agendamento;
    5. conflito;
    6. maca;
    7. Home Care;
    8. cancelamento;

                                               17

     9. remarcação.

71. CONTRATO FRONTEND/BACKEND
O frontend deverá consumir os contratos definidos aqui.

Se o backend alterar um contrato:

       deverá atualizar a documentação e os consumidores.

72. REGRA PARA O REPLIT AGENT
O Agent não deverá inventar endpoints quando já existir um contrato neste documento.

Se precisar alterar:

     1. identificar necessidade;
     2. atualizar documento;
     3. implementar;
     4. testar.

73. CRITÉRIO DE CONCLUSÃO
A API estará adequada quando:

      • autenticação funcionar;
      • permissões funcionarem;
      • CRUDs principais funcionarem;
      • agenda funcionar;
      • disponibilidade funcionar;
      • cinco macas forem respeitadas;
      • Home Care funcionar;
      • conflitos forem tratados;
      • histórico existir;
      • auditoria existir;
      • testes críticos passarem.

74. PRINCÍPIO FINAL
A API será o contrato oficial entre a experiência do usuário e as regras do sistema.

                                                    18

O frontend apresenta.
A API valida.
O domínio decide.
O banco preserva.

                        19
````
