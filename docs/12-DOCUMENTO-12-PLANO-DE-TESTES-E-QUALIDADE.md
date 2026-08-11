---
source_sequence: "12"
internal_document: "Documento 12"
source_pdf: "12 - Plano de Testes e Qualidade — Fluir da Vida.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 12 — PLANO DE TESTES E QUALIDADE

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 12 — PLANO DE TESTES E QUALIDADE
Versão: 1.0
Status: Documento oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
   Definir como o sistema Fluir da Vida será testado antes, durante e depois do desenvolvimento.

O objetivo é garantir:

     • funcionamento correto;
     • segurança;
     • integridade dos agendamentos;
     • controle das cinco macas;
     • separação entre perfis;
     • funcionamento do Home Care;
     • responsividade;
     • consistência dos dados.

2. PRINCÍPIO FUNDAMENTAL
Uma funcionalidade não será considerada pronta apenas porque:

       "A tela funciona."

Ela somente será considerada pronta quando:

INTERFACE +
BACKEND +
BANCO +
PERMISSÕES +
VALIDAÇÕES +
TRATAMENTO DE ERROS

                                                  1

+
TESTES

estiverem funcionando corretamente.

3. PERFIS DE TESTE
   Criar usuários específicos para testes:

ADMIN_TESTE

Perfil:

Administrador.

PROFISSIONAL_TESTE

Perfil:

Profissional.

CLIENTE_TESTE

Perfil:

Cliente.

4. DADOS DE TESTE
   Criar ambiente separado dos dados reais.

Exemplo:

Cliente:
Maria Teste

Profissional:
Ana Teste

Serviço:
Serviço Teste

Macas:
Maca 01
Maca 02

                                           2

Maca 03
Maca 04
Maca 05

5. TESTE DE LOGIN
   CT-001
   Login correto.

Esperado:

Usuário entra no dashboard correspondente.

CT-002
Senha incorreta.

Esperado:

Sistema rejeita acesso.

CT-003
E-mail inexistente.

Esperado:

Mensagem adequada.

CT-004
Usuário desativado tenta entrar.

Esperado:

Acesso bloqueado.

                                             3

6. TESTE DE PERMISSÕES
CT-005
Cliente acessa área administrativa.

Esperado:

Acesso negado.

CT-006
Profissional acessa área administrativa.

Esperado:

Acesso negado.

CT-007
Administrador acessa área administrativa.

Esperado:

Acesso permitido.

7. TESTE DE ISOLAMENTO
   CT-008
   Cliente tenta visualizar dados de outro cliente.

Esperado:

Acesso negado.

CT-009
Profissional tenta visualizar informações não autorizadas.

Esperado:

                                                   4

Acesso negado.

8. CADASTRO DE CLIENTE
   CT-010
   Cadastrar cliente válido.

Esperado:

Cadastro criado.

CT-011
Cadastrar cliente sem nome.

Esperado:

Validação impede cadastro.

CT-012
Cadastrar e-mail inválido.

Esperado:

Erro de validação.

CT-013
Editar cliente.

Esperado:

Dados atualizados.

                              5

9. PROFISSIONAIS
CT-014
Cadastrar profissional.

CT-015
Editar profissional.

CT-016
Desativar profissional.

Esperado:

Profissional não aparece para novos agendamentos.

Agendamentos existentes permanecem preservados.

10. SERVIÇOS
    CT-017
    Criar serviço.

CT-018
Alterar duração.

CT-019
Desativar serviço.

Esperado:

Não permitir novos agendamentos.

Histórico permanece preservado.

                                                6

11. MACAS
CT-020
Cadastrar cinco macas.

CT-021
Exibir cinco macas.

CT-022
Bloquear maca.

Esperado:

Maca não pode ser utilizada durante o bloqueio.

12. TESTE CRÍTICO — CAPACIDADE DAS MACAS
    CT-023
    Criar cinco atendimentos presenciais simultâneos.

Esperado:

Todos podem ser confirmados se:

     • profissionais estiverem disponíveis;
     • serviços forem compatíveis;
     • macas estiverem disponíveis.

CT-024
Tentar criar sexto atendimento presencial simultâneo.

Esperado:

Sistema rejeita.

Mensagem:

                                                    7

       Não há maca disponível neste horário.

13. TESTE DE CONCORRÊNCIA
CT-025
Dois usuários tentam reservar a mesma maca simultaneamente.

Esperado:

Somente um agendamento é confirmado.

O outro recebe conflito.

14. AGENDA
    CT-026
    Criar agendamento válido.

CT-027
Alterar agendamento.

CT-028
Cancelar agendamento.

CT-029
Remanejar agendamento.

15. CONFLITO DE PROFISSIONAL
    CT-030
    Tentar agendar profissional já ocupado.

                                               8

Esperado:

Sistema rejeita.

16. CONFLITO DE MACA
    CT-031
    Tentar utilizar maca ocupada.

Esperado:

Sistema rejeita.

17. CONFLITO DE HORÁRIO
    CT-032
    Criar dois atendimentos incompatíveis para o mesmo profissional.

Esperado:

Bloqueado.

18. HOME CARE
    CT-033
    Criar Home Care válido.

CT-034
Sem endereço.

Esperado:

Sistema exige endereço.

                                                 9

CT-035
Alterar endereço do Home Care.

CT-036
Cancelar Home Care.

19. DIFERENCIAÇÃO DE MODALIDADE
    CT-037
    Presencial.

Esperado:

Solicita controle de maca.

CT-038
Home Care.

Esperado:

Não consome maca presencial.

20. CLIENTE — AGENDAMENTO
    Testar fluxo completo:

Login
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

                                 10

↓
Confirmação

21. PROFISSIONAL — AGENDAMENTO
    Testar:

    • cliente;
    • serviço;
    • horário;
    • modalidade;
    • conflito;
    • confirmação.

22. ADMINISTRADOR — AGENDAMENTO
    Testar criação completa e capacidade de intervenção.

23. CANCELAMENTO
    CT-039
    Cliente cancela dentro das regras.

CT-040
Profissional cancela.

CT-041
Administrador cancela.

24. STATUS
    Testar transições:

````text id="s6xjbx" PENDENTE ↓ CONFIRMADO ↓ EM ATENDIMENTO ↓ CONCLUÍDO

                                                 11

     E:

     ```text id="zyw1p7"
     CONFIRMADO
     ↓
     CANCELADO

E:

```text id="3ox3b7" CONFIRMADO ↓ AUSENTE

     ---

     # 25. HISTÓRICO

     ## CT-042

     Após concluir atendimento:

     **Esperado:**

     Aparece no histórico.

     ---

     # 26. AUDITORIA

     ## CT-043

     Administrador altera agendamento.

     **Esperado:**

     Ação registrada.

     ---

     # 27. DASHBOARD

     Verificar:

     - indicadores;
     - próximo atendimento;
     - agenda;
     - status;
     - quantidade de atendimentos.

     ---

                                           12

# 28. RESPONSIVIDADE

Testar:

### Desktop

1920px.

### Notebook

1366px.

### Tablet

768px.

### Celular

390px.

### Celular menor

360px.

---

# 29. TESTE MOBILE

Verificar:

- menu;
- agenda;
- formulário;
- calendário;
- botões;
- modais;
- cards;
- tabelas.

---

# 30. ACESSIBILIDADE

Verificar:

- contraste;
- tamanho dos textos;
- foco;
- teclado;
- labels;
- mensagens;

                        13

- navegação.

---

# 31. TESTE DE VALIDAÇÃO

Todos os formulários deverão testar:

- campo obrigatório;
- formato;
- tamanho;
- valores inválidos;
- duplicidade;
- caracteres inadequados.

---

# 32. TESTE DE DUPLICIDADE

## CT-044

Tentar criar dois usuários com o mesmo e-mail.

**Esperado:**

Sistema impede duplicidade.

---

# 33. TESTE DE SESSÃO

## CT-045

Usuário faz logout.

**Esperado:**

Sessão encerrada.

---

## CT-046

Usuário tenta voltar para área protegida.

**Esperado:**

Sistema exige autenticação.

---

                                       14

# 34. TESTE DE SEGURANÇA

Verificar:

- autenticação;
- autorização;
- proteção de rotas;
- validação no backend;
- exposição de dados;
- acesso indevido;
- manipulação de IDs;
- sessão.

---

# 35. REGRA IMPORTANTE

Nunca confiar apenas no frontend.

Exemplo:

Mesmo que o botão "Administrador" não apareça para o cliente, o backend
deverá bloquear o acesso.

---

# 36. TESTE DE BANCO

Verificar:

- relacionamentos;
- integridade;
- registros órfãos;
- duplicidade;
- exclusões;
- histórico.

---

# 37. EXCLUSÃO

Preferir desativação quando a exclusão física puder comprometer histórico.

Exemplo:

Profissional antigo:

```text
status = INATIVO

                                     15

Em vez de apagar o registro.

38. TESTE DE DADOS HISTÓRICOS
Ao desativar:

      • profissional;
      • cliente;
      • serviço;

o histórico deverá permanecer íntegro.

39. TESTE DE PERFORMANCE
Testar:

      • carregamento da agenda;
      • busca;
      • filtros;
      • dashboard;
      • listas.

40. TESTE DE PAGINAÇÃO
Listas grandes deverão possuir paginação ou estratégia equivalente.

41. TESTE DE FILTROS
Verificar combinações:

      • profissional;
      • cliente;
      • serviço;
      • data;
      • modalidade;
      • status;
      • maca.

                                                 16

42. TESTE DE DATA E HORÁRIO
Verificar:

      • horário local;
      • mudança de dia;
      • virada de mês;
      • virada de ano;
      • horário de verão, se aplicável à infraestrutura;
      • timezone.

O sistema deverá trabalhar explicitamente com o timezone definido para a operação.

43. TESTE DE DUPLO CLIQUE
Usuário clica duas vezes em:

        Confirmar agendamento.

Esperado:

Não criar dois agendamentos.

44. TESTE DE REDE
Simular:

      • internet lenta;
      • queda durante operação;
      • timeout.

O sistema não deverá informar sucesso sem confirmação do backend.

45. TESTE DE ERRO DO SERVIDOR
Quando o backend falhar:

Mostrar mensagem amigável.

Não mostrar erro técnico para o cliente.

                                                     17

46. TESTE DE RECUPERAÇÃO
Após erro:

     • usuário pode tentar novamente;
     • dados não devem ser duplicados;
     • sistema deve permanecer consistente.

47. TESTE DE REGRESSÃO
Sempre que uma funcionalidade importante for alterada:

Reexecutar testes críticos.

Principalmente:

     • login;
     • permissões;
     • agenda;
     • macas;
     • Home Care;
     • agendamento.

48. TESTE DE ACEITAÇÃO
Antes de liberar uma versão:

A operação deverá simular situações reais.

Exemplo:

```text id="p3shz4" Cliente agenda ↓ Profissional visualiza ↓ Administrador visualiza ↓ Cliente altera ↓
Administrador verifica ↓ Atendimento acontece ↓ Profissional conclui ↓ Histórico registra

  ---

  # 49. CRITÉRIO DE APROVAÇÃO

  Uma funcionalidade será aprovada quando:

  - testes críticos passaram;
  - nenhum erro bloqueante existir;
  - permissões estiverem corretas;
  - dados estiverem consistentes;

                                                   18

- experiência estiver aceitável.

---

# 50. CLASSIFICAÇÃO DE BUGS

### 🔴 CRÍTICO

Impede operação ou compromete dados.

Exemplo:

> Dois clientes conseguem reservar a mesma maca.

---

### 🟠 ALTO

Funcionalidade importante não funciona.

---

### 🟡 MÉDIO

Problema sem impacto operacional grave.

---

### 🟢 BAIXO

Problema visual ou melhoria.

---

# 51. REGRA PARA BUG CRÍTICO

Bug crítico impede a liberação da versão.

---

# 52. CHECKLIST DE RELEASE

Antes de liberar:

```text
[ ] Login
[ ] Permissões
[ ] Clientes
[ ] Profissionais
[ ] Serviços
[ ] Macas

                                       19

  [ ] Agenda
  [ ] Home Care
  [ ] Cancelamento
  [ ] Histórico
  [ ] Auditoria
  [ ] Responsividade
  [ ] Segurança
  [ ] Backup
  [ ] Testes críticos

53. AMBIENTES
Recomendado:

  DESENVOLVIMENTO
  ↓
  TESTE
  ↓
  PRODUÇÃO

Nunca utilizar produção como ambiente principal de testes.

54. DADOS REAIS
Dados reais não deverão ser utilizados para testes sem necessidade e sem os controles apropriados.

55. BACKUP
Antes de alterações estruturais importantes:

       realizar backup.

56. DOCUMENTAÇÃO DOS TESTES
Cada teste deverá possuir:

     • ID;
     • descrição;
     • resultado;
     • data;

                                                 20

     • responsável;
     • observação.

57. REGISTRO DE RESULTADO
Formato:

```text id="h87d2k" CT-023 Status: PASSOU Data: //____ Observação: 5 atendimentos simultâneos
confirmados.

  ---

  # 58. TESTES AUTOMATIZADOS

  Sempre que possível, automatizar testes para:

  - autenticação;
  - permissões;
  - agendamento;
  - conflitos;
  - capacidade das macas;
  - APIs;
  - regras de negócio.

  ---

  # 59. TESTES MANUAIS

  Continuar utilizando testes manuais para:

  - experiência;
  - layout;
  - usabilidade;
  - responsividade;
  - fluxos completos.

  ---

  # 60. TESTE MAIS IMPORTANTE DO SISTEMA

  O teste de maior prioridade é:

  > **Dois usuários nunca poderão conseguir reservar simultaneamente o mesmo
  recurso incompatível.**

  Isso inclui:

  - profissional;

                                                 21

  - maca;
  - horário;
  - outros recursos futuros.

  ---

  # 61. REGRA FINAL PARA O REPLIT

  O Replit Agent não deverá declarar:

  > "Funcionalidade concluída"

  apenas porque implementou o código.

  Deverá considerar:

  ```text
  CODIFICADO
  +
  TESTADO
  +
  VALIDADO
  =
  CONCLUÍDO

62. PRINCÍPIO FINAL
A qualidade do Fluir da Vida será medida pela confiança que o sistema transmite.

O usuário deverá confiar que:

     • seu horário está reservado;
     • o profissional está correto;
     • a maca está correta;
     • o endereço está correto;
     • o sistema não duplicará seu atendimento;
     • suas informações estão protegidas.

        Confiabilidade é mais importante que quantidade de funcionalidades.

                                                  22
````
