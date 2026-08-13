---
name: F16 — QA de concorrência
description: Lições do teste 6 simultâneas (Doc 17 §46) e limitação da auto-seleção de maca
---
- **Auto-seleção de resource não é concorrência-segura**: `resolveResource` sem `resourceId` escolhe a primeira maca livre por leitura prévia, sem retry — N requisições simultâneas colidem na mesma maca e só ~1-2 vencem (409 nas demais via EXCLUDE). **Why:** observado ao implementar o teste 6→5+1; corrigir exigiria AuthDoc (produção congelada). **How to apply:** testes de concorrência com múltiplas macas devem enviar `resourceId` explícito; qualquer fix futuro precisa de retry/lock na auto-seleção.
- O banco de dev/testes compartilha o seed de produção (Maca 01–05 ACTIVE) — testes não podem assumir "único resource ativo"; fixtures devem disputar recursos explícitos próprios.
- Slots de teste de concorrência por arquivo: d+10..13 (casos A–D), d+20 (6 simultâneas). Timestamps de slot devem ser calculados uma única vez por módulo (risco de virada de meia-noite UTC entre testes).
