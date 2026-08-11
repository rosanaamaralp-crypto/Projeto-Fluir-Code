# FLUIR DA VIDA — DOCUMENTAÇÃO OFICIAL PARA O REPLIT

## Objetivo

Esta pasta contém os 18 documentos fornecidos para o projeto Fluir da Vida, convertidos para Markdown para facilitar leitura, busca e uso pelo Replit Agent.

## Regra de autoridade

Quando houver aparente conflito, o Agent deverá **identificar o conflito e pedir validação**, em vez de escolher ou inventar uma regra. Como orientação operacional, utilizar esta ordem:

1. **Documento 18 — Pacote Mestre para o Replit:** orientação operacional consolidada.
2. **Documento 17 — Plano Oficial de Implementação no Replit:** ordem de execução e checkpoints.
3. **Documento 16 — Especificação de API e Contratos de Dados:** contratos técnicos de integração.
4. **Documento 15 — Mapa de Telas e Navegação:** telas e navegação consolidada.
5. **Documento 14 — Especificação Completa de Regras de Negócio:** regras obrigatórias de negócio.
6. **Documentos 13 a 1:** demais especificações funcionais, técnicas, visuais, testes e planejamento.

Essa ordem é uma orientação para resolução de conflitos; não autoriza o Agent a apagar ou sobrescrever documentos anteriores.

## Observação importante sobre a numeração

Os arquivos foram enviados com uma numeração externa (1 a 18), mas alguns PDFs possuem uma numeração interna diferente. A conversão preserva ambos os identificadores.

Também existem **dois arquivos enviados para o Documento 06 — Home Care**, identificados externamente como arquivos 5 e 6. Eles foram mantidos separadamente para preservar os originais. O Agent deve tratá-los como versões/conteúdo duplicado até que seja feita uma validação humana; não deve criar uma regra nova a partir da duplicidade.

## Índice dos 18 arquivos

| Arquivo enviado | Documento interno | Assunto                                                                                                            | Prioridade/uso |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ | -------------- |
| 01              | Documento 02      | [01-DOCUMENTO-02-REGRAS-DE-NEG-CIO.md](01-DOCUMENTO-02-REGRAS-DE-NEG-CIO.md)                                       | Alta           |
| 02              | Documento 04      | [02-DOCUMENTO-04-MODELO-DE-DADOS.md](02-DOCUMENTO-04-MODELO-DE-DADOS.md)                                           | —              |
| 03              | Documento 03      | [03-DOCUMENTO-03-PERFIS-E-PERMISS-ES.md](03-DOCUMENTO-03-PERFIS-E-PERMISS-ES.md)                                   | CRÍTICA        |
| 04              | Documento 05      | [04-DOCUMENTO-05-AGENDA-E-CONTROLE-DAS-5-MACAS.md](04-DOCUMENTO-05-AGENDA-E-CONTROLE-DAS-5-MACAS.md)               | CRÍTICA        |
| 05              | Documento 06      | [05-DOCUMENTO-06-HOME-CARE.md](05-DOCUMENTO-06-HOME-CARE.md)                                                       | ALTA           |
| 06              | Documento 06      | [06-DOCUMENTO-06-HOME-CARE.md](06-DOCUMENTO-06-HOME-CARE.md)                                                       | ALTA           |
| 07              | Documento 07      | [07-DOCUMENTO-07-FLUXOS-DO-SISTEMA.md](07-DOCUMENTO-07-FLUXOS-DO-SISTEMA.md)                                       | CRÍTICA        |
| 08              | Documento 08      | [08-DOCUMENTO-08-MAPA-DE-TELAS-E-NAVEGA-O.md](08-DOCUMENTO-08-MAPA-DE-TELAS-E-NAVEGA-O.md)                         | CRÍTICA        |
| 09              | Documento 09      | [09-DOCUMENTO-09-DESIGN-SYSTEM-E-IDENTIDADE-VISUAL.md](09-DOCUMENTO-09-DESIGN-SYSTEM-E-IDENTIDADE-VISUAL.md)       | ALTA           |
| 10              | Documento 10      | [10-DOCUMENTO-10-DEFINI-O-DO-MVP-E-ORDEM-DE.md](10-DOCUMENTO-10-DEFINI-O-DO-MVP-E-ORDEM-DE.md)                     | CRÍTICA        |
| 11              | Documento 11      | [11-DOCUMENTO-11-BACKLOG-FUTURO-COMPLETO.md](11-DOCUMENTO-11-BACKLOG-FUTURO-COMPLETO.md)                           | ESTRATÉGICA    |
| 12              | Documento 12      | [12-DOCUMENTO-12-PLANO-DE-TESTES-E-QUALIDADE.md](12-DOCUMENTO-12-PLANO-DE-TESTES-E-QUALIDADE.md)                   | CRÍTICA        |
| 13              | Documento 13      | [13-DOCUMENTO-13-ARQUITETURA-T-CNICA-E-BANCO-DE-DADOS.md](13-DOCUMENTO-13-ARQUITETURA-T-CNICA-E-BANCO-DE-DADOS.md) | CRÍTICA        |
| 14              | Documento 14      | [14-DOCUMENTO-14-ESPECIFICA-O-COMPLETA-DE-REGRAS-DE.md](14-DOCUMENTO-14-ESPECIFICA-O-COMPLETA-DE-REGRAS-DE.md)     | CRÍTICA        |
| 15              | Documento 15      | [15-DOCUMENTO-15-MAPA-COMPLETO-DE-TELAS-E-NAVEGA-O.md](15-DOCUMENTO-15-MAPA-COMPLETO-DE-TELAS-E-NAVEGA-O.md)       | CRÍTICA        |
| 16              | Documento 16      | [16-DOCUMENTO-16-ESPECIFICA-O-DE-API-E-CONTRATOS-DE.md](16-DOCUMENTO-16-ESPECIFICA-O-DE-API-E-CONTRATOS-DE.md)     | CRÍTICA        |
| 17              | Documento 17      | [17-DOCUMENTO-17-PLANO-OFICIAL-DE-IMPLEMENTA-O-NO.md](17-DOCUMENTO-17-PLANO-OFICIAL-DE-IMPLEMENTA-O-NO.md)         | MÁXIMA         |
| 18              | Documento 18      | [18-DOCUMENTO-18-PACOTE-MESTRE-PARA-O.md](18-DOCUMENTO-18-PACOTE-MESTRE-PARA-O.md)                                 | CRÍTICO        |

## Como o Replit Agent deve usar esta pasta

- Ler primeiro `00-INDICE-E-HIERARQUIA-DOS-DOCUMENTOS.md`.
- Ler o Documento 18 antes de implementar.
- Usar o Documento 17 para a ordem das etapas.
- Consultar os documentos específicos antes de alterar regras, API, banco, telas ou permissões.
- Não implementar o backlog futuro apenas porque ele está documentado.
- Não tratar imagens/mockups como regras de negócio.
- Não inventar requisitos ausentes.
- Se encontrar contradição entre documentos, parar a implementação daquela parte e solicitar decisão.

## Regra de implementação

**Documentação → análise → aprovação → implementação → testes → checkpoint → próxima etapa.**
