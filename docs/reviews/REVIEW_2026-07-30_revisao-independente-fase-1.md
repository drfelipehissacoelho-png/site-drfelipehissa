# Revisão Independente — parecer sobre a Fase 1 (integridade crítica)

**Data:** 2026-07-30
**Revisor:** revisão independente (segundo revisor)
**Documento revisado:** `docs/reviews/REVIEW_2026-07-30_fase-1-integridade-critica.md`
**Código revisado:** `git diff` de `analista_financeiro.html` (278 inserções / 189 remoções, não commitado)

---

## 0. Veredito

**NÃO APROVADO para merge no estado atual.**

A direção arquitetural está correta e a maior parte das alegações do relatório foi confirmada no código. Porém, a mudança de `genId()` para chave `push()` introduziu **duas regressões confirmadas** que o relatório não identificou, e o bloqueio de sobrepagamento tem um caso reachable em que o operador é impedido de registrar o **valor pré-preenchido pelo próprio sistema**.

São 3 bloqueadores. Todos são correções pequenas e localizadas. Após corrigi-los, aprovo o lote.

---

## 1. Alegações verificadas do relatório original

Confirmadas no código (fato demonstrado, não inferência):

| Alegação | Status |
| --- | --- |
| `genId()` usa `dbRef.push().key` | ✅ confirmado (l. 1425) |
| `jsArg()` aplicado nos handlers de ID | ✅ confirmado — nenhum `${x.id}` cru sobrou em atributo `on*` |
| Orçamento novo/edição em `update()` multi-path com log no mesmo commit | ✅ confirmado |
| Pagamento: `quote_payments` + receita + taxa + status + log em um único `update()` | ✅ confirmado |
| `salvarEImprimir/EPDF/EPagar` aguardam a Promise | ✅ confirmado (`async/await`) |
| Datas `date` usam calendário local | ✅ confirmado — **zero** ocorrências de `toISOString().split` restantes |
| `restaurarOrcamento` / `purgarOrcamento` implementadas | ✅ confirmado; `restaurarLancamento`/`purgarLancamento` já existiam (l. 2095/2119) |
| Restauração não sobrescreve `log` | ✅ confirmado |
| `recorrentes` no backup | ✅ confirmado |
| Validação hospital–procedimento em salvar / PDF rápido / impressão rápida | ✅ confirmado |
| `node --check` do script inline | ✅ reproduzido: 1 script inline, 282.542 chars, sintaxe OK |

**Falso-negativo do relatório:** a alteração `Math.round(amount*pct/100*100)/100` → `Math.round(amount*pct)/100` é matematicamente idêntica. Não é regressão. Registro para que não seja "corrigida" de volta.

---

## 2. Bloqueadores

### B1 — `getLog()` quebrou: auditoria sem ordenação determinística

`analista_financeiro.html:2333`

```js
function getLog(){return Object.values(DATA.log||{}).sort((a,b)=>b.id-a.id);}
```

Os IDs de log agora são chaves `push()` (strings). `'-Oabc' - '-Oabd'` retorna **`NaN`**. Um comparador que retorna `NaN` é comportamento indefinido em `Array.prototype.sort` — na prática o array fica na ordem de inserção do objeto, sem garantia.

Isso viola diretamente `PROJECT_RULES.md` → Firebase e segurança, item 4 (logs de auditoria confiáveis). A trilha de auditoria é justamente o que a Fase 1 se propôs a fortalecer.

**Correção:** ordenar por `dataServidor` (agora existe) com fallback em `data`:

```js
function getLog(){
  return Object.values(DATA.log||{})
    .sort((a,b)=>(b.dataServidor||Date.parse(b.data)||0)-(a.dataServidor||Date.parse(a.data)||0));
}
```

Atenção: logs legados não têm `dataServidor` e alguns têm `data` em formato pt-BR legado (o próprio `fDT` trata isso). O fallback precisa cobrir os dois formatos ou os registros antigos vão para o fim da lista.

### B2 — `renderOrcamentos()` quebrou: lista de orçamentos sem ordem

`analista_financeiro.html:5609`

```js
}).sort((a,b)=>b.id-a.id);
```

Mesma causa, mesmo `NaN`. Efeito operacional: a lista de orçamentos deixa de mostrar o mais recente no topo. É o fluxo de maior uso diário do módulo — impacto direto em "redução de cliques".

**Correção:** ordenar por `criadoEm` (ISO, presente em todo orçamento novo) com desempate por `data`.

Estas duas são as únicas ocorrências de `sort` dependente de ID numérico no arquivo — a varredura completa não encontrou outras.

### B3 — Bloqueio de sobrepagamento rejeita o valor que o próprio sistema pré-preenche

`salvarPagamento` compara `amount > saldo + 0.00001`. Mas `abrirModalPagamento` pré-preenche o campo com `fN(saldo)`, e `fN` arredonda para 2 casas com *half-expand*. O total do orçamento pode ter mais de 2 casas decimais, porque:

```js
const desconto = itens.reduce((s,x)=>s+(x.valorUnit||0)*(x.qty||1)*(x.descPct||0)/100,0);
const total = subtotal - desconto + hospTotal;   // sem arredondamento
```

Reprodução executada:

- item R$ 9.999,95, desconto 10% → `total = 8999.955`
- `saldo = 8999.955`, campo pré-preenchido com `8.999,96`
- `parseMoeda` → `8999.96` > `8999.955 + 1e-5` → **bloqueado**

O operador clica em "+ Pagar", não altera nada, clica em "Registrar" e recebe *"Valor acima do saldo pendente"*. Sem override (ele foi removido) e sem fluxo de crédito, o orçamento fica **impossível de quitar** pela interface.

**Correção mínima (não estrutural):** arredondar `total`, `subtotal`, `desconto` e `hospTotal` para centavos no momento de salvar o orçamento (`Math.round(x*100)/100`), e alinhar a tolerância do bloqueio com a já usada em `calcStatusFinanceiro` (`0.01`), não `1e-5`. Hoje há duas tolerâncias divergentes no mesmo domínio (`0.00001` no bloqueio, `0.01` em `calcStatusFinanceiro`) — isso por si só já é um defeito de modelagem.

---

## 3. Achados relevantes (não bloqueiam, exigem decisão)

**R1 — `excluirOrcamento` mudou de comportamento e o relatório não registrou.**
Agora mover para a lixeira é bloqueado se existir qualquer pagamento ativo. O §4 do relatório original só menciona o bloqueio da *purga*. Como o relatório é o insumo da revisão, a omissão importa. Documentar em `CHANGELOG_AI.md` e no §4.

**R2 — `purgarOrcamento` conta pagamentos soft-deletados.**
`excluirOrcamento` usa `getQuotePayments()` (filtra `deletedAt`); `purgarOrcamento` usa `Object.values(...).some(p=>p.quote_id===String(id))` (não filtra). Consequência: um pagamento excluído deixa o orçamento permanentemente impurgável. Critério inconsistente entre as duas funções — escolher um e aplicar nos dois.

**R3 — Restauração de backup agora sobrescreve `recorrentes`.**
Efeito colateral de incluir `recorrentes` em `BACKUP_NODES`: a lista passou a ser usada tanto para exportar quanto para restaurar. Ganho no backup, nova superfície destrutiva na restauração, não listada no §6 do relatório. Sugestão: separar `BACKUP_EXPORT_NODES` de `BACKUP_RESTORE_NODES` explicitamente, em vez de derivar por `filter(k=>k!=='log')`.

**R4 — `mudarStatusOrc` continua não-atômica.**
Os botões Aceitar / Recusar / Reabrir ainda fazem `fbAddLog()` seguido de `set()` separado — exatamente o padrão que a Fase 1 eliminou em todos os outros fluxos. É a última escrita composta não-atômica de orçamento. Deveria estar no lote ou explicitamente diferida no §8.

**R5 — Código morto.**
`gerarReceitaDeOrcamento` tem ~80 linhas inalcançáveis após o `return` inicial; `_gerarReceitaOrcCore` e `_savingReceita` viraram resíduo; `dataLocalMaisDias` foi criada e nunca usada. Bloquear o fluxo com `return` no topo é aceitável como medida imediata, mas deixar o corpo morto num arquivo de 6,5 mil linhas contraria "menor mudança que resolva o problema" e atrapalha a próxima leitura.

**R6 — Contrato de `jsArg` não documentado.**
`jsArg` escapa `&`, `<`, `>` e `"` mas **não** `'`. É seguro apenas dentro de atributos delimitados por aspas duplas. Todos os usos atuais respeitam isso (verificado), mas o próximo autor não tem como saber. Adicionar comentário de contrato, como já existe em `esc()`.

**R7 — `jsArg(null)` degrada silenciosamente para `''`.**
Um ID ausente vira chamada com string vazia em vez de erro visível. Contraria `PROJECT_RULES` → Qualidade, item 4 (falhas visíveis ao operador).

**R8 — `genId()` agora consome chaves `push()` para IDs efêmeros de UI.**
Linhas de item e de hospital do formulário (`orcItems`, `orcHospRows`) usam `genId()` só para identificar a linha na tela. Funciona e não escreve nada, mas mistura identidade de domínio com identidade de UI. Não urgente; anotar em `docs/architecture/`.

---

## 4. Respostas às 5 perguntas do arquiteto

**1. A conversão para `push()` cobre todos os fluxos com IDs numéricos históricos?**
Não. Cobre a serialização (`jsArg` está correto e completo — nenhum `${x.id}` cru sobrou). Falha na **ordenação**: B1 e B2. Essas são as duas únicas ocorrências no arquivo. Não há `parseInt`/`Number` aplicado a IDs. `salvarEdicao` corretamente deixou de fazer `+document.getElementById('eId').value`.

**2. Política para pagamento acima do saldo: bloquear, criar crédito ou ajustar orçamento?**
Bloquear é a escolha errada como estado final, e no estado atual é um defeito (B3). Recomendação: **permitir, mas materializar**. O excedente não é receita do orçamento — é obrigação com a paciente. Criar `quote_credits/{id}` com `patientId`, `origin_pay_id`, `amount`, `status` (`aberto`/`aplicado`/`devolvido`). O pagamento grava `amount` até o saldo e o excedente como crédito, no mesmo `update()` multi-path. Isso respeita `PROJECT_RULES` → Regras financeiras, item 2 (crédito é conceito distinto) e evita inflar a DRE. Enquanto o crédito não existir, manter o bloqueio **com tolerância de 1 centavo**, não `1e-5`.

**3. Quando nascem despesas de equipe e comissão?**
Recomendo desacoplar as duas — hoje elas compartilham o mesmo gatilho e não deveriam.

- **Equipe cirúrgica** (anestesista, instrumentadora, auxiliar): é custo do ato, não do recebimento. Deve nascer na **data cirúrgica**, por competência, independentemente de haver pagamento. Hoje o sistema não tem campo de data cirúrgica — é pré-requisito.
- **Comissão**: depende da política comercial declarada. Se a comissão é sobre valor recebido, deve nascer **proporcionalmente a cada pagamento confirmado** (`comissão_do_pagamento = pct × amount`), no mesmo commit multi-path, com `linked_pay_id`. Isso torna o estorno trivial: excluir o pagamento já leva junto tudo que tem `linked_pay_id` — mecanismo que a Fase 1 acabou de construir.

Reaproveitar `linked_pay_id` como chave de estorno é a decisão de maior alavancagem aqui. Nenhuma das duas deve continuar amarrada ao aceite do orçamento.

**4. Preservar `log` na restauração é suficiente?**
É o mínimo correto, mas não suficiente. `log` continua no mesmo backup JSON que os dados operacionais e continua gravável pelo cliente. Auditoria confiável exige: (a) regra RTDB `".write": "!data.exists()"` em `log/$id` (append-only real, hoje inexistente); (b) `dataServidor` como fonte de tempo — já foi adicionado, bom; (c) export de auditoria separado do backup operacional, porque os dois têm política de retenção e LGPD diferentes. O `filter(k=>k!=='log')` resolve o sintoma; a regra no servidor resolve a causa.

**5. Desenho para saldo e idempotência com dois operadores?**
Multi-path update **não** é transação — não há leitura consistente do saldo. Duas opções, em ordem de custo:

- *Curto prazo, sem backend:* `dbRef.child('orcamentos/'+id).transaction()` sobre um campo `valorPagoAcumulado` mantido no próprio orçamento, servindo de trava otimista. Resolve corrida de saldo; não resolve autorização.
- *Alvo real:* Cloud Function `registrarPagamento(orcId, payload, idempotencyKey)`. A chave de idempotência gerada no cliente no momento da abertura do modal — não no clique — torna o retry seguro por construção. O cliente deixa de calcular saldo; passa a exibir o retorno da função.

Independentemente da escolha, sem regras RTDB versionadas a proteção continua sendo apenas de cliente, como o §8 do relatório corretamente admite. Isso deve ser a Fase 2, antes de qualquer trabalho de modularização.

---

## 5. Aderência ao processo

| Regra | Situação |
| --- | --- |
| Relatório em `docs/reviews/` com nome padronizado | ✅ |
| Nove seções obrigatórias | ✅ |
| Relatório crítico, expondo trade-offs | ✅ — §8 e a ressalva sobre Cloud Functions são honestas |
| Não fez push/merge | ✅ — diff local, `docs/` ainda untracked |
| Não tocou módulo fora do escopo | ✅ — só `analista_financeiro.html`; os `.svg` modificados já estavam sujos antes |
| `CHANGELOG_AI.md` atualizado | ✅, com a omissão apontada em R1 |
| Valores em centavos inteiros (Regras financeiras, item 1) | ❌ diferido — e B3 é consequência direta disso |

---

## 6. Recomendação ao arquiteto

**Não prosseguir para a Fase 2 antes de:**

1. Corrigir B1 (`getLog`) e B2 (`renderOrcamentos`) — ordenar por timestamp, não por ID.
2. Corrigir B3 — arredondar totais para centavos ao salvar e unificar a tolerância em `0.01`.
3. Resolver R2 — critério único de "tem pagamento vinculado".
4. Adicionar teste de regressão para IDs string em ordenação — é o tipo de defeito que a mudança de `genId` vai continuar produzindo em cada tela nova.

**Sugerido no mesmo lote (baixo custo):** R4 (`mudarStatusOrc` atômica), R5 (remover código morto), R6 (comentário de contrato em `jsArg`).

**Diferir para decisão do titular:** entidade de crédito (pergunta 2) e política de comissão/equipe (pergunta 3). Ambas são decisões de negócio, não técnicas — o arquiteto não deve escolher por conta própria.

Após os itens 1–4, aprovo o lote para commit.
