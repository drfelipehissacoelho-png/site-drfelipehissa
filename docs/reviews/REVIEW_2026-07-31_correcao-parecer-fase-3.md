# Revisão técnica — correção do parecer independente da Fase 3

**Data:** 2026-07-31
**Escopo:** correções de procedência, impacto e verificação das regras RTDB; sem proposta nem publicação de regra.
**Estado:** aguardando confirmação manual da baseline e nova revisão independente antes de alterar autorização remota.

## 1. Objetivo da alteração

Incorporar os achados V1–V6 do parecer independente: não tratar a cópia recebida como regra de produção confirmada, registrar os impactos de backup e pagamentos, evitar uma proposta prematura de permissões e criar evidência comportamental sem escrita real.

## 2. Arquivos modificados

- `firebase.database.rules.json` foi renomeado para `firebase.database.rules.unverified.json`.
- `docs/PROJECT_CONTEXT.md`
- `docs/CHANGELOG_AI.md`
- `docs/architecture/README.md`
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`
- `docs/architecture/FIREBASE_RTD_RULES_VERIFICATION.md`
- `docs/reviews/REVIEW_2026-07-31_fase-3-baseline-regras-rtdb.md`
- `docs/reviews/REVIEW_2026-07-31_correcao-parecer-fase-3.md`

O parecer independente original foi preservado sem alteração.

## 3. Decisões arquiteturais

- A cópia de regras não é usada como base de implantação até ser confirmada no Rules Playground e por sinais do backup local.
- Nenhuma regra permissiva foi criada para liberar `quote_payments` ou `recorrentes` antes de confirmar se a cópia descreve o ambiente publicado.
- A matriz de teste é comportamental: compara allow/deny das regras publicadas com a previsão da cópia, sem gravar dados reais.
- A eventual reconciliação de pagamentos históricos foi separada da correção de autorização para não alterar dados como efeito colateral de deploy.

Alternativa possivelmente melhor: usar um ambiente Firebase isolado para testar regras. Isso requer nova infraestrutura e não foi presumido. O Rules Playground oferece uma verificação proporcional e sem deploy para a premissa atual.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois |
| --- | --- | --- |
| Referência de regras | Arquivo local podia ser interpretado como fonte confirmada. | Arquivo traz `unverified` no nome e aponta para procedimento explícito de confirmação. |
| Verificação de produção | Não havia roteiro reproduzível. | Backup local e Rules Playground fornecem matriz allow/deny sem escrita real. |
| Restauração de backup | A dependência de `quote_payments` e `recorrentes` não estava registrada. | O risco de rejeição atômica integral está documentado. |
| Dados históricos | Possível divergência entre receita e pagamento não estava delimitada. | Ficou classificada como hipótese que exige quantificação antes de qualquer reconciliação. |

## 5. Benefícios

- Evita derivar regras novas de artefato possivelmente incorreto.
- Expõe uma possível indisponibilidade de pagamento e restauração antes de merge/deploy.
- Reduz risco de manipular dados históricos sem diagnóstico mensurável.
- Documenta o impacto de permissões em nível de coleção e de leitura na raiz.

## 6. Possíveis riscos

- A verificação manual pode ser executada com configuração ou identidade errada e gerar falsa confirmação; a evidência deve registrar data, cenário e conta simulada.
- O backup local contém dados pessoais; ele não deve ser anexado a relatórios, conversas ou repositório.
- Renomear o arquivo local exige atualizar qualquer referência externa eventual; a busca no repositório foi atualizada, mas integrações fora dele não foram inspecionadas.
- O Rules Playground confirma autorização, não valida a experiência offline, reconexão ou dados legados reais.

## 7. Casos de teste executados

- Busca de todas as referências ao nome da baseline no repositório antes da renomeação.
- Inspeção de `BACKUP_RESTORE_NODES` e `importarJSON()`: `quote_payments` e `recorrentes` participam do mesmo `dbRef.update(nodes)`.
- Inspeção de `salvarPagamento()`, `excluirPagamento()` e das funções de recorrência contra a cópia de regras.
- Criação da matriz de cenários allow/deny prevista, sem executar escrita real.
- Parse JSON da baseline não verificada e `git diff --check` dos arquivos alterados.

## 8. Limitações conhecidas

- A procedência remota da baseline continua não confirmada.
- Não houve execução do Rules Playground, exportação de backup, reconciliação histórica, teste Firebase real ou deploy.
- A correção não muda o comportamento da aplicação nem restaura a escrita de pagamentos ou recorrências.
- A segregação de leitura exigirá mudança do cliente porque a aplicação ainda escuta `consultorio` na raiz.

## 9. Perguntas específicas para revisão

1. A matriz proposta no Rules Playground é suficiente para confirmar a baseline ou deve incluir também simulação de remoção em coleção e atualização multi-path?
2. Depois de confirmar a baseline, o reparo mínimo de indisponibilidade deve ser separado da futura segregação de leitura para reduzir risco de deploy?
3. Qual sinal de backup, sem expor dados pessoais, será aceito para estimar o passivo histórico entre `receitaGeradaId` e `quote_payments`?
4. Antes de reduzir a leitura da secretária, qual conjunto mínimo de nós a interface deve passar a escutar individualmente?
5. A migração futura de e-mail para `uid`/papéis deve anteceder ou acompanhar a primeira correção de permissão?
