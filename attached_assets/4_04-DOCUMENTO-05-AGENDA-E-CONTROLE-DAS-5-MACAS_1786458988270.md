---
source_sequence: "04"
internal_document: "Documento 05"
source_pdf: "4 - Agenda e Controle das 5 Macas.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 05 — AGENDA E CONTROLE DAS 5 MACAS

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 05 — AGENDA E CONTROLE DAS 5 MACAS
Versão: 1.0
Status: Regra oficial para desenvolvimento
Prioridade: CRÍTICA

1. OBJETIVO
   Definir como o sistema deverá controlar:

   • disponibilidade dos profissionais;
   • horários;
   • agendamentos;
   • cinco macas;
   • conflitos;
   • atendimento presencial;
   • Home Care;
   • alterações;
   • cancelamentos;
   • remanejamentos.

Este documento deverá ser considerado uma das principais referências do sistema.

2. CONCEITO DA AGENDA
   A agenda não é apenas uma lista de horários.

Ela representa a combinação de:

Profissional + Cliente + Serviço + Horário + Recurso

No presencial:

      Profissional + Cliente + Serviço + Horário + Maca

No Home Care:

      Profissional + Cliente + Serviço + Horário + Endereço

                                                   1

3. CAPACIDADE DO ESPAÇO
O Fluir da Vida possui atualmente:

5 macas

Portanto, em condições normais, o espaço poderá realizar até:

5 atendimentos presenciais simultâneos.

Isso não significa necessariamente cinco atendimentos simultâneos para cada profissional.

Cada profissional possui sua própria disponibilidade.

4. MACAS
   As cinco macas deverão ser cadastradas como recursos.

````text id="r0ecjp" Maca 01 Maca 02 Maca 03 Maca 04 Maca 05

  Não deverão existir cinco estruturas diferentes no banco.

  Todas serão registros da entidade:

  **Resource / Recurso**

  ---

  # 5. STATUS DA MACA

  Cada maca poderá possuir:

  - Disponível;
  - Reservada;
  - Em utilização;
  - Bloqueada;
  - Inativa.

  No MVP, o controle poderá ser simplificado, utilizando principalmente:

  **Disponível / Ocupada / Bloqueada.**

  ---

  # 6. RESERVA DA MACA

  O cliente não deverá precisar escolher a maca.

                                                   2

  Quando um atendimento presencial for criado, o sistema deverá procurar uma
  maca disponível.

  Exemplo:

  ```text id="lq6cv1"
  Maca 01 — ocupada
  Maca 02 — ocupada
  Maca 03 — livre
  Maca 04 — ocupada
  Maca 05 — livre

O sistema poderá reservar:

Maca 03

7. ORDEM DE ALOCAÇÃO
Inicialmente, recomenda-se utilizar a estratégia:

primeira maca disponível.

Exemplo:

```text id="4iv0hb" Maca 01 Maca 02 Maca 03 ← primeira disponível Maca 04 Maca 05

  O sistema reserva a Maca 03.

  Essa estratégia poderá ser alterada futuramente.

  ---

  # 8. VISUALIZAÇÃO ADMINISTRATIVA

  O administrador deverá conseguir visualizar algo semelhante a:

  ```text id="0x8l0a"
  HORÁRIO       MACA 01               MACA 02           MACA 03       MACA 04       MACA 05

  08:00             Ana               João              Livre         Maria         Livre
  09:00             Ana               João              Pedro         Maria         Carla
  10:00             Livre             João              Pedro         Livre          Carla

Isso permitirá entender rapidamente a ocupação física do espaço.

                                                    3

9. VISUALIZAÇÃO DO PROFISSIONAL
O profissional não precisa necessariamente visualizar todas as macas.

Sua visão principal deverá ser:

        Meu atendimento → Horário → Cliente → Maca atribuída

Exemplo:

14:00

Maria Silva
Atendimento Individual
Maca 03

10. VISUALIZAÇÃO DO CLIENTE
O cliente não precisa escolher a maca.

O sistema deverá apresentar:

        Atendimento presencial confirmado.

O recurso físico deverá permanecer como informação operacional interna.

11. DISPONIBILIDADE DO PROFISSIONAL
Cada profissional possuirá uma disponibilidade recorrente.

Exemplo:

```text id="z0j0te" SEGUNDA 08:00 — 18:00

TERÇA 08:00 — 18:00

QUARTA 14:00 — 20:00

  ---

  # 12. HORÁRIOS ESPECÍFICOS

  O sistema não deverá criar todos os horários previamente.

                                                  4

  A disponibilidade deverá servir como base para gerar horários possíveis.

  Exemplo:

  Profissional:

  **08:00 — 12:00**

  Serviço:

  **50 minutos**

  Sistema poderá oferecer:

  ```text id="o8x34v"
  08:00
  08:50
  09:40
  10:30
  11:20

A lógica poderá posteriormente considerar intervalos configuráveis.

13. DURAÇÃO DO SERVIÇO
Cada serviço terá uma duração.

Exemplo:

```text id="c4z2pa" Atendimento Individual 50 minutos

  Se começa às:

  **14:00**

  termina às:

  **14:50**

  O profissional ficará ocupado nesse intervalo.

  ---

  # 14. CONFLITO DE PROFISSIONAL

  Nunca permitir:

                                                  5

  ```text id="s8ydg4"
  14:00–14:50
  Ana → Maria

  14:20–15:10
  Ana → João

Existe sobreposição.

O segundo atendimento deverá ser bloqueado.

15. CONFLITO DE MACA
Nunca permitir:

```text id="1yyflb" Maca 03 14:00–14:50 Maria

Maca 03 14:30–15:20 João

  Existe sobreposição.

  O segundo atendimento deverá ser rejeitado.

  ---

  # 16. CONFLITO DE CLIENTE

  O sistema também deverá impedir que o mesmo cliente possua dois atendimentos
  simultâneos.

  Exemplo:

  ```text id="7zkh9h"
  Maria
  14:00–14:50
  Profissional A

  Maria
  14:00–14:50
  Profissional B

O segundo agendamento deverá ser bloqueado.

                                                6

17. VALIDAÇÃO TRIPLA
Antes de confirmar atendimento presencial, validar:

Profissional

Está disponível?

Cliente

Já possui atendimento nesse horário?

Maca

Existe recurso livre?

Somente se os três estiverem disponíveis:

CONFIRMAR

18. HOME CARE
No Home Care:

não reservar maca.

A validação deverá considerar:

      • profissional;
      • cliente;
      • horário;
      • duração;
      • endereço;
      • eventual intervalo/deslocamento.

19. HOME CARE E DESLOCAMENTO
No MVP, o sistema deverá pelo menos impedir sobreposição de horários.

Exemplo:

```text id="x4px11" 14:00–15:00 Home Care

14:30–15:20 Atendimento presencial

                                                  7

  O profissional não poderá realizar os dois.

  ---

  # 20. FUTURO — TEMPO DE DESLOCAMENTO

  Posteriormente poderemos acrescentar:

  ```text id="vcy8v1"
  Atendimento
  14:00–15:00

  Deslocamento
  15:00–15:30

  Próximo atendimento
  15:30–16:30

Isso será desenvolvido na fase avançada de Home Care.

21. BLOQUEIO DE MACA
O administrador poderá bloquear uma maca.

Exemplos:

     • manutenção;
     • limpeza;
     • problema físico;
     • indisponibilidade.

Se uma maca estiver bloqueada:

        O sistema não deverá utilizá-la automaticamente.

22. BLOQUEIO DE PROFISSIONAL
O profissional poderá bloquear horários.

O administrador também poderá realizar bloqueios.

                                                  8

23. FERIADOS E DATAS ESPECIAIS
A arquitetura deverá permitir futuramente:

     • feriados;
     • férias;
     • datas especiais;
     • horários excepcionais.

24. AGENDAMENTO RECORRENTE
Não será obrigatório no MVP.

Mas a arquitetura deverá permitir futuramente:

       Toda segunda-feira às 10h durante 10 semanas.

Isso deverá criar agendamentos individuais, permitindo alteração ou cancelamento independente.

25. ALTERAÇÃO DE HORÁRIO
Quando um atendimento for alterado:

    1. manter o registro;
    2. validar novo horário;
    3. verificar profissional;
    4. verificar cliente;
    5. verificar maca;
    6. confirmar alteração;
    7. registrar histórico.

26. TROCA DE MACA
O administrador poderá alterar a maca de um atendimento quando necessário.

Exemplo:

Maca 02 → Maca 04

O sistema deverá validar se a Maca 04 está disponível naquele intervalo.

                                                   9

27. REMANEJAMENTO
O remanejamento deverá ser tratado como uma alteração controlada.

Exemplo:

```text id="x0e8sj" Maria 14:00 Maca 03

↓

Maria 15:00 Maca 04

    O sistema deverá validar tudo novamente.

    ---

    # 28. CANCELAMENTO

    Quando um atendimento for cancelado:

    ```text id="8u0sv0"
    status = CANCELLED

O sistema deverá liberar:

      • horário do profissional;
      • horário do cliente;
      • maca.

29. ATENDIMENTO CONCLUÍDO
Após o atendimento:

```text id="x4m7o1" status = COMPLETED

    O registro permanece no histórico.

    ---

    # 30. AUSÊNCIA

    Poderá existir:

                                               10

  ```text id="s9w1s3"
  status = NO_SHOW

Isso será importante para futuros relatórios.

31. PENDENTE
O sistema poderá utilizar:

```text id="qz4u4m" status = PENDING

  quando houver alguma confirmação necessária.

  ---

  # 32. CONCORRÊNCIA

  Essa é uma regra crítica.

  Imagine:

  **Cliente A** e **Cliente B** tentando reservar simultaneamente o último
  horário disponível.

  O sistema deverá realizar uma operação atômica.

  Apenas uma reserva será confirmada.

  A outra receberá:

  > Este horário acabou de ser reservado. Escolha outra opção.

  Essa proteção deverá existir no backend/banco.

  ---

  # 33. NÃO CONFIAR NA INTERFACE

  Mesmo que a interface mostre:

  > Horário disponível.

  O backend deverá verificar novamente no momento da confirmação.

  Isso evita conflitos causados por:

  - duas pessoas usando o mesmo horário;

                                                11

- múltiplas abas;
- atraso de rede;
- alteração feita por outro usuário.

---

# 34. FILTROS DA AGENDA ADMINISTRATIVA

Filtros previstos:

- data;
- profissional;
- cliente;
- serviço;
- maca;
- modalidade;
- status.

---

# 35. VISUALIZAÇÕES

### DIA

Principal visão operacional.

### SEMANA

Planejamento.

### MÊS

Visão geral.

---

# 36. AGENDA POR PROFISSIONAL

O administrador poderá selecionar:

**Ana**

e visualizar somente a agenda dela.

---

# 37. AGENDA POR MACA

O administrador poderá selecionar:

**Maca 03**

                                       12

  e visualizar:

  - horários ocupados;
  - profissional;
  - cliente;
  - serviço;
  - status.

  ---

  # 38. VISÃO GERAL DAS MACAS

  Uma tela específica poderá apresentar:

  ```text id="y7i8qf"
  MACA 01   🟢 Disponível
  MACA 02   🔴 Ocupada
  MACA 03   🔴 Ocupada
  MACA 04   🟢 Disponível
  MACA 05   🟡 Bloqueada

Ao clicar:

Detalhes da ocupação.

39. EXPERIÊNCIA DO PROFISSIONAL
A agenda do profissional deverá priorizar:

      • próximo atendimento;
      • cliente;
      • horário;
      • serviço;
      • modalidade;
      • maca, quando presencial.

Não sobrecarregar a tela com informações administrativas.

40. EXPERIÊNCIA DO CLIENTE
O cliente deverá enxergar apenas:

```text id="4f6f4c" Serviço ↓ Profissional ↓ Data ↓ Horário ↓ Confirmar

                                                  13

  A complexidade das macas deverá ficar invisível.

  ---

  # 41. CANCELAMENTO COM LIBERAÇÃO

  Quando cancelar:

  ```text id="j1w4pg"
  Agendamento
  ↓
  Cancelado
  ↓
  Maca liberada
  ↓
  Horário liberado
  ↓
  Disponível novamente

42. HISTÓRICO
O sistema nunca deverá apagar o histórico para simplesmente liberar horário.

O agendamento permanece.

O recurso é liberado através do status.

43. REGRA PARA FUTURAS SALAS
Embora atualmente existam cinco macas, a estrutura deverá permitir futuramente:

```text id="y5y7a1" Sala 01 Sala 02 Cabine 01 Equipamento X Maca 06

  Sem reconstruir o sistema.

  ---

  # 44. PRINCÍPIO DE ARQUITETURA

  A maca é um:

  > **RECURSO**

  e não uma entidade estrutural fixa do sistema.

                                                 14

Isso permitirá crescimento.

---

# 45. REGRA PARA O REPLIT AGENT

Antes de implementar qualquer funcionalidade de agenda:

1. consultar este documento;
2. consultar as regras de negócio;
3. consultar permissões;
4. validar conflitos;
5. validar impacto no banco;
6. implementar;
7. criar testes;
8. informar o que foi alterado.

Nunca implementar agenda apenas no frontend.

---

# 46. TESTES OBRIGATÓRIOS

O Agent deverá criar testes para:

### Teste 01

Profissional sem disponibilidade.

**Resultado:** não pode agendar.

### Teste 02

Profissional com outro atendimento.

**Resultado:** conflito.

### Teste 03

Maca ocupada.

**Resultado:** procurar outra maca.

### Teste 04

Cinco macas ocupadas.

**Resultado:** nenhum novo atendimento presencial naquele horário.

### Teste 05

                                      15

Home Care.

**Resultado:** não reservar maca.

### Teste 06

Cliente com atendimento simultâneo.

**Resultado:** bloquear.

### Teste 07

Cancelamento.

**Resultado:** liberar recursos.

### Teste 08

Remanejamento.

**Resultado:** validar novo horário.

### Teste 09

Duas reservas simultâneas.

**Resultado:** apenas uma confirmada.

---

# 47. CRITÉRIO DE ACEITE

O motor da agenda será considerado aprovado quando:

> **Nenhum cenário permitido gerar conflito de profissional, cliente ou
maca.**

E:

> **Nenhum atendimento válido deixar de encontrar disponibilidade quando
houver recurso disponível.**

---

# 48. RESUMO OPERACIONAL

```text
CLIENTE
   ↓
SERVIÇO

                                        16

     ↓
  PROFISSIONAL
     ↓
  DATA
     ↓
  HORÁRIO
     ↓
  VALIDAÇÃO
      ├── Profissional?
      ├── Cliente?
      ├── Maca?
      └── Modalidade?
     ↓
  CONFIRMAÇÃO
      ↓
  AGENDAMENTO

Para Home Care:

  CLIENTE
      ↓
  SERVIÇO
     ↓
  PROFISSIONAL
     ↓
  DATA
     ↓
  HORÁRIO
     ↓
  ENDEREÇO
     ↓
  VALIDAÇÃO
     ↓
  CONFIRMAÇÃO

49. PRINCÍPIO FINAL
A agenda deve ser:

simples para o usuário, inteligente nos bastidores e rigorosa contra conflitos.

Esse princípio é obrigatório para o desenvolvimento do Fluir da Vida Oficial.

                                                   17
````
