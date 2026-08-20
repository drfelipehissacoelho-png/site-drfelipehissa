# REVIEW 2026-08-19 — Megaavaliação UX/Produto do analista_financeiro.html

- **Data:** 2026-08-19
- **Autor:** Kimi (consultor de produto/engenharia, a pedido do titular)
- **Escopo:** `analista_financeiro.html` (monólito HTML+CSS+JS+Firebase RTDB, ~7.200 linhas na época da auditoria)
- **Natureza:** auditoria independente de produto, UX, arquitetura e riscos. Nenhuma alteração de código foi feita neste documento; as correções autorizadas estão em `REVIEW_2026-08-19_quick-wins-ux.md`.
- **Branch:** `feat/auditoria-analista-financeiro` (sem commit/push/deploy — restrição do titular)

---

## A. Resumo executivo

O módulo financeiro é funcional e cobre o fluxo principal do consultório (orçamento → pagamento → lançamento → conciliação), mas carrega sinais claros de crescimento orgânico sem revisão de produto:

1. **A aba CFO está morta** — `renderCFO` referencia `META` indefinido e quebra a cada sincronização, gerando toast de erro recorrente.
2. **A gestão de pacientes está parcialmente quebrada** — edição e anonimização (LGPD) falham silenciosamente com chaves push do Firebase, e a anonimização reporta sucesso falso.
3. **A lista de orçamentos polui a tela** e não responde ao fluxo real da recepção (buscar pela paciente).
4. **O caso de uso mais doloroso do consultório não é atendido:** a paciente que pede 2–3 variações de proposta na mesma consulta recebe 3 PDFs separados.
5. **O PDF de orçamento ignora os dados da clínica configurados** e expõe médico/CRM/contato hardcoded.
6. **Riscos de integridade financeira persistem:** escritas não atômicas, vínculo orçamento↔paciente por nome, meios de pagamento fora da conciliação, taxa de split sem vínculo.

**Veredito:** produto utilizável no dia a dia para o fluxo feliz, mas com bugs P0 em caminhos secundários e dívida de UX que custa tempo real em cada consulta.

---

## B. Metodologia

- Leitura integral do arquivo, mapeamento de fluxos (orçamento, pagamento multipagamento, conciliação, recorrentes, CFO, pacientes, lixeira, auditoria).
- Cruzamento com documentos do projeto: `docs/PROJECT_RULES.md`, `docs/architecture/FIREBASE_RTD_RULES_GAP.md`, `FIREBASE_RTD_RULES_VERIFICATION.md`.
- Classificação por severidade: P0 (quebra/dado errado), P1 (risco operacional/financeiro), P2 (qualidade de vida), P3 (dívida técnica).
- **Limitação:** auditoria estática. Não houve execução em navegador nem contra o Firebase real.

---

## C. Achados por severidade

### P0 — quebra funcional ou dado incorreto

| # | Achado | Evidência |
|---|--------|-----------|
| 1 | `META` indefinido em `renderCFO` → aba CFO inteira morta + toast de erro a cada sync | `renderCFO` usa `META` sem declarar |
| 2 | `editarPaciente(${p.patId})` sem aspas/`jsArg` → ReferenceError com chaves push (`-Nx...`) | `renderPacientes` |
| 3 | `id:+pid` → `NaN` em `salvarEdicaoPaciente` e `esquecerPaciente` → edição e LGPD falham com **falso sucesso** | ambas as funções |
| 4 | `esquecerPaciente` não cobre `orcamentos` nem `log` → nome da paciente permanece anonimizável só pela metade | função `esquecerPaciente` |
| 5 | Orçamento sem `patient_id` — vínculo por nome; renomear paciente órfã os orçamentos | schema de `orcamentos` |
| 6 | TED/Cheque existem no payModal mas **não** na conciliação → receitas invisíveis na conferência | `renderConciliacao` vs `payModal` |
| 7 | Taxa de split lançada sem `linked_group_id` → estorno/exclusão deixa taxa órfã | `salvarLancamento` |
| 8 | Parcelas 11x/12x no payModal com taxa limitada a 10x → valor líquido errado | clamp da tabela de taxas |
| 9 | PDF de orçamento hardcodeia médico/CRM/contato ignorando `getClinica()` | `gerarPDFOrcamento` |
| 10 | CSS `--txt`, `--card`, `.help-box` referenciados mas indefinidos → herda estilos imprevisíveis | `:root` |

### P1 — risco operacional/financeiro

- `salvarLancamento` faz múltiplas escritas fire-and-forget (não atômico): falha parcial deixa pagamento sem lançamento ou vice-versa.
- Listener na raiz `consultorio` inteira: qualquer escrita re-renderiza tudo (custo de rede + re-renders + toasts de erro em cascata quando um render quebra).
- `fbAddLog('UI', ...)` em `addProcLanc` polui a trilha de auditoria com eventos de interface.
- Código morto: `btnPastaOrc` referenciado mas inexistente no HTML; `gerarPDFOrcRapido`/`imprimirOrcamentoRapido` sem botão.
- Baseline de regras RTDB **não verificada** (arquivo `firebase.database.rules.unverified.json`): os gaps documentados (quote_payments/recorrentes sem regra de escrita etc.) seguem sem confirmação comportamental.
- Passivo histórico possível: orçamentos antigos sem `quote_payments` — status financeiro desses registros é inferido, não garantido.

### P2 — qualidade de vida (UX)

- Lista de orçamentos exibe tudo sempre; sem busca-first.
- Ao montar orçamento, custo hospitalar exige procurar o procedimento novamente, embora o custo seja por procedimento.
- Sem comparativo de propostas (caso real relatado em 2026-08-19: mamoplastia → abdominoplastia → ambas = 3 impressões).
- Gerente/secretária vê margens, comissões e custos de equipe que já são padronizados no sistema — poluição sem valor decisório.

### P3 — dívida técnica

- Monólito de ~7.200 linhas; estado global espalhado; renders com innerHTML gigantes; handlers inline com escaping manual.
- Sem testes automatizados de UI; validação limitada a `node --check` e suítes locais de lógica.

---

## D. Análise de fluxos (produto)

### Fluxo feliz atual
Orçamento (4 steps) → salvar → aceitar → + Pagar (multipagamento) → lançamento → conciliação. Funciona, com ressalvas P0/P1 acima.

### Fricções medidas no fluxo real
1. **Recepção/gerente:** localizar orçamento de uma paciente exige rolar a lista inteira. → resolvido por busca-first.
2. **Consultório:** montar custo hospitalar repete a escolha do procedimento. → resolvido por chips de atalho.
3. **Consulta:** variações de proposta geram N PDFs. → resolvido por comparativo de propostas.
4. **Conferência:** TED/Cheque somem da conciliação. → resolvido unificando `PAG_MEIOS`.

---

## E. Respostas do titular (2026-08-19) e impacto no roadmap

1. **Gerente não precisa ver margens/comissões/custos de equipe** (já padronizados). → Despoluir visões gerenciais; segregação por papel (médico vs secretária) permanece como item estrutural pendente.
2. **Lista de orçamentos é inútil e polui** → adotado busca-first: sem busca, só os 5 mais recentes; com busca, varre todos os status.
3. **Baseline de regras não confirmada** → gerado prompt para executor independente (`docs/PROMPT_CLAUDE_verificacao-regras-rtdb.md`).
4. **Passivo histórico desconhecido** → verificação incluída no mesmo prompt (contagens do backup local, sem dados pessoais).
5. **Queixa das 3 impressões** → comparativo de propostas implementado (2–3 orçamentos lado a lado + PDF único).

---

## F. Recomendações priorizadas

### Feito neste lote (ver REVIEW quick-wins)
Correções P0 1–3, 6–10 parcialmente; busca-first; chips de hospital; comparativo de propostas; PDF com dados da clínica.

### Próximo lote (curto prazo)
- `patient_id`/`case_id` nos orçamentos + migração dos antigos.
- Atomicidade de `salvarLancamento` (update multi-path único).
- Anonimização LGPD cobrindo `orcamentos` e `log`.
- Reconciliação do passivo histórico de pagamentos (depende da verificação de regras).

### Estrutural (médio prazo)
- Verificação e endurecimento das regras RTDB por papel.
- Segregação de visões: médico (margens/comissões) vs secretária/gerente (operacional).
- Extração gradual do monólito para módulos.

---

## G. Riscos de não agir

- LGPD: anonimização pela metade expõe o consultório a incidente de dados pessoais.
- Financeiro: taxas órfãs e TED/Cheque fora da conciliação distorcem o caixa.
- Operacional: cada consulta com variação de proposta custa ~3 impressões e retrabalho.

---

## H. Limitações desta auditoria

- Estática, sem execução em navegador nem Firebase real.
- Comportamento das regras RTDB inferido do arquivo local não verificado.
- Contagens de dados históricos desconhecidas (aguardam verificação).

## I. Perguntas abertas para o titular

1. Deseja que a visão da gerente/secretária seja formalmente segregada (ocultar margens/comissões) ou apenas despoluída?
2. Há orçamentos antigos relevantes sem `quote_payments` que precisem de reconciliação retroativa?
3. Autoriza, após validação em navegador, o commit deste lote na branch atual?
