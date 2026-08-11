---
source_sequence: "05"
internal_document: "Documento 06"
source_pdf: "5 - Fluir da Vida Oficial — Home Care.pdf"
---

# FLUIR DA VIDA OFICIAL

## Documento 06 — HOME CARE

> **Nota de conversão:** este arquivo foi convertido do PDF original para Markdown para uso como documentação de projeto no Replit. O conteúdo funcional foi preservado; a formatação pode ter pequenas diferenças de extração.

FLUIR DA VIDA OFICIAL
DOCUMENTO 06 — HOME CARE
Versão: 1.0
Status: Regra oficial do sistema
Prioridade: ALTA

1. OBJETIVO
   Permitir que profissionais do Fluir da Vida Oficial realizem atendimentos fora do espaço físico,
   mantendo a mesma organização da agenda utilizada nos atendimentos presenciais.

O Home Care deverá fazer parte da agenda principal.

Não será criado um sistema separado.

2. MODALIDADES DE ATENDIMENTO
   O sistema terá inicialmente duas modalidades:

PRESENCIAL

Atendimento realizado no Fluir da Vida.

Necessita de uma das cinco macas.

HOME CARE

Atendimento realizado no endereço do cliente.

Não utiliza maca.

3. REGRA PRINCIPAL
   Todo agendamento deverá possuir uma modalidade:

IN_PERSON
HOME_CARE

A modalidade deverá ser definida no momento da criação do agendamento.

                                                    1

4. ATENDIMENTO PRESENCIAL
Quando:

modality = IN_PERSON

o sistema deverá:

     • verificar disponibilidade do profissional;
     • verificar disponibilidade do cliente;
     • verificar serviço;
     • verificar maca;
     • reservar uma maca.

5. ATENDIMENTO HOME CARE
Quando:

modality = HOME_CARE

o sistema deverá:

     • verificar disponibilidade do profissional;
     • verificar disponibilidade do cliente;
     • verificar serviço;
     • registrar endereço;
     • não reservar maca.

6. EXPERIÊNCIA DO PROFISSIONAL
Ao criar um atendimento, o profissional verá:

Modalidade

Presencial

ou

Home Care

                                                    2

7. FLUXO PRESENCIAL

````text id="5j9z1h" Novo agendamento ↓ Cliente ↓ Serviço ↓ Presencial ↓ Data ↓ Horário ↓ Sistema
encontra maca ↓ Confirmar

  ---

  # 8. FLUXO HOME CARE

  ```text id="e3r3bc"
  Novo agendamento
            ↓
  Cliente
            ↓
  Serviço
          ↓
  Home Care
          ↓
  Endereço
            ↓
  Data
            ↓
  Horário
          ↓
  Validar profissional
          ↓
  Confirmar

9. ENDEREÇO
O Home Care deverá possuir um endereço associado.

Inicialmente:

     • endereço;
     • número;
     • complemento;
     • bairro;
     • cidade;
     • estado;
     • CEP;
     • referência.

                                                3

10. ENDEREÇO DO CLIENTE
Quando possível, o sistema poderá utilizar o endereço previamente cadastrado pelo cliente.

O profissional ou administrador poderá confirmar o endereço no momento do agendamento.

11. MULTIPLOS ENDEREÇOS
O cliente poderá futuramente possuir mais de um endereço.

Exemplo:

     • Casa;
     • Trabalho;
     • Outro.

No MVP, poderá ser utilizado apenas um endereço principal.

A estrutura deverá permitir expansão futura.

12. PRIVACIDADE
O endereço de Home Care deverá ser visível somente para usuários que realmente necessitem dessa
informação.

Cliente

Visualiza seus próprios endereços.

Profissional

Visualiza o endereço dos seus atendimentos.

Administrador

Pode visualizar os endereços necessários para gestão.

Outros clientes nunca terão acesso.

13. AGENDA DO PROFISSIONAL
Os Home Care deverão aparecer na mesma agenda dos atendimentos presenciais.

                                                  4

Porém, terão identificação visual diferente.

Exemplo:

```text id="mb2h8j" 14:00 Maria Silva Drenagem 🏠 Home Care

  E:

  ```text id="14p4x0"
  15:30
  João Silva
  Atendimento Individual
  📍 Fluir da Vida
  Maca 03

14. DIFERENCIAÇÃO VISUAL
A interface deverá deixar claro:

🏠 Home Care

Atendimento externo.

🏥 Presencial

Atendimento no espaço.

Os símbolos acima são conceituais; o Design System poderá definir os ícones finais.

15. MACAS
Home Care:

Não utiliza maca.

Portanto:

```text id="0x8h6c" resource_id = NULL

  ---

  # 16. CONFLITO DE HORÁRIO

  O profissional não poderá possuir:

                                                   5

  ```text id="j7qk5e"
  14:00–15:00
  Home Care

  14:30–15:20
  Presencial

Mesmo que exista uma maca disponível.

O conflito é do profissional.

17. CONFLITO DO CLIENTE
O mesmo cliente não poderá possuir dois atendimentos simultâneos.

18. INTERVALO ENTRE ATENDIMENTOS
No MVP, o sistema deverá garantir apenas ausência de sobreposição.

Exemplo:

```text id="2s5q8z" 14:00–15:00 Home Care

15:00–15:50 Presencial

  Tecnicamente os horários não se sobrepõem.

  Porém, o sistema deverá estar preparado para futuramente considerar
  deslocamento.

  ---

  # 19. FUTURO — TEMPO DE DESLOCAMENTO

  Posteriormente poderemos definir:

  ```text id="c8r3af"
  Atendimento:
  14:00–15:00

  Deslocamento:
  15:00–15:30

                                                 6

  Próximo atendimento:
  15:30–16:20

Nesse estágio, o sistema deverá impedir que o profissional seja agendado em uma sequência
fisicamente inviável.

20. FUTURO — MAPAS
Possibilidade de integração com mapas.

Objetivos:

     • localizar endereço;
     • calcular distância;
     • estimar tempo;
     • organizar visitas.

21. FUTURO — ROTAS
O sistema poderá futuramente apresentar:

```text id="p1w0u3" 09:00 — Cliente A ↓ 10:30 — Cliente B ↓ 13:00 — Cliente C ↓ 15:00 — Cliente D

  E sugerir uma ordem mais eficiente.

  ---

  # 22. FUTURO — GEOLOCALIZAÇÃO

  A arquitetura deverá permitir futuramente armazenar:

  - latitude;
  - longitude.

  Não é obrigatório implementar isso no MVP.

  ---

  # 23. FUTURO — DISTÂNCIA

  Poderemos futuramente calcular:

  - distância entre clientes;
  - distância até o espaço;
  - distância entre atendimentos;

                                                  7

- tempo estimado.

---

# 24. FUTURO — AGENDA INTELIGENTE

Em uma fase avançada, o sistema poderá sugerir:

> "Existe um atendimento Home Care às 14h em Guarulhos. Um atendimento em
outra região às 14h40 não é recomendado devido ao deslocamento."

Essa funcionalidade pertence ao backlog futuro.

---

# 25. HOME CARE PELO CLIENTE

Quando o cliente estiver realizando seu próprio agendamento, poderá
selecionar:

**Como deseja ser atendido?**

- No Fluir da Vida;
- Home Care.

O sistema somente exibirá Home Care se:

- o serviço permitir;
- o profissional realizar Home Care;
- existir disponibilidade.

---

# 26. HOME CARE PELO PROFISSIONAL

O profissional poderá agendar diretamente para seu cliente.

Fluxo:

```text id="9rjv0v"
Cliente
↓
Serviço
↓
Home Care
↓
Endereço
↓
Data
↓
Horário

                                       8

  ↓
  Confirmar

27. HOME CARE PELO ADMINISTRADOR
O administrador poderá criar e alterar Home Care.

Terá visão:

      • profissional;
      • cliente;
      • serviço;
      • endereço;
      • data;
      • horário;
      • status.

28. ALTERAÇÃO DE HOME CARE
Poderá alterar:

      • endereço;
      • data;
      • horário;
      • serviço;
      • profissional;
      • observação.

Qualquer alteração deverá executar novamente as validações.

29. CANCELAMENTO
Ao cancelar Home Care:

      • liberar horário do profissional;
      • liberar horário do cliente;
      • manter histórico;
      • registrar cancelamento.

Não existe maca para liberar.

                                                    9

30. REMANEJAMENTO
Um Home Care poderá ser remanejado para:

Outro horário

ou

Atendimento presencial

ou

Outro profissional

quando permitido pelo administrador.

O sistema deverá validar novamente.

31. STATUS
O Home Care utilizará os mesmos status gerais da agenda:

     • Pendente;
     • Confirmado;
     • Em atendimento;
     • Concluído;
     • Cancelado;
     • Ausente.

32. NOTIFICAÇÕES FUTURAS
Home Care poderá futuramente gerar notificações específicas:

      Seu profissional está a caminho.

      Previsão de chegada: 15 minutos.

Essa funcionalidade não faz parte do MVP.

33. CHECK-IN FUTURO
Poderemos futuramente permitir:

                                                10

Iniciar atendimento

e:

Finalizar atendimento

Isso ajudará a registrar duração real.

34. HISTÓRICO
Cada Home Care deverá permanecer no histórico.

Registrar:

     • profissional;
     • cliente;
     • serviço;
     • endereço;
     • data;
     • horário;
     • status;
     • alterações.

35. RELATÓRIOS FUTUROS
O sistema poderá futuramente mostrar:

     • quantidade de Home Care;
     • Home Care por profissional;
     • regiões atendidas;
     • horários;
     • cancelamentos;
     • faltas;
     • tempo médio de deslocamento;
     • quantidade de visitas.

36. REGRA DE SEGURANÇA
O endereço de Home Care é informação privada.

Não poderá ser retornado para:

     • outros clientes;
     • profissionais sem relação com o atendimento;

                                                 11

      • usuários sem autorização.

37. REGRA DE ARQUITETURA
Home Care não deverá ser criado como um sistema separado.

Deverá utilizar:

mesma agenda + mesma entidade de agendamento + modalidade diferente.

Isso simplifica a manutenção.

38. MODELO CONCEITUAL
text id="2kwm8y"
                     AGENDAMENTO
               │
      ┌───────────┴───────────┐
      │                 │
      PRESENCIAL                      HOME CARE
      │                 │
          MACA                      ENDEREÇO

39. REGRA PARA O REPLIT AGENT
O Agent deverá:

      • utilizar a mesma entidade de agendamento;
      • utilizar modalidade;
      • não criar banco separado para Home Care;
      • não reservar maca para Home Care;
      • validar conflitos de profissional;
      • validar conflitos de cliente;
      • preservar histórico;
      • respeitar permissões.

40. MVP — OBRIGATÓRIO
O MVP deverá possuir:

      • modalidade Home Care;
      • endereço;

                                                12

     • agendamento;
     • alteração;
     • cancelamento;
     • visualização na agenda;
     • diferenciação visual;
     • validação de conflitos;
     • profissional agendando;
     • administrador agendando;
     • cliente agendando, quando disponível.

41. BACKLOG HOME CARE
Futuro:

     • múltiplos endereços;
     • mapas;
     • latitude/longitude;
     • rotas;
     • tempo de deslocamento;
     • otimização;
     • geolocalização;
     • previsão de chegada;
     • check-in;
     • check-out;
     • notificações "a caminho";
     • relatórios avançados.

42. PRINCÍPIO FINAL
O Home Care deverá ser:

      tão simples de agendar quanto um atendimento presencial, mas preparado para
      evoluir para uma gestão inteligente de deslocamentos.

                                               13
````
