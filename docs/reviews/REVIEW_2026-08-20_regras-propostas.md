# REVIEW — Regras RTDB propostas (endurecimento + desbloqueio)

**Data:** 2026-08-20
**Executor:** Claude (executor de endurecimento de regras)
**Modo:** somente leitura no repositório · **nenhum deploy** · **nenhuma escrita real no banco** · nenhum dado pessoal neste relatório
**Entregáveis:** `firebase.database.rules.proposed.json` (novo, não sobrescreve a baseline) · `firebase.database.rules.published-2026-08-20.json` (cópia fiel do que está publicado — artefato de rollback) · `tools/checar_backup_vs_rules_proposed.js` · este relatório

**Veredito:**
- Questão **B (procedência da baseline)** — **FECHADA. A baseline É a regra publicada.** Confirmada por duas vias independentes: leitura direta do texto publicado no Console (comparação programática: idênticas) e 12/12 simulações comportamentais no Rules Playground. Detalhe na §2.
- **Consequência operacional confirmada:** pagamento de orçamento, geração de recorrentes e restauração de backup estão **indisponíveis em produção agora** — não degradados, negados em bloco.
- Regra **proposta** — **VALIDADA em três camadas**: 77/77 casos de autorização e 12/12 de regressão em motor offline; **11/11 casos-chave no Rules Playground do próprio projeto**, contra o motor real do Firebase; e a **restauração do backup real inteiro** (190 lançamentos, 52 orçamentos, 51 pacientes) aprovada tanto no espelho de predicados quanto no motor de regras. Nenhuma divergência em nenhuma camada.
- **Nenhuma pendência bloqueante restante.** Os cinco pré-requisitos de deploy (§9) estão cumpridos; falta a autorização do titular e a janela.

**Sobre o rascunho no Console:** a regra proposta foi colada no editor **apenas como rascunho**, com autorização explícita do titular, para permitir a simulação. Ao final foi **descartada** ("Mudanças descartadas"). Verificação pós-descarte: editor com 1.633 caracteres, 11 chaves sob `consultorio`, zero ocorrências de `.validate`, sem `quote_payments`, sem `recorrentes`, sem rascunho pendente — ou seja, exatamente a baseline publicada. **Nada foi publicado.**

---

## PASSO 0 — Confirmação do repositório

| Item | Valor |
|---|---|
| Pasta lida | `C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa` |
| Branch | `feat/auditoria-analista-financeiro` |
| HEAD | `9362d27 novidades` |
| Contém `docs/`? | ✅ `docs/architecture/` + `docs/reviews/` |
| Baseline na raiz? | ✅ `firebase.database.rules.unverified.json` (1.494 bytes, mtime 2026-07-31 18:31) |
| Módulo lido | `analista_financeiro.html` na **raiz do repo** — 396.820 bytes, mtime 2026-08-20 18:19 |

A pasta plana `Downloads\analista\analista financeiro` **não foi lida** em nenhum momento desta rodada.

---

## 1. Leituras obrigatórias — feitas

`firebase.database.rules.unverified.json` · `docs/architecture/FIREBASE_RTD_RULES_GAP.md` · `docs/architecture/FIREBASE_RTD_RULES_VERIFICATION.md` · `docs/reviews/REVIEW_2026-08-20_verificacao-rules-rtdb-execucao.md` · `docs/reviews/REVIEW_2026-08-20_backup-contagens-e-limpeza-procedimentos.md` · `analista_financeiro.html` (extração de contratos na §3).

---

## 2. Questão B — FECHADA: a baseline é a regra publicada

### 2.1 Prova direta — leitura do texto publicado

Projeto identificado pelo próprio módulo (`analista_financeiro.html`, L1357-1360): `projectId: consultorio-felipe`, `databaseURL: https://consultorio-felipe-default-rtdb.firebaseio.com`. O Console confirma a instância e a região (`us-central1`).

O texto das regras publicadas foi lido no editor do Console e comparado programaticamente com `firebase.database.rules.unverified.json`:

```
PUBLICADA == BASELINE ? IDENTICAS
chaves publicadas: .read, lancamentos, orcamentos, patients, hospitalPrices,
                   procedureConfig, procedures, procedureTeamCosts,
                   procedureCommissionRules, config, log
```

A comparação normaliza ordem de chaves e espaçamento; o conteúdo é o mesmo, expressão por expressão. **A cópia local nunca foi "não verificada" no sentido de estar errada — ela estava certa, e agora está confirmada.** O arquivo foi preservado como `firebase.database.rules.published-2026-08-20.json`, que é ao mesmo tempo a evidência e o artefato de rollback do plano de deploy.

### 2.2 Prova comportamental — os 6 casos do roteiro, executados

Rodados no **Rules Playground do projeto real**, contra as regras publicadas, com API `set`, provedor `google.com` e o e-mail de cada papel. Simulação pura: o Playground não escreve. Resultado na matriz A (§5) — **12/12 conferem** com a coluna derivada estaticamente pelo REVIEW de verificação e com o motor offline.

Um controle importante: os casos (c), (d) e (e) retornaram **"Gravação permitida"** e os casos (a), (b) e (f) retornaram **"Gravação recusada"**. O banner alterna, então não estou lendo resultado velho — e essa preocupação não é teórica: numa das rodadas o clique em "Executar" não registrou e o banner anterior permaneceu. A partir daí passei a validar cada resultado pela lista de regras avaliadas, que carrega o identificador único do caminho simulado.

### 2.3 O que isso muda

O `FIREBASE_RTD_RULES_GAP.md` tratava toda a tabela de efeitos como **condicional** à confirmação da baseline. A condição está satisfeita. Portanto, deixam de ser hipótese e passam a ser fato de produção:

- `quote_payments` e `recorrentes` não têm `.write` em nenhum ancestral → toda escrita é negada;
- como pagamento e geração de recorrente são `update()` multi-path (tudo-ou-nada), **a operação inteira cai** — receita, status, vínculo e auditoria juntos;
- a restauração de backup, que escreve os 11 nós num único `update()`, **falha em bloco**;
- os 6 lançamentos órfãos com `linked_pay_id` e os 50 orçamentos sem `quote_payment` são o resíduo desse mecanismo, não coincidência.

**O endurecimento deixou de ser opcional: ele é o conserto de uma indisponibilidade em curso.**

### 2.4 Nota de método — o que não deu para usar

Registro para não se repetir tentativa numa próxima rodada: o emulador oficial do RTDB não roda neste sandbox. `firebase-tools@15.28.1` instala normalmente, mas o download do jar é bloqueado pela rede:
`Error: Failed to make request to https://storage.googleapis.com/firebase-preview-drop/emulator/firebase-database-emulator-v4.11.2.jar`

Computer-use no desktop também não serve para o Console: navegadores só são concedidos em tier `read` (vejo a tela, não clico). O caminho que funcionou foi a **extensão Claude in Chrome**, pareada pelo titular no meio desta sessão.

### 2.5 O motor offline usado antes do pareamento

**`targaryen@3.1.0`** — reimplementação offline do motor de regras do RTDB, com suporte a `.read`/`.write`/`.validate`, cascata, `newData`/`data`/`root`, variáveis `$id` e **`update()` multi-path** (essencial aqui, porque todos os fluxos críticos são atômicos).

**Calibração antes de confiar na ferramenta.** Rodei a baseline contra os 6 casos do roteiro `FIREBASE_RTD_RULES_VERIFICATION.md` mais 13 casos derivados: **19/19** conferem com as previsões estáticas do REVIEW de verificação (matriz A, §5). Depois do pareamento do navegador, a ferramenta foi confrontada com o **motor real** em 23 comparações diretas (matrizes A e D) — **23/23**. Ou seja: o que começou como aproximação virou instrumento com fidelidade medida, e é por isso que as matrizes B e C, que rodaram só offline, podem ser levadas a sério.

**Semântica confirmada empiricamente** (documentada aqui porque é a base de todo o desenho da §4):

| Comportamento | Verificado |
|---|---|
| `.write` cascateia do ancestral; concedido no filho **não** autoriza escrita no ancestral | ✅ |
| `.validate` do ancestral **é avaliado** em escrita de campo profundo, com `newData` = estado **mesclado** | ✅ (é o que torna `hasChildren` seguro para `deletedAt`, e perigoso para restauração de registro legado incompleto) |
| `.validate` é ignorado quando o valor escrito é `null` | ✅ |
| `update()` multi-path é tudo-ou-nada: um caminho negado derruba a operação inteira | ✅ |

### 2.6 Convergência com a TAREFA 2

A TAREFA 2 (backup real de 2026-08-20) mediu `quote_payments: 0`, `recorrentes: 0`, 50 orçamentos (2 aceitos) e **6 lançamentos com `linked_pay_id` órfãos**. Aquele relatório chamou isso de "evidência forte" e recomendou o Playground como confirmação. A confirmação veio, e nas duas vias. Vale registrar que a inferência a partir do backup estava correta **antes** de qualquer acesso ao Console — a contagem agregada foi, de fato, o teste de procedência mais barato disponível.

---

## 3. Contratos extraídos do cliente (o que as regras precisam honrar)

Todos confirmados por leitura de `analista_financeiro.html` (raiz do repo).

| Fluxo | Caminhos gravados | Papel no cliente |
|---|---|---|
| **Pagamento de orçamento** (`_executarSalvarPagamento`, ~L5509-5590) | `quote_payments/<payId>` (create) · `lancamentos/<lancId>` (create) · `lancamentos/<taxaId>` (create, opcional) · `orcamentos/<id>/receitaGeradaId` · `orcamentos/<id>/status` · `log/<id>` — **um único `dbRef.update()`** | sem guarda: ambos |
| **Estorno** (`excluirPagamento`, ~L5594-5620) | `quote_payments/<payId>/deletedAt` + `/deletedBy` · `lancamentos/<id>/deletedAt` + `/deletedBy` (N itens) · `orcamentos/<id>/receitaGeradaId = null` · `log/<id>` | sem guarda: ambos |
| **Recorrentes — template** (`salvarRecorrente`/`toggleRecorrente`/`excluirRecorrente`) | `recorrentes/<id>` (set) · `recorrentes/<id>/ativo` · `recorrentes/<id>` = `null` (**hard delete deliberado**) | `isTitular` |
| **Recorrentes — geração** (`_gerarLancRecorrente`, ~L6221-6240) | `lancamentos/<recorrente_…>` · `recorrentes/<recId>/ultimoPeriodoGerado` · `log/<id>` — update atômico | **sem guarda**: dispara na sessão de **qualquer** usuário logado (chamado pelo listener em `_processarRecorrentes`) |
| **Restauração de backup** (`importarJSON`, ~L3601-3650) | `dbRef.update(nodes)` com os 11 nós de `BACKUP_RESTORE_NODES` — **escrita no nível da COLEÇÃO**, não por `$id`. `log` fica de fora do contrato. | `isTitular` (guarda V4, já no cliente) |
| **Purga da lixeira** (`purgarLancamento`, `purgarOrcamento`) | `lancamentos/<id>` = `null` (grupo inteiro) · `orcamentos/<id>` = `null` | sem guarda: ambos |
| **Log** (`criarEventoLog`) | `log/<id>` com `{id, data, dataServidor:ServerValue.TIMESTAMP, usuario, email, acao, detalhe}`; `id` == chave do nó | ambos |
| **LGPD / anonimização** | `patients/<pid>` (set) + N × `lancamentos/<lid>/paciente` | ambos |

**Descoberta com consequência de desenho:** a geração automática de recorrentes roda na sessão da secretária também. Se `recorrentes` virasse titular-only sem exceção, a geração falharia na sessão dela — e, por atomicidade, derrubaria junto o lançamento e o log. A proposta resolve com uma exceção de campo (§4.4).

---

## 4. A regra proposta — diff comentado

Arquivo: **`firebase.database.rules.proposed.json`** (novo; a baseline permanece intacta).

Notação: `MED` = `auth.token.email == 'drfelipehissacoelho@gmail.com'`, `SEC` = `… == 'simonefrancape@gmail.com'`. Regras RTDB não têm funções — os literais aparecem expandidos no arquivo.

### 4.1 Leitura — inalterada, de propósito

```
consultorio/.read : auth != null && (MED || SEC)      ← idêntica à baseline
```

Nenhum `.read` em filho. Objetivo (e) do escopo: o app carrega tudo por um `.on('value')` em `ref('consultorio')`; em RTDB leitura concedida no ancestral **não pode ser revogada** no filho. Tentar segregar custos internos por regra teria efeito zero e, se a leitura da raiz fosse retirada, o app simplesmente não carregaria. Fica como recomendação de cliente (§8), não como regra.

### 4.2 Padrão novo: coleção titular-only + `$id` para os dois

Aplicado a `lancamentos`, `orcamentos`, `quote_payments`, `patients`:

```
"<colecao>": {
  ".write": "auth != null && MED",                                  ← NOVO papel no nível da coleção
  "$id": {
    ".write": "auth != null && (MED || SEC) && newData.exists()",    ← NOVO escopo por registro
    … .validate por campo …
  }
}
```

Três efeitos, todos verificados na matriz B:

1. **`set(null)` na coleção inteira deixa de ser possível para a secretária** (casos 5.6, 8.7). Era o buraco mais largo da baseline.
2. **A restauração de backup continua funcionando** — e só para o titular. O cliente restaura escrevendo no nível da coleção; sem esse `.write` de coleção, restaurar seria impossível por regra. A guarda de papel V4, que hoje só existe no cliente, passa a existir também no servidor (casos R2, R4).
3. **`newData.exists()` no `$id` transforma hard delete por `$id` em ato do titular** (casos 5.4/5.5, 6.5/6.6, 3.2/3.3). Soft-delete, restauração da lixeira e edição de campo continuam liberados para os dois, porque nesses casos `newData` no nível do `$id` é o registro mesclado, que existe (casos 5.2, 5.3, 3.1).

**Justificativa da restrição de purga** (o escopo pedia proposta + justificativa): purgar é destruição irreversível de registro financeiro. O fluxo de lixeira — que é a operação do dia a dia — permanece integralmente disponível para a secretária; o que sai da mão dela é apenas o apagamento definitivo. Se o titular preferir manter a purga para os dois, a reversão é de uma linha: remover `&& newData.exists()` do `$id` em `lancamentos` e `orcamentos`.

**Efeito colateral a tratar no cliente:** hoje o botão de purga aparece para a secretária e passaria a falhar com erro do servidor. Recomendação de guarda `isTitular` na §8 — não implementada aqui, porque `analista_financeiro.html` é alça de outro agente.

### 4.3 `quote_payments` — desbloqueio (objetivo a) + integridade

```
".write" (coleção): MED                       ← restauração
"$payId": {
  ".write": (MED || SEC) && newData.exists(),  ← DESBLOQUEIO: o pagamento passa a confirmar
  ".validate": hasChildren(['id','quote_id','amount','payment_date','payment_method','status']),
  "id":        val == $payId,
  "quote_id":  string && (o orçamento existe no estado pós-escrita OU já existe no banco),
  "amount":    number > 0,
  "installments": number >= 1,
  "status":    'confirmado' | 'estornado',
  "payment_date"/"payment_method"/"created_at"/"updated_at"/"deletedAt"/"deletedBy": string
}
```

- `hasChildren` é seguro aqui **porque `quote_payments` tem 0 nós hoje** (contagem do backup). Não há registro histórico para quebrar.
- A dupla condição em `quote_id` é deliberada: a forma `newData.parent()…` enxerga o estado **pós-escrita** (funciona quando pagamento e orçamento vêm no mesmo `update`, como na restauração), e `root.child(…)` enxerga o estado **pré-escrita** (funciona no fluxo normal de pagamento). Aceitar qualquer uma das duas evita depender de uma sutileza de motor num caminho cuja falha significaria manter o pagamento quebrado.
- **Autoria não é exigida** em `created_by_email`. Motivo: `quote_payments` está em `BACKUP_RESTORE_NODES`; exigir `created_by_email == auth.token.email` faria o titular ser incapaz de restaurar um backup contendo pagamentos registrados pela secretária. O trade-off é explícito: não forjabilidade fica garantida onde ela realmente se sustenta — no `log` (§4.6), que nunca é restaurado.
- Estorno é `update`, não `create`: os `deletedAt`/`deletedBy` passam porque `newData` no `$payId` é o registro mesclado (caso 3.1).

### 4.4 `recorrentes` — desbloqueio (objetivo a) + papel + exceção de campo

```
".write" (coleção): MED        ← DESBLOQUEIO para o titular; cobre create, update e o hard delete deliberado
"$recId": {
  ".validate": hasChildren(['descricao','valor','categoria','frequencia']),
  "descricao": string não-vazia,
  "valor": number > 0,
  "frequencia": 'mensal' | 'quinzenal' | 'anual',
  "diaVencimento": number 1..28,
  "ativo": boolean,
  "ultimoPeriodoGerado": {
    ".write": (MED || SEC) && data.parent().exists(),    ← EXCEÇÃO estreita
    ".validate": string
  }
}
```

- `hasChildren` também é seguro aqui: `recorrentes` tem 0 nós hoje.
- `diaVencimento ≤ 28` espelha o clamp do próprio cliente (`Math.min(Math.max(dia,1),28)`).
- A exceção em `ultimoPeriodoGerado` existe pela descoberta da §3: a geração automática roda na sessão da secretária. `data.parent().exists()` exige que o template **já exista**, então ela não consegue criar um recorrente por esse atalho (caso 4.15) — e mesmo que tentasse, o `hasChildren` do `$recId` barraria. O que ela pode fazer é marcar um período como já gerado num template existente; risco residual pequeno e registrado na §6.
- Hard delete de template continua permitido, e só ao titular (casos 4.6/4.7) — a decisão já estava registrada (V3), com o log carregando a definição completa para recriação manual.

### 4.5 `lancamentos` e `orcamentos` — `.validate` deliberadamente tolerante (objetivo b)

```
lancamentos/$id:  valor:number · tipo:'receita'|'despesa' · data/criadoEm/deletedAt/deletedBy/linked_*:string
orcamentos/$id:   total/subtotal/desconto/hospTotal:number · status:aberto|aceito|recusado|expirado
                  receitaGeradaId/data/deletedAt/deletedBy:string
```

**Sem `hasChildren` nessas duas coleções.** É a decisão de compatibilidade mais importante do desenho. O motor confirmou (§2.2) que o `.validate` do `$id` roda também em escrita de campo profundo: se eu exigisse campos obrigatórios em `lancamentos/$id`, um registro histórico incompleto ficaria **impossível de editar e impossível de restaurar**. O caso R1 (backup v1 com registros sem `id`, sem `data`, sem `categoria`) passa exatamente por isso.

Restaram apenas checagens de **tipo e domínio**, que impedem corrupção nova sem exigir completude. Ainda assim, essas checagens rodam sobre os dados históricos numa restauração — daí o pré-requisito da §8.

### 4.6 `log` — autoria não forjável (objetivo d)

```
log/$logId: {
  ".write": (MED || SEC) && !data.exists() && newData.exists(),   ← append-only (mantido) + no-delete explícito
  ".validate": hasChildren(['id','data','usuario','email','acao']),
  "id":      val == $logId,
  "email":   val == auth.token.email,        ← AUTORIA NÃO FORJÁVEL
  "usuario"/"acao": string não-vazia,
  "data"/"detalhe": string
}
```

`log` é o único nó onde a autoria pode ser travada sem custo, porque **não está em `BACKUP_RESTORE_NODES`** — não existe restauração de log para quebrar. Casos 7.2/7.3 comprovam que nenhum dos dois consegue assinar um evento com o e-mail do outro; 7.4-7.8 mantêm append-only, id coerente, campos mínimos e impossibilidade de apagar a coleção.

**Não validei `dataServidor`.** O campo é gravado com `ServerValue.TIMESTAMP` e, embora o sentinela seja resolvido antes da avaliação das regras, o custo de errar essa suposição seria alto: `log/<id>` participa de **todos** os updates atômicos, e uma validação falsa derrubaria pagamento, estorno e geração de recorrente juntos. Valor da checagem: nulo. Risco: catastrófico. Fora.

### 4.7 Nós médico-only — inalterados

`hospitalPrices`, `procedureConfig`, `procedures`, `procedureTeamCosts`, `procedureCommissionRules`, `config` seguem com `.write` de coleção para o titular, exatamente como na baseline. São escritos por caminho profundo (`config/meta`, `procedures/<key>/active`, `hospitalPrices/<hosp>/<proc>`) e também precisam da escrita de coleção para a restauração.

---

## 5. Matriz de evidência

Motor: `targaryen@3.1.0`, offline, sem rede e sem contato com produção. Estado sintético — nenhum dado real, nenhum nome de paciente.
Scripts: `test_baseline.js`, `test_proposed.js`, `test_restore.js` (§10).

### Matriz A — baseline (questão B) — 19/19 offline · **12/12 no Playground real**

| # | Caminho / operação | Previsto pelo roteiro | Motor offline | **Playground (regras publicadas)** |
|---|---|---|---|---|
| B-a | write `quote_payments/teste-fase3` | deny / deny | ✅ confere | **DENY / DENY** ✅ |
| B-b | write `recorrentes/teste-fase3` | deny / deny | ✅ confere | **DENY / DENY** ✅ |
| B-c | write `lancamentos/teste-fase3` | allow / allow | ✅ confere | **ALLOW / ALLOW** ✅ |
| B-d | write `orcamentos/teste-fase3/status` | allow / allow | ✅ confere | **ALLOW / ALLOW** ✅ |
| B-e | write `log/teste-fase3` (nó novo) | allow / allow | ✅ confere | **ALLOW / ALLOW** ✅ |
| B-f | write `log/<id existente>` | deny / deny | ✅ confere | **DENY / DENY** ✅ |
| B-g | read `/consultorio` (médico / secretária) | — | derivado ✅ | não simulado (leitura confirmada pelo uso diário) |
| B-h | read `/consultorio` (terceiro autenticado) | — | derivado ✅ | não simulado |
| B-i | read `/consultorio` (anônimo) | — | derivado ✅ | não simulado |
| B-j | **update atômico de pagamento (5 caminhos)** | — | **DENY ambos** ✅ | coberto por B-a (um caminho negado derruba o conjunto) |
| B-k | **restauração de backup v2 (11 nós)** | — | **DENY** ✅ | coberto por B-a e B-b |

Cada resultado do Playground foi lido com o par (banner, lista de regras avaliadas), e a lista carrega o identificador único do caminho simulado — é o que garante que nenhuma linha acima é resultado velho.

B-j e B-k são a tradução operacional do gap: sob a baseline, **pagar um orçamento e restaurar um backup são operações impossíveis**, para os dois usuários.

### Matriz B — regra proposta — 77/77 conferem

Contagem por bloco (detalhamento completo na saída de `test_proposed.js`):

| Bloco | Casos | Resultado |
|---|---|---|
| 1. Leitura (papéis, terceiro, anônimo, listener único) | 5 | 5/5 ✅ |
| 2. Pagamento atômico — allow, deny e validações negativas | 13 | 13/13 ✅ |
| 3. Estorno (update) e hard delete de pagamento | 3 | 3/3 ✅ |
| 4. Recorrentes — CRUD, papel, validações, geração automática | 15 | 15/15 ✅ |
| 5. Lançamentos — create/edit/soft-delete/restaurar/purga/LGPD | 14 | 14/14 ✅ |
| 6. Orçamentos — create/status/purga/soft-delete | 9 | 9/9 ✅ |
| 7. Log — autoria, append-only, campos mínimos | 10 | 10/10 ✅ |
| 8. Nós médico-only e pacientes | 8 | 8/8 ✅ |
| **Total** | **77** | **77/77, 0 divergências** |

Casos que merecem destaque:

| # | Caso | Médico | Secretária | Leitura |
|---|---|---|---|---|
| 2.1/2.2 | update atômico de pagamento, 5 caminhos | **ALLOW** | **ALLOW** | 🔓 **o desbloqueio funciona** |
| 2.5 | pagamento em cartão com taxa, 6 caminhos | — | **ALLOW** | fluxo completo confirma |
| 2.11 | pagamento órfão (`quote_id` inexistente) | — | DENY | integridade referencial ativa |
| 2.6/2.7/2.8 | `amount` = 0, negativo, string | — | DENY | valor monetário protegido |
| 3.1 | estorno completo (5 caminhos, `receitaGeradaId = null`) | — | **ALLOW** | update, não só create |
| 4.13/4.14 | geração automática de recorrente (3 caminhos) | ALLOW | **ALLOW** | a exceção de campo salva a sessão da secretária |
| 4.15 | criar recorrente pelo atalho `ultimoPeriodoGerado` | — | DENY | a exceção não vira porta |
| 5.5/6.6 | **purga por `$id`** | ALLOW | **DENY** | restrição proposta |
| 5.6/8.7 | **`set(null)` na coleção** | (titular sim) | **DENY** | buraco da baseline fechado |
| 7.2/7.3 | log assinado com o e-mail do outro | **DENY** | **DENY** | autoria não forjável |

### Matriz C — regressão de restauração de backup

**12/12 conferem.** O contrato do cliente é `dbRef.update(nodes)` com os 11 nós de `BACKUP_RESTORE_NODES` escritos **no nível da coleção** — foi essa forma exata que testei, não uma aproximação por `$id`.

| # | Cenário | Auth | Esperado | Obtido | Leitura |
|---|---|---|---|---|---|
| R1 | **backup v1** (só `lancamentos`, com registros sem `id`, sem `data`, sem `categoria`, com `valor: 0` e com `deletedAt`) | médico | ALLOW | **ALLOW** | 🟢 **a tolerância funciona** — registros históricos incompletos restauram |
| R2 | backup v1 | secretária | DENY | **DENY** | guarda V4 agora também no servidor |
| R3 | **backup v2 completo** (11 nós, incl. `orcamentos` legado só com `paciente`+`total` e `patients` sem `id`) | médico | ALLOW | **ALLOW** | 🟢 restauração completa preservada |
| R4 | backup v2 completo | secretária | DENY | **DENY** | — |
| R5 | v2 com `quote_payment` criado pela **outra** pessoa | médico | ALLOW | **ALLOW** | confirma a decisão de não exigir autoria em `quote_payments` (§4.3) |
| R6 | v2 onde o orçamento do pagamento vem **no mesmo payload** | médico | ALLOW | **ALLOW** | a integridade referencial usa o estado pós-escrita, não quebra restore |
| R7 | v2 com `quote_payment` **órfão** (orçamento ausente do payload **e** do banco) | médico | DENY | **DENY** | ⚠️ trade-off consciente — ver RR3 |
| R8 | v2 com `lancamento` de **`valor` string** | médico | DENY | **DENY** | ⚠️ **é este o caso que o `checar_backup_vs_rules_proposed.js` existe para antecipar** (RR2) |
| R9 | v2 com `recorrente` sem `categoria` | médico | DENY | **DENY** | `hasChildren` só é seguro porque `recorrentes` tem 0 nós hoje |
| R10 | v2 com `orcamento` de `status` fora do enum | médico | DENY | **DENY** | ⚠️ trade-off — coberto pelo checker |
| R11 | v1 **parcial** (`update` não apaga nós ausentes) | médico | ALLOW | **ALLOW** | preserva o comportamento crítico do `importarJSON` |
| R12 | restauração tentando incluir `log` (fora do contrato do cliente) | médico | DENY | **DENY** | `log` continua append-only, imune a restauração |

**Como ler R7-R10:** são as quatro formas de um backup real ser recusado pela regra proposta. Nenhuma delas ocorre com dados produzidos pelo cliente vigente; todas são possíveis com dados históricos. É exatamente por isso que a checagem do backup real (§7.2) é pré-requisito **bloqueante** de deploy, e não recomendação.

### Matriz D — regra proposta no Rules Playground **do projeto real** — 11/11 conferem

Executada com a proposta colada no editor como **rascunho autorizado**, descartada ao final (§ cabeçalho). Motor: o do Firebase, não o offline. Esta matriz é o que responde ao risco RR1 — ela exercita justamente o que a baseline **não** exercita: `.validate`, `hasChildren`, `newData.parent()` e `update()` multi-path.

| # | Cenário simulado | Auth | Esperado (offline) | **Observado (Firebase)** | |
|---|---|---|---|---|---|
| P1 | **Pagamento atômico**: `quote_payments` + `lancamentos` + `orcamentos` (com `status` e `receitaGeradaId`) + `log`, num único `update` | secretária | ALLOW | **ALLOW** | ✅ 🔓 **o desbloqueio funciona no motor real** |
| P2 | mesmo pagamento com `amount: 0` | secretária | DENY | **DENY** | ✅ |
| P3 | `quote_payments` com `quote_id` de orçamento inexistente (órfão) | secretária | DENY | **DENY** | ✅ integridade referencial ativa |
| P4a | criar `recorrentes/<id>` completa | médico | ALLOW | **ALLOW** | ✅ 🔓 recorrentes desbloqueadas |
| P4b | mesma criação | secretária | DENY | **DENY** | ✅ papel respeitado |
| P5 | criar recorrente pelo atalho `ultimoPeriodoGerado` | secretária | DENY | **DENY** | ✅ a exceção de campo não vira porta |
| P6a | **purga** `lancamentos/<id>` = `null` | secretária | DENY | **DENY** | ✅ restrição proposta |
| P6b | mesma purga | médico | ALLOW | **ALLOW** | ✅ |
| P7a | `log/<novo>` assinado com o e-mail **da outra pessoa** | médico | DENY | **DENY** | ✅ 🔒 **autoria não forjável** |
| P7b | `log/<novo>` assinado com o próprio e-mail | médico | ALLOW | **ALLOW** | ✅ |
| P8 | `set(null)` na **coleção** `lancamentos` | secretária | DENY | **DENY** | ✅ buraco da baseline fechado |

**Zero divergências entre o motor offline e o Firebase**, somando as matrizes A e D: 23 comparações diretas, 23 coincidências. As matrizes B e C (89 casos) rodaram só offline, mas passam a se apoiar num motor cuja fidelidade foi medida, não suposta.

**Nota sobre P1 (o teste mais forte).** O orçamento referenciado pelo pagamento foi criado **no mesmo `update`**, não no banco. Isso força a validação de `quote_id` a passar pelo ramo `newData.parent().parent().parent()`, que enxerga o estado pós-escrita — o ramo difícil. Ele funcionou no motor real. Como o outro ramo (`root.child(...)`) está em `OR`, ele só pode tornar a regra **mais** permissiva: não existe cenário em que ele cause uma negação que o primeiro ramo já não causasse. Por isso não precisou de teste separado.

**Duas coisas que o Playground não conseguiu testar, e por quê:**

| Não testado | Motivo | Onde fica coberto |
|---|---|---|
| `ultimoPeriodoGerado` gravado pela secretária num template **existente** (o caso positivo da exceção) | O Playground usa os **dados reais**, e `recorrentes` está vazio em produção — não há template existente para referenciar. O caso negativo (P5) foi testado e passou. | Offline, caso 4.13/4.14 |
| Restauração de backup contra dados históricos | Exigiria montar o payload real no simulador, ou seja, manipular dados pessoais no Console | Offline, matriz C + `checar_backup_vs_rules_proposed.js` sobre o backup real |

---

## 6. Riscos residuais

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| **RR1** | ~~O motor de teste não é o motor do Firebase.~~ **RESOLVIDO.** 23 comparações diretas entre `targaryen` e o Playground do projeto real (matrizes A e D), incluindo `.validate`, `hasChildren`, `newData.parent()` e `update()` multi-path: 23/23 coincidem. | 🟢 fechado | Resíduo mínimo: as matrizes B e C (89 casos) seguem só offline. O smoke test pós-deploy (§9) é a verificação final. |
| **RR2** | ~~`.validate` roda sobre dados históricos na restauração.~~ **FECHADO com dados reais.** O backup de 2026-08-20 (190 lançamentos, 52 orçamentos, 51 pacientes) passa nos dois testes: espelho de predicados **APROVADO** e restauração completa no motor de regras **ALLOW** (§7.2). | 🟢 fechado | Resíduo: vale re-rodar o checador antes de qualquer republicação futura das regras, e sobre backups mais antigos se um dia for preciso restaurá-los. |
| **RR3** | **Pagamento órfão passa a ser recusado.** Registrar pagamento cujo orçamento foi purgado deixa de ser possível. | 🟡 média | É o comportamento desejado. Os 6 lançamentos órfãos existentes **não são afetados** — vivem em `lancamentos`, não em `quote_payments`, e nenhuma regra nova os toca. |
| **RR4** | **O titular continua podendo destruir uma coleção inteira.** `.write` de coleção é o que viabiliza a restauração. | 🟡 média | Inerente ao contrato de restauração do cliente. Só sai se o cliente passar a restaurar por `$id`. Mitigação real: backup antes de restaurar (§9). |
| **RR5** | **Botão de purga da secretária passa a falhar no servidor** em vez de não aparecer. | 🟡 média | Guarda `isTitular` no cliente (§8, alça de outro agente). Até lá, a mensagem de erro é visível e não corrompe nada. |
| **RR6** | **Secretária pode marcar `ultimoPeriodoGerado` em template existente**, pulando uma geração. | 🟢 baixa | Preço da geração automática funcionar na sessão dela. Alternativa seria gatear `_processarRecorrentes` por `isTitular` no cliente e fechar a exceção. |
| **RR7** | **Autorização por e-mail literal**, agora repetida em mais lugares. Troca de endereço quebra tudo de uma vez. | 🟢 conhecida | Dívida herdada da baseline. Evolução: `auth.uid` + papéis versionados em `config/roles`. Fora do escopo desta rodada. |
| **RR8** | `.validate` não cobre **transição de estado** (ex.: impedir `aceito → aberto` com pagamento confirmado) nem soma de pagamentos ≤ total do orçamento. | 🟢 baixa | Regra de RTDB não expressa bem agregação. Fica no cliente (`calcSaldoPendente` já bloqueia) e como candidato a Cloud Function. |

---

## 7. Verificação exigida antes do deploy

### 7.1 Casos-chave no Playground — ✅ **EXECUTADOS**

Os 8 casos previstos (mais 3 variantes) foram simulados contra a regra proposta no Playground do projeto real. Resultado na **matriz D (§5): 11/11**. Nada divergiu.

### 7.2 Checagem do backup real — ✅ **EXECUTADA, APROVADA**

Backup `backup_20260820.json` (v2) fornecido pelo titular, processado em ambiente isolado e **não guardado no repositório**. Duas verificações independentes:

**(a) Espelho de predicados** — `tools/checar_backup_vs_rules_proposed.js`:

```
backup versao: 2
contagens → lancamentos: 190 | orcamentos: 52 | quote_payments: 0 | recorrentes: 0 | patients: 51

✅ APROVADO — todos os registros passam nos .validate da regra proposta.
   A restauracao deste backup NAO seria bloqueada pelas novas regras.
```

**(b) Restauração real no motor de regras** — `test_restore_real.js` reproduz `importarJSON()` (mesma normalização, mesmos 11 nós, um único `update()` em `/consultorio`) e submete o **backup inteiro** ao motor:

| Cenário | Médico | Secretária |
|---|---|---|
| banco vazio (pior caso — restauração em base zerada) | **ALLOW** ✅ | **DENY** ✅ |
| banco com o conteúdo atual (restauração por cima) | **ALLOW** ✅ | **DENY** ✅ |

Nós exercitados, com contagem real: `lancamentos:190 · orcamentos:52 · quote_payments:0 · patients:51 · hospitalPrices:4 · procedureConfig:32 · procedures:15 · procedureTeamCosts:16 · procedureCommissionRules:3 · config:3 · recorrentes:0`.

A verificação (b) é mais forte que a (a): o espelho compara predicados escritos em JavaScript, o motor **executa as regras propostas** sobre os 194 registros com `.validate` do banco real. Os dois concordam.

**Consequência:** o risco RR2 — o mais grave da lista — está **fechado com dados reais**. Nenhum registro histórico tem tipo divergente; `valor` é número em todos os 190 lançamentos, `status` está no enum nos 52 orçamentos, `nome` é string não-vazia nos 51 pacientes.

Uma observação que vale registrar: o backup confirma pela terceira vez o diagnóstico — **`quote_payments: 0` e `recorrentes: 0`**, com 52 orçamentos vivos. As duas coleções que a baseline nega são exatamente as duas que estão vazias.

O script espelho continua útil: ele **espelha** os predicados das regras em JavaScript, então ao mexer no JSON das regras é preciso mexer nele também. Rodá-lo antes de cada republicação futura é barato.

---

## 8. O que fica de fora, e por quê

| Item | Por que não entrou |
|---|---|
| **Segregação de leitura por papel** (esconder custos internos, comissões e logs da secretária) | Impossível por regra: `.read` concedido em `/consultorio` não pode ser revogado em filho, e o app carrega tudo por um `.on('value')` na raiz. Exige refatorar o cliente para listeners por nó. **Recomendação, não implementação** — já registrada no GAP doc. |
| **Guarda `isTitular` nos botões de purga** (`purgarLancamento`, `purgarOrcamento`) | `analista_financeiro.html` é alça de outro agente. Sem a guarda, a secretária vê erro de servidor em vez de botão ausente. **Recomendação de cliente.** |
| **Guarda `isTitular` em `_processarRecorrentes`** | Idem. Se implementada, a exceção de `ultimoPeriodoGerado` (§4.4) pode ser removida e RR6 desaparece. **Recomendação de cliente.** |
| **Migração para `auth.uid` + papéis versionados** | Mudança de modelo de autorização; merece rodada própria, com plano de migração e teste de não-quebra. Manter e-mail literal agora é a opção que não introduz risco novo. |
| **`hasChildren` em `lancamentos` / `orcamentos` / `patients`** | Quebraria edição e restauração de registros históricos incompletos (§4.5, caso R1). Tolerância deliberada. |
| **Autoria não forjável em `quote_payments` / `lancamentos`** | Quebraria a restauração de backups contendo registros criados pela outra pessoa (§4.3). A propriedade fica garantida no `log`, onde ela se sustenta. |
| **Validação de agregados** (soma de pagamentos ≤ total, transição de status) | Regras de RTDB não expressam agregação sobre coleção. Candidato a Cloud Function. |
| **`firebase.json` / `.firebaserc` / deploy por CLI** | O repositório segue sem configuração de deploy, e criar uma seria abrir caminho para publicação automática — proibido pelo escopo. Publicação continua manual, pelo Console. |

---

## 9. Plano de deploy (sujeito a autorização explícita do titular)

**Nada disto foi executado.**

**Pré-requisitos**

| # | Pré-requisito | Situação |
|---|---|---|
| 1 | Questão B fechada — regras publicadas lidas e 6 casos simulados | ✅ **feito** (§2) |
| 2 | Casos-chave da proposta simulados no Playground | ✅ **feito** — matriz D, 11/11 |
| 3 | Rollback de regras: cópia fiel do texto publicado | ✅ **feito** — `firebase.database.rules.published-2026-08-20.json` |
| 4 | `checar_backup_vs_rules_proposed.js` com saída **APROVADO** sobre backup do mesmo dia | ✅ **feito** — §7.2, mais a restauração completa no motor de regras |
| 5 | **Backup fresco baixado e guardado fora do repositório** (botão de backup do módulo, v2, 12 nós). É o rollback de dados. | ✅ **exportado** — `backup_20260820.json`. **Guardar fora do repositório** (contém dados pessoais; não versionar). |

**Todos os pré-requisitos estão cumpridos.** A publicação depende agora só da sua autorização e da janela.

**Janela**

Fora do horário de atendimento, com o titular na frente do Console e a secretária **fora** do sistema. Duração estimada: 15 minutos, dos quais 10 são de smoke test.

**Execução**

1. Console → Realtime Database → Regras → colar `firebase.database.rules.proposed.json` → repetir 2 ou 3 casos da matriz D no Playground como sanidade → só então **Publicar**. (Se algo der errado antes de publicar, o botão **Descartar** devolve o editor à regra publicada — foi o que usei ao final desta rodada.)
2. Smoke test imediato, **no ambiente real, com dados de teste que serão apagados em seguida**:
   - criar orçamento de teste (valor simbólico) → **pagar** → conferir que o pagamento aparece e o saldo baixa. *Este é o teste que importa: é a operação que hoje está quebrada.*
   - estornar esse pagamento → conferir lixeira e `receitaGeradaId`.
   - criar recorrente de teste → conferir que persiste → apagar.
   - lançar despesa avulsa pela conta da secretária → conferir.
   - abrir o app com a conta da secretária e confirmar que carrega (leitura da raiz intacta).
   - purgar o orçamento de teste com a conta do titular.
3. Conferir no log de auditoria que os eventos das operações acima entraram com o e-mail correto.

**Rollback**

- **Gatilho:** qualquer operação do smoke test falhar, ou a secretária relatar erro em fluxo normal nas primeiras 24h.
- **Ação:** republicar `firebase.database.rules.published-2026-08-20.json` no Console. Volta ao estado anterior em segundos, sem tocar em dados.
- **Se dados tiverem sido afetados** (só plausível se alguém restaurar backup durante a janela): restaurar o backup do pré-requisito 4 pelo próprio módulo, com a conta do titular.
- **Importante:** rollback de regras **não desfaz** escritas já confirmadas. Por isso o smoke test usa dados de teste descartáveis.

**Pós-deploy**

- 24h de observação. Se a secretária relatar erro em purga, é RR5 — esperado; encaminhar a guarda de cliente.
- Reconciliação dos **6 lançamentos órfãos** e dos **50 orçamentos sem `quote_payment`**: rodada separada, com plano próprio. Nenhuma regra nova os afeta.
- Registrar em `docs/architecture/FIREBASE_RTD_RULES_GAP.md` que a baseline deixou de ser a regra vigente, com a data.

---

## 10. Reprodutibilidade

| Arquivo | O que é |
|---|---|
| `firebase.database.rules.proposed.json` | a proposta (raiz do repo, ao lado da baseline, que segue intacta) |
| `firebase.database.rules.published-2026-08-20.json` | cópia fiel do texto publicado, lida do Console — evidência da questão B e **artefato de rollback** |
| `tools/checar_backup_vs_rules_proposed.js` | verificador de compatibilidade do backup real com os `.validate` propostos |
| `docs/reviews/rules-lab/harness.js` | estado sintético + runner |
| `docs/reviews/rules-lab/test_baseline.js` | matriz A (19 casos) |
| `docs/reviews/rules-lab/test_proposed.js` | matriz B (77 casos) |
| `docs/reviews/rules-lab/test_restore.js` | matriz C (regressão de restauração, dados sintéticos) |
| `docs/reviews/rules-lab/test_restore_real.js` | restauração do **backup real** no motor de regras (§7.2b). Recebe o caminho do backup como argumento; imprime só allow/deny e contagens |

Para rodar: `npm install targaryen@3.1.0` e `node test_baseline.js && node test_proposed.js && node test_restore.js`.

---

## 11. Conclusão

1. Repositório e branch confirmados; `analista_financeiro.html` da raiz, mtime 2026-08-20 18:19.
2. **Questão B está fechada.** As regras publicadas em `consultorio-felipe` são idênticas à baseline — provado por leitura direta do texto **e** por 12/12 simulações comportamentais. A cópia local estava certa desde o início.
3. **O que era hipótese virou fato de produção:** pagamento de orçamento, geração de recorrentes e restauração de backup estão **negados em bloco agora**, para os dois usuários. O endurecimento é o conserto de uma indisponibilidade em curso, não uma melhoria defensiva.
4. **A proposta foi validada em três camadas:** 89 casos offline (77 de autorização + 12 de regressão), 11 casos no motor real do Firebase e a restauração do **backup real inteiro**. Zero divergências — inclusive nos recursos que a baseline não exercita (`.validate`, `hasChildren`, `newData.parent()`, `update()` multi-path). Os riscos RR1 e RR2, os dois únicos classificados como altos, estão **fechados**.
5. **Não resta bloqueante.** Os `.validate` novos foram medidos contra os 194 registros reais que os exercitam: nenhum tipo divergente, nenhum status fora do enum, nenhum nome vazio. A restauração do backup passa em base zerada e em base cheia.
6. O rascunho colado no Console foi **descartado** e verificado como descartado. **Nada foi publicado, nada foi escrito no banco**, nenhum dado pessoal consta deste relatório, e `analista_financeiro.html` não foi alterado.
