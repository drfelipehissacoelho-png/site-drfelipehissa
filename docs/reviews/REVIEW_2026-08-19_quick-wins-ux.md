# REVIEW 2026-08-19 — Quick wins UX + correções P0 no analista_financeiro.html

- **Data:** 2026-08-19
- **Autor:** Kimi
- **Arquivo alterado:** `analista_financeiro.html` (único)
- **Branch:** `feat/auditoria-analista-financeiro` — **sem commit/push/deploy** (restrição do titular)
- **Contexto:** implementação autorizada pelo titular após a megaavaliação (`REVIEW_2026-08-19_megaavaliacao-ux-produto.md`), incluindo as respostas 1–5 do titular.

---

## 1. Objetivo

Corrigir os bugs P0 imediatos e entregar as melhorias de qualidade de vida de maior impacto no fluxo real do consultório, sem mudanças de schema, sem backend novo e sem deploy.

## 2. Mudanças implementadas

### 2.1 Correções P0

| Item | Correção |
|------|----------|
| Aba CFO morta | `const META=getMeta();` declarado em `renderCFO` antes do uso |
| Edição de paciente quebrada | `editarPaciente(${jsArg(p.patId)})` (aspas corretas para chaves push) |
| `id:+pid` → NaN | `id:pid` em `salvarEdicaoPaciente` e `esquecerPaciente` |
| Falso sucesso na edição | `set(updated)` agora com `.then()` (log + toast) e `.catch()` (toast de erro) |
| CSS indefinido | `--txt`, `--card` em `:root`; classe `.help-box` adicionada |
| TED/Cheque fora da conciliação | constantes globais `PAG_MEIOS` e `PAG_ICONS` (fonte única); `renderConciliacao` e `_pagIcon` passam a usá-las |
| Parcelas 11x/12x com taxa errada | opções 11x/12x removidas do `payParcelas` (tabela de taxas vai até 10x) |
| Auditoria poluída | `fbAddLog('UI', ...)` removido de `addProcLanc` |
| Taxa de split órfã | taxa de split grava `linked_group_id` + `auto_generated:true` |
| PDF com dados hardcoded | `gerarPDFOrcamento` usa `getClinica()` no cabeçalho e rodapé (médico, CRM, especialidade, telefone, e-mail, endereço) |

### 2.2 Orçamentos busca-first (resposta 2 do titular)

- Sem texto na busca: mantém o filtro de status, mas exibe **apenas os 5 mais recentes**, com hint: *"Mostrando os 5 mais recentes de N. Busque pelo nome da paciente, CPF ou procedimento"*.
- Com texto na busca: **ignora o filtro de status** e varre todos os orçamentos, mostrando a contagem de resultados.
- Estado novo: `let _orcCompare=[]` (base do comparativo).

### 2.3 Comparativo de propostas (queixa real do titular — resposta 5)

Caso: paciente pediu mamoplastia, depois abdominoplastia, depois as duas → 3 orçamentos impressos separados.

Implementação (somente front-end, sem schema novo):

- Botão **⇄** em cada card de orçamento (máx. 3 selecionados), via `toggleCompararOrc(id)`.
- Barra `#orcCompareBar` no cabeçalho de "Orçamentos Salvos" com os selecionados, botão **Comparar** (desabilitado com <2) e **Limpar** (`renderCompareBar()`).
- `abrirComparacao()`: modal com colunas "Proposta A/B/C" — procedimentos, honorários, custos hospitalares, desconto, TOTAL, validade, observações, e botões PDF/🖨 por proposta. Título inclui o nome da paciente quando todas as propostas são dela.
- `gerarPDFComparativo()`: jsPDF **landscape A4**, cabeçalho azul "COMPARATIVO DE PROPOSTAS" com dados de `getClinica()`, `autoTable` com linhas (Paciente, Data/validade, Procedimentos, Total honorários, Custos hospitalares, Desconto, TOTAL GERAL, Observações), rodapé com aviso de estimativa + dados da clínica. Salva via `_salvarPdfBlob(doc.output('blob'), nome)` com `sanitizeFileName('comparativo_<paciente>_<data>.pdf')` e registra `fbAddLog('PDF', ...)`.
- Modal estático `#compareModal` (max-width 900px) + entrada no array ESC `modalFns`.

### 2.4 Atalhos de hospital por procedimento (resposta 1 do titular)

O custo hospitalar é **por procedimento** — ao escolher o hospital, o usuário não deve procurar o procedimento de novo.

- `#hospChips` dentro de `hospRowsWrap`: um chip `+ 🏥 <procedimento>` para cada procedimento do orçamento **sem** linha hospitalar; quando todos têm linha, mostra "✓ Todos os procedimentos já têm linha hospitalar".
- `addHospRowProc(procName)`: cria a linha já com `procName` preenchido — falta só escolher o hospital (o custo vem da tabela por procedimento via `updateHospSelect`).
- Computado em `renderHospRows` **antes** do early-return, para aparecer também com a tabela vazia.

## 3. Fluxo antes → depois

**Antes (queixa do titular):** orçamento mamoplastia → imprimir → novo orçamento abdominoplastia → imprimir → novo orçamento ambas → imprimir. 3 PDFs, 3 impressões, experiência ruim.

**Depois:** buscar a paciente → clicar ⇄ nos 2–3 orçamentos → **Comparar** → revisar lado a lado na tela → **📄 PDF comparativo** (1 página, landscape) ou imprimir proposta individual se preferir.

**Antes (custo hospitalar):** adicionar linha → abrir select de procedimento → procurar na lista → escolher hospital.

**Depois:** clicar o chip `+ 🏥 Rinoplastia` → escolher apenas o hospital (custo preenche sozinho se houver preço cadastrado).

## 4. Decisões de design

- **Sem schema novo:** o comparativo usa os orçamentos existentes; nada é gravado.
- **Busca-first em vez de drawer:** resposta 2 do titular descartou a lista/drawer; a busca é o caminho principal.
- **Fonte única para meios de pagamento:** `PAG_MEIOS`/`PAG_ICONS` evitam divergência futura entre payModal e conciliação.
- **Máx. 3 propostas:** legibilidade do PDF landscape e da tela.
- **Honorários/custos calculados na hora:** `s.subtotal||(s.valorUnit*s.qty)` e `r.hospital_cost||r.hospitalCost` toleram registros antigos.

## 5. Testes executados

- Extração do script inline único e `node --check` → **sintaxe OK** (após cada fase de edição).
- `git diff --check -- analista_financeiro.html` → **OK** (232 inserções, 26 remoções).
- Revisão manual de integração: `jsPDF` desestruturado de `window.jspdf` (não é global); `_salvarPdfBlob` recebe Blob (`doc.output('blob')`); `autoTable`/`lastAutoTable` já usados no projeto; helpers existentes confirmados (`getClinica`, `getOrcamentos`, `compararOrcamentosRecentes`, `sanitizeFileName`, `jsArg`, `fD`, `fN`, `dataLocalISO`).
- Dois bugs do próprio lote encontrados e corrigidos na autorrevisão: `jsPDF` sem destruturação e `_salvarPdfBlob(doc)` em vez de Blob.

## 6. Limitações e riscos

- **Não testado em navegador nem contra o Firebase real.** Recomenda-se validação manual: abrir CFO, editar/anonimizar paciente, buscar orçamento, montar comparativo, gerar PDFs, usar chips de hospital.
- O comparativo assume que orçamentos da mesma paciente têm `paciente` idêntico (vínculo por nome — dívida conhecida).
- `autoTable` em landscape foi configurado por analogia ao uso portrait existente; conferir visualmente a quebra de linhas em "Procedimentos".
- Anonimização LGPD ainda não cobre `orcamentos`/`log` (P0 restante, fora deste lote).

## 7. Deliberadamente pendente

- `patient_id`/`case_id` e migração de orçamentos antigos.
- Atomicidade de `salvarLancamento` (multi-path update).
- LGPD completa na anonimização.
- Segregação de visões médico vs secretária/gerente (resposta 1: por ora só despoluir; decisão formal pendente).
- Verificação das regras RTDB e passivo histórico (prompt para executor independente em `docs/PROMPT_CLAUDE_verificacao-regras-rtdb.md`).

## 8. Perguntas para revisão

1. O comparativo deve permitir editar valores na hora (ex.: aplicar desconto combinado) ou permanece somente leitura + PDF?
2. O hint de "5 mais recentes" está adequado ou prefere outro limite?
3. Após validação em navegador, autoriza o commit deste lote?
