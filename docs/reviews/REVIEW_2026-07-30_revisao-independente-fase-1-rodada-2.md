# Revisão Independente — 2ª rodada (correções do parecer da Fase 1)

**Data:** 2026-07-30
**Revisor:** revisão independente (segundo revisor)
**Documento revisado:** `docs/reviews/REVIEW_2026-07-30_correcao-parecer-fase-1.md`
**Código revisado:** `git diff` de `analista_financeiro.html` (não commitado)
**Rodada anterior:** `docs/reviews/REVIEW_2026-07-30_revisao-independente-fase-1.md`

---

## 0. Veredito

**APROVADO PARA COMMIT**, com 1 correção de 2 linhas recomendada no mesmo commit (N1) e 3 itens registrados para a Fase 2.

Os 3 bloqueadores da 1ª rodada foram corrigidos, e corrigidos pela causa — não pelo sintoma. Os 8 achados secundários também foram todos endereçados. Nenhuma regressão nova de integridade financeira foi introduzida.

---

## 1. Bloqueadores da 1ª rodada — verificação

### B1 — `getLog()` sem ordenação determinística → **RESOLVIDO**

`getLog()` agora delega a `compararLogsRecentes`, que usa `timestampLog()` (prioriza `dataServidor`, cai para `data`) com desempate por `localeCompare` do ID string. O desempate é uma escolha melhor que a que eu havia sugerido: chaves `push()` são lexicograficamente cronológicas, então o desempate carrega informação real de ordem em vez de ser arbitrário. Zero ocorrências de `b.id-a.id` restantes no arquivo.

### B2 — `renderOrcamentos()` sem ordenação → **RESOLVIDO**

`compararOrcamentosRecentes` com `criadoEm` → fallback `data` (regex `YYYY-MM-DD`, sem passar por `Date.parse`) → desempate por ID. Correto.

### B3 — bloqueio do valor pré-preenchido de pagamento → **RESOLVIDO**

`arredondarCentavos()` aplicado nas 4 fronteiras (`calcTotaisOrc`, `salvarOrcamento`, `gerarPDFOrcRapido`, `imprimirOrcamentoRapido`) e a tolerância unificada em `0.01`, coerente com `calcStatusFinanceiro`.

Reproduzi o caso original: item R$ 9.999,95 com 10% → `arredondarCentavos(999.995)` = `1000` → total = **8999.95** exato. O campo pré-preenchido passa a coincidir com o saldo. Bloqueio some.

Ponto que merece registro: o arredondamento é aplicado **por componente** (subtotal, desconto, hospTotal separadamente) antes da soma, não só no total. É a decisão certa — arredondar só o total deixaria o desconto exibido na tela divergindo do desconto usado no cálculo. Verifiquei também que `arredondarCentavos` faz half-up corretamente nos casos clássicos de float (`0.125`→`0.13`, `1.005`→`1.01`, `2.675`→`2.68`, `8999.955`→`8999.96`).

O `+Number.EPSILON` é inócuo na faixa de valores do sistema (fica abaixo do ULP para qualquer valor acima de ~R$ 4). Não prejudica; apenas não é ele que resolve os casos acima. Sem ação.

---

## 2. Achados secundários da 1ª rodada — verificação

| # | Achado | Situação |
| --- | --- | --- |
| R1 | Mudança de `excluirOrcamento` não documentada | ✅ registrada no §4 do novo relatório |
| R2 | Critério divergente entre lixeira e purga | ✅ unificado em `temPagamentosVinculadosAoOrcamento()`; ambas incluem soft-deleted |
| R3 | Restauração sobrescrevendo `recorrentes` | ✅ `BACKUP_EXPORT_NODES` e `BACKUP_RESTORE_NODES` agora são listas explícitas, não derivadas por `filter` |
| R4 | `mudarStatusOrc` não-atômica | ✅ status + log em `dbRef.update()` multi-path |
| R5 | Código morto | ✅ `gerarReceitaDeOrcamento`, `_gerarReceitaOrcCore`, `_savingReceita` e `dataLocalMaisDias` removidos |
| R6 | Contrato de `jsArg` | ✅ documentado |
| R7 | `jsArg(null)` degradando em silêncio | ⚠️ agora lança — ver N3 |

Sobre **R2**: a escolha conservadora (bloquear mesmo com pagamento soft-deleted) é defensável e está corretamente declarada como decisão no §3. Registro a consequência prática: um pagamento lançado por engano e excluído no mesmo dia deixa aquele orçamento permanentemente impurgável. Isso é aceitável enquanto não houver volume, mas vira dívida quando o titular precisar atender pedido de eliminação de dados sob LGPD (art. 18, VI). É o assunto da pergunta 1 do relatório — respondida abaixo.

---

## 3. Achados novos

### N1 — `dataParaTimestamp()` inverte dia e mês em datas pt-BR legadas (corrigir no mesmo commit)

`analista_financeiro.html`, `dataParaTimestamp()`:

```js
const iso=Date.parse(valor);
if(Number.isFinite(iso))return iso;      // ← executa antes do regex BR
const br=valor.match(/^(\d{2})\/(\d{2})\/(\d{4}).../);
```

`Date.parse` do V8 aceita `MM/DD/YYYY` pelo parser legado. Para qualquer data pt-BR com **dia ≤ 12**, `Date.parse` retorna um número válido e o regex brasileiro nunca roda — com dia e mês trocados.

Reproduzido:

| Entrada (pt-BR) | Resultado atual | Correto |
| --- | --- | --- |
| `06/07/2026 14:30` | 7 de **junho** de 2026 | 6 de **julho** de 2026 |
| `12/01/2026` | 1 de **dezembro** de 2026 | 12 de **janeiro** de 2026 |
| `30/07/2026 14:30` | 30 de julho ✅ | (dia > 12 cai no regex, funciona por acidente) |

Efeito: eventos antigos de auditoria com dia ≤ 12 aparecem fora de ordem por até 11 meses. É exatamente a classe de defeito que B1 se propôs a eliminar — a ordenação do log volta a ser não confiável, só que para o subconjunto legado.

O formato pt-BR existe de fato na base: `fDT()` mantém o ramo `// Legado: string pt-BR já formatada`.

**Correção (inverter a ordem de tentativa):**

```js
function dataParaTimestamp(valor){
  if(typeof valor==='number'&&Number.isFinite(valor))return valor;
  if(typeof valor!=='string')return 0;
  const br=valor.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if(br)return new Date(Number(br[3]),Number(br[2])-1,Number(br[1]),Number(br[4]||0),Number(br[5]||0),Number(br[6]||0)).getTime();
  const iso=Date.parse(valor);
  return Number.isFinite(iso)?iso:0;
}
```

Formato explícito e conhecido primeiro; heurística do runtime só como último recurso. Adicionar ao conjunto de testes puros o caso `'06/07/2026 14:30'` — o teste atual de "fallback pt-BR" evidentemente usou uma data com dia > 12, que passa mesmo com o defeito presente.

### N2 — `git diff --check` não está aprovado

O §7 afirma "`git diff --check`: aprovado". Não está:

```
analista_financeiro.html:6650: trailing whitespace.
```

É um `\r` isolado no fim da linha `  }` (fim do bloco `validacaoHospital` em `imprimirOrcamentoRapido`), num arquivo LF. Provavelmente colagem de bloco vinda de editor Windows. Inofensivo em execução, mas suja o diff da próxima alteração naquela região.

(As dezenas de avisos em `*.svg` são **anteriores** a este lote e não vieram desta alteração — confirmei que os SVGs já estavam modificados antes da Fase 1. Não misturar no commit.)

O que me preocupa aqui não é o `\r`: é que uma verificação declarada como executada e aprovada não reproduz. Nesta rodada as demais alegações do §7 conferiram; vale reexecutar antes de commitar.

### N3 — `jsArg` lançando pode apagar uma aba inteira sem aviso

`jsArg` agora lança para valor ausente — foi o que pedi em R7, e a intenção está certa. Mas ele é chamado dentro de template literals em `renderLancs`, `renderOrcamentos`, `renderLixeira`. Um único registro sem `id` faz o `.map()` inteiro lançar, e `renderAll` envolve cada render em:

```js
const _r = (fn, label) => { try { fn(); } catch(e){ console.warn('renderAll['+label+']:', e); } };
```

Resultado: a aba fica **em branco**, com a falha apenas no console. O operador não vê erro — vê "não tem nada aqui". Para uma lista de lançamentos ou de orçamentos, isso é pior que o comportamento silencioso anterior, e contraria `PROJECT_RULES` → Qualidade, item 4.

Não bloqueia (nenhum registro atual conhecido está sem `id`), mas a proteção precisa ser fechada. Sugestão de menor custo: `_r` mostra um toast de erro em vez de só `console.warn`. Assim toda falha de render fica visível, não só esta.

### N4 — geração de recorrências não é idempotente (Fase 2, pré-existente)

```js
dbRef.child('lancamentos/'+id).set(item).then(() => {
  ...
  dbRef.child('recorrentes/'+recId+'/ultimoPeriodoGerado').set(periodo.chave);
});
```

Duas escritas independentes: se a segunda falhar (queda de rede entre elas), o lançamento existe mas o período não fica marcado como gerado — e o próximo ciclo **cria a despesa recorrente de novo**. Duplicação silenciosa de despesa, sem clique do operador.

Não é regressão desta alteração e está fora do escopo autorizado — por isso não bloqueia. Mas é o último buraco de idempotência da mesma família que a Fase 1 fechou em orçamento e pagamento, e é o único que dispara sozinho. Deve entrar na Fase 2 com prioridade acima da modularização.

---

## 4. Respostas às 5 perguntas do relatório

**1. Bloquear lixeira/purga com pagamento soft-deleted é adequado, ou deve haver fluxo administrativo?**
Adequado como padrão, insuficiente como política final. Integridade referencial deve ser o comportamento padrão do botão; eliminação definitiva não deve ser uma operação de tela. O caminho correto é um procedimento administrativo explícito de retenção/anonimização que: (a) exija a mesma confirmação por palavra-chave; (b) **anonimize** o paciente nos nós relacionados em vez de apagar o registro financeiro; (c) preserve os eventos de auditoria, que têm obrigação legal de retenção própria e não são "dado do titular" no mesmo sentido. Enquanto isso não existir, mantenha o bloqueio.

**2. O fallback de datas legadas cobre os formatos históricos reais?**
**Não** — ver N1. Cobre `dataServidor` (número), ISO 8601 e pt-BR com dia > 12. Falha silenciosamente em pt-BR com dia ≤ 12, que é ~40% das datas possíveis. Antes de considerar a pergunta encerrada, vale rodar uma leitura só-leitura do nó `log` real contando quantos eventos não são ISO — se forem poucos e antigos, a correção de N1 basta; se forem muitos, considere uma migração única que normalize `data` para ISO e grave `dataServidor`.

**3. Tolerância de R$ 0,01 é aceitável até a migração para centavos?**
Sim, como compatibilidade, e a decisão está corretamente declarada como temporária. Duas condições: (a) a tolerância precisa ser **uma constante nomeada única** (`TOLERANCIA_CENTAVO`), não o literal `0.01` repetido em `salvarPagamento` e `calcStatusFinanceiro` — literais duplicados divergem com o tempo, que foi exatamente a origem de B3; (b) o plano de compatibilidade para saldos antigos com 3+ casas não precisa de migração de dados: `arredondarCentavos` na leitura do total legado resolve, porque nenhum orçamento antigo tem pagamento que dependa da 3ª casa. Registrar isso evita uma migração desnecessária depois.

**4. `dbRef.update()` basta para status, ou as regras RTDB devem exigir o `AuditEvent`?**
Não basta, e a distinção importa: o multi-path garante **atomicidade** (ou grava os dois, ou nenhum), não **obrigatoriedade** (nada impede um cliente futuro de gravar só o status). Hoje, com um único cliente que você controla, é suficiente. A garantia real vem de uma regra em `orcamentos/$id/status` que exija a existência do evento correspondente — mas isso pressupõe as regras RTDB versionadas, que ainda não existem no repositório. Enquanto `log/$id` não tiver `".write": "!data.exists()"`, a trilha de auditoria continua sobrescrevível pelo cliente e a pergunta 4 é secundária diante dessa.

**5. Há desenho aprovado de Cloud Function/transação para saldo e idempotência?**
Não há nada aprovado — e não deve haver antes de uma decisão de produto. A escolha depende de uma pergunta que ainda não foi respondida: o consultório opera com dois operadores simultâneos de fato, ou é um risco teórico? Se for teórico, `transaction()` sobre um `valorPagoAcumulado` no orçamento resolve a corrida a custo quase zero e sem backend. Se for real, a Cloud Function com chave de idempotência gerada na **abertura do modal** (não no clique) é o desenho certo. Recomendo responder isso antes de desenhar, porque a segunda opção custa uma ordem de grandeza a mais e traz operação de deploy que hoje não existe no projeto.

---

## 5. Aderência ao processo

| Regra | Situação |
| --- | --- |
| Relatório nomeado e estruturado conforme `PROJECT_RULES` | ✅ |
| Relatório crítico, expondo trade-offs | ✅ — o §6 assume a dívida da lixeira conservadora sem maquiar |
| Não fez push/merge | ✅ |
| Escopo respeitado | ✅ — só `analista_financeiro.html` e `docs/` |
| `CHANGELOG_AI.md` atualizado | ✅ |
| Testes declarados reproduzem | ⚠️ parcial — ver N2 e a ressalva sobre o teste de fallback pt-BR em N1 |

---

## 6. Recomendação ao arquiteto

**Pode commitar após:**

1. Corrigir **N1** (inverter ordem de tentativa em `dataParaTimestamp`) e acrescentar o caso `'06/07/2026 14:30'` aos testes puros.
2. Remover o `\r` da linha 6650 e reexecutar `git diff --check -- analista_financeiro.html`.
3. Commitar `analista_financeiro.html` e `docs/` **sem** os `*.svg`, que são alterações anteriores e não pertencem a este lote.

**Mesmo lote, se houver folga:** N3 (toast em `renderAll._r`) e a constante `TOLERANCIA_CENTAVO`.

**Fase 2, nesta ordem:** regras RTDB versionadas com `log` append-only → idempotência das recorrências (N4) → decisão de produto sobre concorrência (pergunta 5) → entidade de crédito → política de comissão/equipe. Modularização por último; ela não reduz risco financeiro e atrapalha o diff de tudo que vem antes.

Nenhuma das pendências acima justifica segurar o lote. As correções da Fase 1 melhoram a integridade do módulo de forma mensurável e devem entrar.
