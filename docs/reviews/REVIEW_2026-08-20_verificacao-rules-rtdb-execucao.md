# REVIEW — Verificação da baseline de regras RTDB (execução)

**Data:** 2026-08-20
**Modo:** somente leitura. Nenhuma escrita real, nenhum deploy, nenhum dado pessoal.
**Veredito global:** baseline **CONSISTENTE estaticamente** (6/6 caminhos) · **procedência NÃO CONFIRMADA** (Playground não executado) · **passivo histórico NÃO QUANTIFICADO** (backup não fornecido)

---

## PASSO 0 — Confirmação do repositório

| Item | Valor |
|---|---|
| Pasta lida | `C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa` |
| Branch | `feat/auditoria-analista-financeiro` (via `.git/HEAD`) |
| Contém `docs/`? | ✅ sim, com `docs/architecture/` e `docs/reviews/` |
| Contém `firebase.database.rules.unverified.json` na raiz? | ✅ sim (1.494 bytes, mtime 2026-07-31 18:31) |
| Arquivo do módulo lido | `analista_financeiro.html` na **raiz do repo** — 390.617 bytes, mtime 2026-08-20 00:18 |

A pasta plana `Downloads\analista\analista financeiro` (usada na rodada anterior) foi **descartada**: é cópia de deploy/build, sem `docs/` e com `analista_financeiro.html` de 380.812 bytes, mtime 2026-06-15 — versão antiga. Nenhuma leitura desta rodada veio de lá.

**Sobre os falsos alarmes da rodada anterior — reconciliados e confirmados no arquivo vigente:**

- `genId()` (linha 1435-1439) retorna `dbRef.push().key` → **sempre string**. O `Date.now()*100000` não existe mais. Achado anterior de precisão numérica: **improcedente no arquivo vigente**.
- `receitaGeradaId`: **uma única escrita** (linha 5524), dentro do update atômico. Achado anterior de "string vs número": **improcedente**.
- Hard delete de `lancamentos`: **não existe mais**; o fluxo é soft-delete (`deletedAt`/`deletedBy`, linhas 5549-5550). Achado anterior: **improcedente**.

---

## 1. O que pôde e o que não pôde ser executado

A baseline agora é legível, e regras RTDB são **determinísticas**. Portanto separo duas perguntas que a rodada anterior não conseguia separar:

| Pergunta | Método | Situação |
|---|---|---|
| **(A)** O JSON da baseline, como escrito, permite ou nega cada caminho? | avaliação estática das regras (cascata RTDB) | ✅ **RESPONDIDA — determinística** |
| **(B)** As regras **publicadas** em produção são iguais a esse JSON? | Rules Playground no Console | ❌ **NÃO EXECUTADA** |

(A) está resolvida com certeza. (B) é exatamente a *procedência* que o `FIREBASE_RTD_RULES_GAP.md` declara pendente — e continua pendente: **nenhum navegador está conectado a esta sessão** (`list_connected_browsers` retornou vazio), e o Console é tela autenticada. O valor informativo real do Playground é só (B): comparar o observado com a tabela derivada abaixo.

---

## 2. TAREFA 1 — Matriz de evidência

Semântica aplicada: em RTDB, `.write` **desce em cascata** do ancestral; se nenhum ancestral concede, o padrão é **negar**. `.read` concedido num ancestral **não pode ser revogado** num filho.

| # | Caminho simulado | Auth | Op | Previsto pelo roteiro | **Derivado da baseline (estático)** | Confere? | Observado no Playground |
|---|---|---|---|---|---|---|---|
| a | `consultorio/quote_payments/teste-fase3` | médico / secretária | write | deny ambos | **DENY ambos** — nó ausente das regras; nenhum ancestral com `.write` | ✅ | ❌ NÃO EXECUTADO |
| b | `consultorio/recorrentes/teste-fase3` | médico / secretária | write | deny ambos | **DENY ambos** — nó ausente das regras | ✅ | ❌ NÃO EXECUTADO |
| c | `consultorio/lancamentos/teste-fase3` | médico / secretária | write | allow ambos | **ALLOW ambos** — `.write` no nível da coleção | ✅ | ❌ NÃO EXECUTADO |
| d | `consultorio/orcamentos/teste-fase3/status` | médico / secretária | write | allow ambos | **ALLOW ambos** — `.write` em `orcamentos` cascateia p/ `status` | ✅ | ❌ NÃO EXECUTADO |
| e | `consultorio/log/teste-fase3` (nó novo) | médico / secretária | write | allow ambos | **ALLOW ambos** — `!data.exists()` verdadeiro | ✅ | ❌ NÃO EXECUTADO |
| f | `consultorio/log/<id existente>` | médico / secretária | write | deny ambos | **DENY ambos** — `!data.exists()` falso | ✅ | ❌ NÃO EXECUTADO |

**Resultado: 6/6 — a coluna "previsto" do roteiro reproduz fielmente o que o JSON determina.** O roteiro é internamente correto. Isso valida o roteiro, não a produção.

---

## 3. TAREFA 1b — Raiz das regras

| Pergunta | Resposta | Evidência |
|---|---|---|
| As regras estão em `/` ou `/consultorio`? | **`/consultorio`** | `{"rules":{"consultorio":{...}}}` — todo o bloco está aninhado sob `consultorio` |
| Casam com os caminhos que o app usa? | ✅ **SIM** | app: `firebase.database().ref('consultorio')` (linha 1375) + `.child('lancamentos/...')` → caminho absoluto `consultorio/lancamentos/...`, exatamente o que a regra cobre. Sem desalinhamento de raiz. |
| Regras de leitura granulares por filho quebrariam o listener único? | **A pergunta está mal posta para RTDB — e a resposta prática é: não adiantaria tentar** | A baseline tem `.read` **só** no nível `consultorio`, sem nenhum `.read` em filho. Em RTDB, leitura concedida no ancestral **não pode ser revogada** no filho: acrescentar `{"procedureTeamCosts":{".read":false}}` teria **efeito zero**. |
| Simulação de read em `consultorio` por papel | médico → **ALLOW** · secretária → **ALLOW** · qualquer outro autenticado → **DENY** · não autenticado → **DENY** | `.read` compara `auth.token.email` com os dois endereços |

**Consequência:** o listener único da raiz **sobrevive** à baseline — para os dois usuários previstos, e só para eles. Qualquer terceiro autenticado recebe deny na raiz, e como todo o estado vem de um `.on('value')` em `consultorio` (linha 1597), **o app simplesmente não carrega** — falha total, não parcial. E segregar custos internos da secretária é **impossível apenas por regra**: exige refatorar o cliente para escutar nós individuais, como o GAP doc já registrava. Isso fica **CONFIRMADO estaticamente**.

---

## 4. Status dos gaps documentados

Legenda: **CONFIRMADO (JSON)** = decorre com certeza do texto da baseline + código vigente. Nenhum gap pode ser CONFIRMADO *em produção* sem o Playground.

| Gap (`FIREBASE_RTD_RULES_GAP.md`) | Status | Evidência |
|---|---|---|
| `quote_payments` sem `.write` → pagamento negado integralmente | **CONFIRMADO (JSON)** · produção INCONCLUSIVO | Nó ausente da baseline. O pagamento é **um único `dbRef.update()`** (linha 5529) contendo `quote_payments/$payId` (5504) + `lancamentos/$lancId` (5505) + eventual taxa de cartão + `orcamentos/$id/receitaGeradaId` (5524) + `orcamentos/$id/status` (5525) + `log/$id`. Como `update()` multi-path é **tudo-ou-nada**, um único caminho negado **derruba a operação inteira**. |
| `recorrentes` sem `.write` → cadastro/geração negados | **CONFIRMADO (JSON)** · produção INCONCLUSIVO | Nó ausente. `_gerarLancRecorrente()` faz update atômico com `lancamentos/$id` + `recorrentes/$recId/ultimoPeriodoGerado` + `log/$id` (linhas 6148-6151) → o caminho negado derruba também o lançamento e o log. |
| Restauração de backup negada integralmente | **CONFIRMADO (JSON)** | `BACKUP_RESTORE_NODES` (linhas 3566-3571) inclui `quote_payments` **e** `recorrentes`, e `importarJSON()` usa um único `dbRef.update(nodes)` (linha 3630). Ambos negados → restauração inteira falha, inclusive nós permitidos. **Agravante não documentado:** a lista inclui `config`, `procedures`, `procedureConfig`, `procedureTeamCosts`, `procedureCommissionRules`, `hospitalPrices` — todos **médico-only**. Logo, se a secretária restaurar um backup, falha por *duas* razões independentes. |
| `lancamentos`/`orcamentos`/`patients`: escrita ampla, sem schema | **CONFIRMADO (JSON)** | `.write` no nível da coleção, sem escopo por `$id`. A baseline **não contém nenhum `.validate`** (zero ocorrências no arquivo). Qualquer um dos dois pode `set(null)` a coleção inteira ou gravar campo arbitrário. |
| `log` append-only real, mas autoria forjável | **CONFIRMADO (JSON)** | `!data.exists()` presente e correto → sobrescrita e remoção bloqueadas. Mas não há validação de `newData.child('email').val() === auth.token.email` nem de campos mínimos: o cliente escolhe `id`, `usuario`, `email` e `acao` livremente. |
| Leitura ampla / LGPD / segregação de funções | **CONFIRMADO (JSON)** | ver seção 3 |

---

## 5. TAREFA 2 — Passivo histórico

**Resultado: INCONCLUSIVO. Nenhuma contagem produzida.**

O backup JSON do RTDB não foi fornecido e não existe no repositório — os únicos `.json` presentes são `firebase.database.rules.unverified.json` e `vercel.json`.

| Métrica | Valor |
|---|---|
| nós em `quote_payments` | — sem dado |
| nós em `recorrentes` | — sem dado |
| `orcamentos` com `receitaGeradaId` | — sem dado |
| `lancamentos` com `linked_pay_id` | — sem dado |
| `orcamentos` sem nenhum `quote_payment` associado (**passivo histórico**) | — sem dado |

**Como destravar:** exportar pelo próprio módulo (botão de backup JSON, `exportarJSON()` — versão 2, inclui todos os nós) e deixar o arquivo na pasta do repositório. Produzo **apenas as cinco contagens agregadas**; nenhum nome, CPF ou valor individual entra no relatório e nada é escrito de volta.

**O que essa contagem decide:** o roteiro define o sinal — se a baseline for de fato a regra publicada, `quote_payments` e `recorrentes` devem estar **vazios ou quase**, apesar de existirem orçamentos aceitos/pagos. Essa contagem é, na prática, um **teste de procedência independente do Console**: `quote_payments` vazio com orçamentos pagos é forte evidência de que a baseline está publicada. `quote_payments` populado **refuta** a baseline. É o caminho mais barato para responder (B) e vale ser feito **antes** do Playground.

---

## 6. Divergências entre regras, código e documentação

| # | Divergência | Severidade |
|---|---|---|
| **V1** | **O código grava em dois nós que a baseline não autoriza.** O módulo escreve em `quote_payments` e `recorrentes`; a baseline não tem `.write` para nenhum dos dois. Regra e código estão em contradição direta. | 🔴 alta |
| **V2** | **A atomicidade amplifica a negação.** Pagamento e geração de recorrente empacotam 4-6 caminhos num único `update()`. Um caminho negado derruba receita, status, vínculo e auditoria juntos. Sob a Fase 1 isso é o comportamento *correto* (falha visível em vez de inconsistência silenciosa), mas significa que, se a baseline estiver publicada, **o fluxo de pagamento está indisponível**, não degradado. | 🔴 alta |
| **V3** | `recorrentes/$id).remove()` — **hard delete ainda presente** (linha 5980), enquanto `lancamentos`, `orcamentos` e `quote_payments` migraram para soft-delete. A reconciliação anterior tratou de `lancamentos`; `recorrentes` ficou de fora. Pode ser deliberado (recorrente é template, não registro financeiro), mas a inconsistência não está documentada. Sob a baseline seria negado de qualquer forma. | 🟡 média — **confirmar se é intencional** |
| **V4** | `BACKUP_RESTORE_NODES` inclui seis nós médico-only, mas nada no código restringe a restauração ao médico. A secretária consegue disparar a operação; ela falha em bloco no servidor. Falta guarda no cliente. | 🟡 média |
| **V5** | Autorização por e-mail literal, repetida 12 vezes no JSON. Frágil a troca de endereço e sem `auth.uid`/papéis. Já registrado no GAP doc como dívida — segue válido. | 🟢 conhecida |

---

## 7. Conclusão

1. Li o repositório correto: `site-drfelipehissa`, branch `feat/auditoria-analista-financeiro`, `analista_financeiro.html` da raiz (mtime 2026-08-20 00:18).
2. Os três achados estáticos da rodada anterior eram de cópia desatualizada e **não se reproduzem** no arquivo vigente — descartados.
3. **A baseline confere consigo mesma: 6/6.** A tabela de previsão do roteiro reproduz exatamente o que o JSON determina, e as regras estão no **nó correto (`/consultorio`)**, alinhadas aos caminhos reais do app.
4. **A procedência continua NÃO CONFIRMADA.** Playground não executado — nenhum navegador conectado à sessão e o Console exige autenticação. Todo gap fica CONFIRMADO *no JSON*, INCONCLUSIVO *em produção*.
5. **Maior risco confirmado: V1+V2** — o código grava em `quote_payments` e `recorrentes`, a baseline nega ambos, e as escritas são atômicas. Se publicada, **o pagamento de orçamento e a geração de recorrentes estão indisponíveis**, e a restauração de backup falha em bloco.
6. Segundo risco: escrita de coleção sem `.validate` e sem escopo por `$id` — `set(null)` na coleção inteira é permitido aos dois usuários.
7. Terceiro: `log` é append-only de verdade, mas a **autoria é forjável** — o cliente escolhe `usuario` e `email`.
8. **Prioridade 1 (mais barata):** exportar o backup JSON. Se `quote_payments` vier vazio com orçamentos pagos, isso praticamente confirma a baseline **sem depender do Console**, e ainda quantifica o passivo histórico. Duas respostas por um arquivo.
9. **Prioridade 2:** Playground para os 6 casos, contra a coluna derivada da seção 2. Basta conectar o navegador com sessão do Console ativa.
10. **Não propor nem implantar regra nova** enquanto (B) não fechar — conforme a regra de decisão do próprio roteiro. Nada foi escrito, nada foi deployado, nenhum dado pessoal consta deste relatório.
