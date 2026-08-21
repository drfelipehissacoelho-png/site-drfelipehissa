# REVIEW 2026-08-20 — Contagens do backup (TAREFA 2) + limpeza de procedimentos

- **Data:** 2026-08-20
- **Autor:** Kimi
- **Insumos:** backup `backup_2026-08-20.json` exportado pelo titular (processado via `tools/contar_passivo_rtdb.js`; a cópia no repositório foi **removida** após a contagem — dados pessoais não ficam no git) + screenshot da aba Tabela reportando duplicados/CAPS.

---

## 1. TAREFA 2 — Contagens agregadas do backup

| Métrica | Valor |
|---|---|
| nós em `quote_payments` | **0** |
| nós em `recorrentes` | **0** |
| orçamentos ativos | 50 |
| orçamentos com `receitaGeradaId` | 0 |
| lançamentos com `linked_pay_id` | **6** |
| orçamentos sem `quote_payment` (passivo histórico) | 50 |
| orçamentos com status "aceito" | 2 |

## 2. Leitura do sinal de procedência — o achado operacional grave

`quote_payments` **vazio** com 2 orçamentos aceitos **e** 6 lançamentos com `linked_pay_id` é a assinatura exata do gap documentado:

- O fluxo de pagamento **antes da atomicidade** gravava `lancamentos` (permitido) e `quote_payments` (negado) em chamadas separadas — os 6 lançamentos órfãos são o resíduo: a receita entrou, o registro de pagamento foi negado silenciosamente.
- **Depois** da atomicidade (Fase 1), o `update()` multi-path é tudo-ou-nada: com `quote_payments` negado, **o pagamento inteiro falha** — nem lançamento, nem status, nem log.
- `recorrentes` zerado do mesmo modo: o cadastro provavelmente nunca persistiu (escrita negada).

**Conclusão:** evidência forte de que a baseline **ESTÁ publicada em produção** e de que **o modal "+ Pagar" e as recorrentes estão quebrados em produção agora**. O teste do Playground segue recomendado antes de qualquer deploy de regras, mas a direção já não é ambígua: o endurecimento precisa **adicionar** `.write` (com `.validate`) para `quote_payments` e `recorrentes` — alça do executor Claude, agora destravada.

## 3. Duplicados e CAPS na aba Tabela — diagnóstico

Via backup (somente nomes de procedimentos — nenhum dado pessoal):

| Causa | Evidência |
|---|---|
| Entradas "(cópia)" | `duplicarProc()` cria "X (cópia)" e **não havia UI para remover/arquivar** — 2 cópias ativas |
| Variante com typo | "ABDOMINOPLASTIA COM MASTO**PLASTIA**..." (5x em orçamentos) e "ABDOMINOPLASTIA COM MASTO**PEXIA**..." (1x) — ambas com preço hospitalar e config |
| CAPSLOCK | procedimentos custom foram digitados em caixa alta; o seed usa formato título |
| Falsa pista | as 12 chaves "órfãs" de `hospitalPrices` ("Rinoplastia" etc.) correspondem aos nomes do seed `PROC_ORC` — não são órfãs de verdade |

## 4. Correções implementadas (front-end, sem caminho novo no RTDB)

| Mudança | Detalhe |
|---|---|
| **Arquivar/reativar procedimento** | Botões 📦/♻️ na tabela de config de procedimentos (só para customs com `_fbKey`; seed é estrutural). Grava `procedures/<fbKey>/active` — campo e caminho já existentes e já honrados por `getAllProcs`. Confirmação modal + log de auditoria. Toggle "📦 Mostrar arquivados (N)" para reativar. |
| **Display title-case** | `_procDisplay()`: nomes 100% CAPS aparecem como "Abdominoplastia com Mastopexia sem Prótese". **Cosmético apenas** — chaves e valores gravados não mudam, vínculos históricos intactos. Aplicado em: tabela hospitalar, tabela de config, select de lançamento, select do orçamento, chips de hospital. Badge "📦 arquivado" nas linhas arquivadas (opacidade reduzida). |

**Validação:** `node --check` OK; `git diff --check` limpo; `_procDisplay` testado com os nomes reais do backup (saída correta, incluindo conectivos pt-BR). Não testado em navegador.

## 5. Ação recomendada ao titular (na UI, após validar)

1. Aba **Tabela** → seção de config de procedimentos → arquivar (📦):
   - `ABDOMINOPLASTIA COM MASTOPEXIA SEM PRÓTESE (cópia)`
   - `ABDOMINOPLASTIA COM MASTOPLASTIA SEM PRÓTESE (cópia)`
   - `ABDOMINOPLASTIA COM MASTOPLASTIA SEM PRÓTESE` (typo; a grafia correta já existe com preço e config)
2. O histórico dos orçamentos antigos **não muda** — eles guardam o nome em snapshot.
3. Reversível a qualquer momento via "Mostrar arquivados" → ♻️.

## 6. Deliberadamente pendente

- Playground dos 6 casos (confirmação final de procedência) — executor Claude + titular logado.
- Proposta de regras endurecidas (`.write` + `.validate` para `quote_payments`/`recorrentes`) — executor Claude, após o Playground.
- Renomear dados históricos CAPS → título: **não recomendado** (vínculo por nome); o display title-case resolve a estética sem risco.
