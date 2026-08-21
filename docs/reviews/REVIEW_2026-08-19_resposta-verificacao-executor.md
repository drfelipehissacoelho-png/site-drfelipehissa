# REVIEW 2026-08-19 — Resposta à verificação do executor (regras RTDB)

- **Data:** 2026-08-19
- **Autor:** Kimi
- **Contexto:** o executor independente (Claude) rodou o prompt de `docs/PROMPT_CLAUDE_verificacao-regras-rtdb.md`, mas reportou que os arquivos de entrada "não existem" e entregou achados estáticos D3/D4. Este documento reconcilia o relatório dele com o estado real do repositório.

---

## 1. Por que o executor não achou os arquivos

O executor estava conectado a **outra pasta** — descreveu "36 arquivos, 25 HTML e 11 MD, nenhum subdiretório". O repositório real (`site-drfelipehissa`) contém, verificado nesta data:

- `firebase.database.rules.unverified.json` ✅ (raiz)
- `docs/architecture/FIREBASE_RTD_RULES_VERIFICATION.md` ✅
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md` ✅
- `docs/PROJECT_CONTEXT.md`, `PROJECT_RULES.md`, `PRODUCT_VISION.md`, `AI_TEAM.md` ✅

A pasta descrita pelo executor (plana, com 25 HTMLs) é compatível com uma **pasta de deploy/build**, não com o repositório. Consequência: o `REVIEW_2026-08-20_verificacao_rules_rtdb.md` que ele diz ter escrito **não está neste repositório** — foi salvo na pasta errada.

**Para destravar:** apontar o executor para `C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa` e repetir TAREFAS 1–3. O Playground continua pendente (requer Console autenticado).

## 2. Verificação dos achados estáticos do executor

### D3 — "lancamentos e recorrentes são apagados com .remove()" — **PARCIALMENTE CONFIRMADO**

- `lancamentos`: **falso alarme no fluxo real.** A exclusão normal já é soft-delete atômico (`deletedAt`/`deletedBy`, Lixeira, restauração — `excluirLancamento`, linha ~2090) e a purga é permanente **por design**, com double-confirm ("digite APAGAR") e log prévio (`purgarLancamento`, ~2133). O `.remove()` que o executor viu (antiga linha 1650, `fbExcluirLanc`) era **código morto — nenhum chamador em todo o arquivo**. ✅ **Removido neste lote** para eliminar a ambiguidade.
- `recorrentes`: **confirmado** — `excluirRecorrente` (~5971) faz hard delete com `.remove()`. Mitigações existentes: log prévio (`fbAddLog` antes da operação), confirmação modal, restrição ao titular, e recorrente é entidade de **configuração**, não registro financeiro (os lançamentos gerados são preservados, como o próprio modal informa). Risco residual: perda da definição da recorrente sem trilha completa (o log guarda descrição+valor, não o objeto inteiro). **Decisão pendente:** soft-delete de recorrentes exigiria Lixeira própria — fora deste lote.

### D4 — "receitaGeradaId gravado como String num fluxo e número noutro" — **NÃO CONFIRMADO no arquivo atual**

- No `analista_financeiro.html` deste repositório há **uma única escrita** de `receitaGeradaId` (linha ~5524), e `lancId` vem de `genId()`, que retorna **push key do Firebase — sempre string**.
- As leituras já são tolerantes a tipo: `String(lanc.id)===String(orc.receitaGeradaId)` (~5556) e lookup por chave de objeto `DATA.lancamentos[_recId]` (~5096), que coage para string.
- O executor citou linhas (5350/5514) e um padrão (`String(lancId)` vs número cru) que **não existem neste arquivo** — consistente com ele ter lido uma cópia antiga/deployada na pasta errada. Nenhuma ação necessária.

### Observação sobre o listener raiz `consultorio` — **CONFIRMADO e já rastreado**

- Listener `.on('value')` na raiz `consultorio` já consta como P1 na megaavaliação (`REVIEW_2026-08-19_megaavaliacao-ux-produto.md`).
- O alerta dele é pertinente e fica registrado para a verificação de regras: **se a baseline foi escrita para `/` em vez de `/consultorio`, ela não casa com o app**; e regras de leitura granulares por filho quebrariam o listener único. Esse ponto deve entrar explicitamente na matriz de evidência quando o Playground for executado.

## 3. Alteração de código deste lote

| Arquivo | Mudança |
|---------|---------|
| `analista_financeiro.html` | Removida `fbExcluirLanc` (hard delete morto, sem chamadores). Sintaxe revalidada com `node --check`; `git diff --check` limpo. |

## 4. Estado das TAREFAS do prompt original

| Tarefa | Estado |
|--------|--------|
| 1 — Rules Playground (6 caminhos) | **PENDENTE** — executor estava na pasta errada; precisa rerodar no repositório correto + Console autenticado |
| 2 — Contagens do backup local | **PENDENTE** — aguarda JSON exportado do RTDB na pasta |
| 3 — Matriz de evidência | **PARCIAL** — achados estáticos reconciliados aqui; matriz comportamental aguarda Tarefa 1 |

## 5. Instrução de rerodagem para o executor

> Conecte-se a `C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa` (repositório, contém `docs/` e `firebase.database.rules.unverified.json`). Ignore cópias de `analista_financeiro.html` fora deste repositório — a versão vigente é a da raiz deste repo, branch `feat/auditoria-analista-financeiro`. Repita as TAREFAS 1–3 do prompt original. Adicione à matriz: verificar se a baseline foi escrita para `/` ou para `/consultorio` (o app usa listener único na raiz `consultorio`).

## 6. Deliberadamente pendente

- Soft-delete (ou arquivamento) de `recorrentes` com trilha completa do objeto.
- Rerodagem da verificação pelo executor no repositório correto.
- Reconciliação do passivo histórico (depende da Tarefa 2).
