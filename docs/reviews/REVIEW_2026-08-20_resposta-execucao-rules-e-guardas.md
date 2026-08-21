# REVIEW 2026-08-20 — Resposta à execução do executor + guardas V3/V4 + script de contagens

- **Data:** 2026-08-20 (referente à sessão de 2026-08-19 21h)
- **Autor:** Kimi
- **Contexto:** o executor (Claude) entregou `REVIEW_2026-08-20_verificacao-rules-rtdb-execucao.md` — desta vez no repositório correto, com PASSO 0 confirmado. Este documento registra a análise do relatório dele, as duas correções de front-end que caíram na alça de Kimi (V3/V4) e a ferramenta para destravar a TAREFA 2.

---

## 1. Análise do relatório do executor

### Confirmado estaticamente (determinístico)
- Baseline **6/6 consistente** com o roteiro; regras no nó correto (`/consultorio`); listener único da raiz sobrevive para os dois usuários previstos.
- Falsos alarmes da 1ª rodada (cópia de deploy) **descartados por ele mesmo** — `genId()` string, `receitaGeradaId` escrita única, hard delete de `lancamentos` inexistente.

### Pendente (não executável por ele)
- **(B) Procedência:** Playground não rodado (sem navegador conectado ao Console).
- **TAREFA 2:** backup não fornecido → passivo histórico não quantificado.

### Risco central (V1+V2) — o achado operacional mais importante
O código grava em `quote_payments` e `recorrentes`; a baseline **nega ambos**; e as escritas são **atômicas** (um caminho negado derruba a operação inteira). **Se a baseline estiver publicada, o fluxo de pagamento de orçamentos e a geração de recorrentes estão indisponíveis em produção neste momento** — e a restauração de backup falha em bloco.

### A chave mais barata para destravar (insight do executor, seção 5)
Exportar o backup JSON responde **duas** perguntas de uma vez:
1. Quantifica o passivo histórico (TAREFA 2).
2. Funciona como **teste de procedência sem Console**: `quote_payments` vazio com orçamentos aceitos ⇒ baseline publicada; `quote_payments` populado ⇒ baseline refutada.

## 2. Correções de front-end implementadas nesta rodada (alça Kimi)

| Item | Origem | Mudança |
|------|--------|---------|
| **V4** — restauração de backup sem guarda de papel | Relatório do executor (🟡) | `importarJSON()` agora exige titular (`CUEmail === 'drfelipehissacoelho@gmail.com'`) antes de ler o arquivo. Sem a guarda, a secretária disparava a operação e ela falhava em bloco no servidor (BACKUP_RESTORE_NODES inclui 6 nós médico-only). |
| **V3** — hard delete de `recorrentes` | Relatório do executor (🟡, "confirmar se intencional") | **Decisão: hard delete é intencional** — recorrente é template de geração, não registro financeiro; os lançamentos gerados são preservados. Em compensação, o log de exclusão agora carrega a **definição completa do template** (descrição, valor, categoria, frequência, dia, mês, ativo, obs) — suficiente para recriá-lo manualmente. Comentário no código documenta a decisão. |

**Validação:** `node --check` no script inline extraído → OK; `git diff --check` → OK. Não testado em navegador/Firebase real.

## 3. Ferramenta entregue: `tools/contar_passivo_rtdb.js`

Script Node somente-leitura que produz **apenas as 5 contagens agregadas** da TAREFA 2 + o sinal de procedência (seção 5 do relatório do executor). Aceita o backup v2 do app ou o export bruto do Console (com wrapper `consultorio`). Testado com dados sintéticos.

**Uso pelo titular:**
1. No app, botão de backup (exportarJSON v2) → salvar o arquivo na pasta do repositório.
2. Rodar: `node tools/contar_passivo_rtdb.js backup_AAAA-MM-DD.json`
3. A saída (só contagens) pode ser colada para Kimi/Claude — nenhum dado pessoal sai da máquina.

## 4. Estado do plano de endurecimento (alça Claude)

Conforme a conclusão nº 10 do próprio executor: **não propor nem implantar regra nova enquanto (B) não fechar.** Sequência acordada:

1. ⬜ Titular exporta o backup → contagens via script (destrava TAREFA 2 + sinal de procedência)
2. ⬜ Playground dos 6 casos contra a matriz derivada (confirmação final de procedência)
3. ⬜ Só então: proposta de regras endurecidas (`.write` para `quote_payments`/`recorrentes`, `.validate`, escopo por `$id`, autoria de `log`) — alça Claude
4. ⬜ Teste em ambiente isolado → deploy autorizado pelo titular

## 5. Deliberadamente pendente

- Soft-delete completo de `recorrentes` com Lixeira (decisão registrada: hard delete intencional + trilha completa no log; revisitar só se houver necessidade real de restauração).
- Autorização por papel em outras operações sensíveis do cliente (hoje só titular: recorrentes e restauração).
- `.validate` e escopo por `$id` nas regras — aguarda (B).
