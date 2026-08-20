# REVIEW 2026-08-20 — Verificação das correções pós-auditoria Codex

- **Data:** 2026-08-20
- **Autor:** Kimi
- **Contexto:** o Codex auditou o diff das melhorias de qualidade de vida (prompt em `docs/PROMPT_CODEX_auditoria-quick-wins.md`) e devolveu 1 P0, 5 P1 e 4 P2, com veredito REPROVADO para as frentes 3 (comparativo) e 4 (chips). Ao retomar a tarefa, as correções **já estavam aplicadas** no arquivo. Este documento registra a verificação item a item das correções contra o código vigente — não a autoria delas.

---

## 1. Verificação item a item (achado → estado no código)

| # | Achado do Codex | Estado | Evidência verificada |
|---|-----------------|--------|---------------------|
| P0 | Comparativo lia `o.hospitais` (campo inexistente) → custo hospitalar R$ 0,00 | ✅ **CORRIGIDO** | `_totalHospitalarOrcamento()` lê `orc.hospRows` primeiro, com fallback legado (`hospitais` → `hospTotal`/`hospVal`). Usada tanto na tela (`abrirComparacao`) quanto no PDF (`gerarPDFComparativo`). |
| P1 | Chip hospitalar com escaping manual inseguro | ✅ **CORRIGIDO** | Chip usa `addHospRowProc(${jsArg(p)})` — `jsArg` faz `JSON.stringify` + escape de `"` (`&quot;`), `<`, `>`, `&`. Seguro no atributo `onclick`. |
| P1 | `removeItemOrc` não atualizava linhas hospitalares → salvamento bloqueado | ✅ **CORRIGIDO** | `removeItemOrc` chama `_sincronizarHospitaisComItens()` (remove linhas órfãs de procedimento) + `renderHospRows()`. Também aplicado em `updateItemField` ao trocar o procedimento. |
| P1 | Orçamento na lixeira continuava no comparativo | ✅ **CORRIGIDO** | `_orcamentosAtivosDoComparativo()` filtra `deletedAt` e poda `_orcCompare`; usada por `renderCompareBar`, `abrirComparacao` e `gerarPDFComparativo`. |
| P1 | Comparativo entre pacientes distintos (risco LGPD) | ✅ **CORRIGIDO** | Bloqueio com toast em `abrirComparacao` **e** em `gerarPDFComparativo` quando `paciente` difere. |
| P1 | Legado 11x/12x recalculado com taxa de 10x na edição | ✅ **CORRIGIDO** | `getTaxaPct` retorna `null` para >10x (comentário documenta); `salvarEdicao` trata `===null` preservando a taxa histórica e registra o motivo em `recalculos`. Demais chamadores (`salvarLancamento` 1797, hint 3777, pagamento 5547) são null-safe via `pct>0`. |
| P2 | `PAG_MEIOS` não era fonte única | ✅ **CORRIGIDO** | `preencherMeiosPagamento()` popula `fPag`, `ePag` e `payMetodo` a partir de `PAG_MEIOS`; splits usam `PAG_MEIOS` (linha ~3854). |
| P2 | Busca só com espaços virava busca ativa | ✅ **CORRIGIDO** | `sq` agora com `.trim().toLowerCase()` (linha ~5612). |
| P2 | Rodapé do PDF comparativo podia sair da página | ✅ **CORRIGIDO** | Checagem de altura com `doc.addPage()` antes do rodapé; texto longo passa por `splitTextToSize`. |
| P2 | `fbAddLog` recebia 3º argumento descartado | ✅ **CORRIGIDO** | Chamada do comparativo usa 2 argumentos; ids das propostas entraram no `detalhe`. |

## 2. Mudança de comportamento a conhecer (não é bug, é decisão)

`payMetodo` (modal de pagamento de orçamento) passou a oferecer **os 9 meios** de `PAG_MEIOS` — incluindo **Convênio / Plano** e **Parcelado**, que antes não apareciam ali. É o preço da fonte única. Se o titular quiser manter esses dois fora do modal de orçamento, o correto é introduzir `PAG_MEIOS_ORCAMENTO = PAG_MEIOS.filter(...)` — decisão de negócio, não de código.

## 3. Validação desta rodada

- `node --check` em todos os blocos `<script>` inline extraídos → **OK**.
- `git diff --check` → **limpo**.
- Leitura direta de cada ponto do código (evidências na tabela acima).
- **Não executado:** navegador, Firebase real, geração visual de PDF.

## 4. Situação final frente ao veredito do Codex

- Frente 3 (comparativo): os 4 motivos da reprovação (P0, lixeira, cross-patient, rodapé) estão corrigidos.
- Frente 4 (chips): os 2 motivos da reprovação (escaping, sincronização) estão corrigidos.
- Invariante do RTDB mantida: nenhum caminho novo de escrita (confirmado pelo Codex e não alterado por estas correções — todas são front-end/leitura).

**Pendente para fechar o ciclo:** rerodar a auditoria do Codex sobre o novo diff (snapshot `e970ac0...` ficou desatualizado) e a validação em navegador pelo titular.

## 5. Deliberadamente pendente

- Decisão sobre Convênio/Parcelado no modal de orçamento (seção 2).
- Rerodagem do Codex (novo snapshot do diff).
- Validação em navegador + autorização de commit.
