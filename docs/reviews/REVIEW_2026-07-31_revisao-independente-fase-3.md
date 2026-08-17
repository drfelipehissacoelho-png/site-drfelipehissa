# Revisão Independente — Fase 3: baseline de regras RTDB

**Data:** 2026-07-31
**Revisor:** revisão independente (segundo revisor)
**Documentos revisados:** `docs/reviews/REVIEW_2026-07-31_fase-3-baseline-regras-rtdb.md`, `docs/architecture/FIREBASE_RTD_RULES_GAP.md`, `firebase.database.rules.json`

---

## 0. Veredito

**Diagnóstico tecnicamente correto. Não autorizo a proposta de regras por papel ainda** — não por discordar do desenho, mas porque falta uma verificação de 2 minutos que decide se a baseline descreve a realidade. Enquanto ela não for feita, qualquer regra proposta estará sendo derivada de um artefato de procedência não confirmada.

Confirmo o raciocínio central, que é contraintuitivo e está certo: no RTDB, permissão **concedida** em um nó raso vale para todos os descendentes, e regras mais profundas não podem revogá-la. Mas aqui `consultorio` declara **apenas `.read`** — não há `.write` no ancestral. Portanto não existe herança de escrita, e `quote_payments` e `recorrentes`, sem regra própria, são **negados**. Verifiquei o JSON: as chaves sob `consultorio` são `.read`, `config`, `hospitalPrices`, `lancamentos`, `log`, `orcamentos`, `patients`, `procedureCommissionRules`, `procedureConfig`, `procedureTeamCosts`, `procedures`. Nenhum `.write` no ancestral. A conclusão do §5 procede.

---

## 1. A contradição que precisa ser resolvida antes de qualquer proposta

Se essas regras **estão publicadas**, então pagamentos e recorrências nunca funcionaram — e isso deveria ter sido percebido na operação diária. O relatório registra a dúvida de procedência no §6, mas trata como risco genérico. Não é genérico: é a premissa da fase inteira, e é falsificável em minutos.

`salvarRecorrente()` tem tratamento de erro explícito:

```js
dbRef.child('recorrentes/'+id).set(obj)
  .then(()=>{ showToast('✓ Recorrente criada!','#27ae60'); ... })
  .catch(e=>showToast('Erro ao salvar: '+(e.message||e),'#e74c3c'));
```

Sob a baseline, toda criação de recorrência teria exibido **"Erro ao salvar: PERMISSION_DENIED"** em vermelho. Isso não passa despercebido.

Pagamentos são mais sutis, porque o código **anterior** à Fase 1 gravava sem `.catch`:

| Escrita de `salvarPagamento()` (código pré-Fase 1) | Sob a baseline |
| --- | --- |
| `quote_payments/<payId>` | **negada, em silêncio** |
| `lancamentos/<lancId>` (a receita) | permitida ✓ |
| `lancamentos/<taxaId>` (taxa de cartão) | permitida ✓ |
| `orcamentos/<id>/receitaGeradaId` e `/status` | permitidas ✓ |
| `log/<id>` | permitida ✓ |

O sintoma resultante é específico e reconhecível: **o pagamento aparece correto na tela, mas ao recarregar a página o histórico de pagamentos some e o orçamento volta a exibir o saldo integral pendente** — embora a receita continue lá na aba Lançamentos. Porque `calcValorPago()` soma `quote_payments`, que nunca persistiu.

### Três verificações, em ordem de risco crescente

1. **Sem escrever nada (faça esta primeiro):** exportar o backup JSON pela própria tela e abrir o arquivo. Se `quote_payments` e `recorrentes` estiverem vazios enquanto existirem orçamentos marcados como pagos, a baseline está publicada e o diagnóstico está confirmado.
2. **Leitura apenas:** no Console do Firebase → Realtime Database, olhar se os nós `quote_payments` e `recorrentes` existem e têm conteúdo.
3. **Autoritativa, sem deploy:** Console → Realtime Database → Regras → **Rules Playground**. Simular uma escrita em `consultorio/quote_payments/teste` autenticado com o e-mail da secretária. O simulador roda contra as regras **publicadas**, não contra o arquivo local, e responde allow/deny. É o único teste que confirma a procedência do `firebase.database.rules.json` sem alterar nada.

**Os dois desfechos levam a planos diferentes:**

- **Confirmado** → isto não é uma decisão de arquitetura, é uma **indisponibilidade em produção**. Muda a prioridade e a ordem de tudo (ver §3).
- **Não confirmado** → a cópia é de outra versão ou de outro projeto Firebase. Nesse caso, propor regras por papel a partir dela é o pior resultado possível: você publicaria um conjunto derivado de um artefato errado, sobre regras reais que ninguém leu.

---

## 2. Achados não registrados no relatório

### V1 — A restauração de backup também está quebrada pela mesma lacuna

`BACKUP_RESTORE_NODES` inclui `quote_payments` e `recorrentes`, e `importarJSON()` grava tudo num único `dbRef.update(nodes)` (linha 3624). Como o update é atômico, **a presença de um único caminho negado reprova a restauração inteira** — inclusive `lancamentos`, `orcamentos` e `patients`, que teriam permissão.

Consequência: se a baseline estiver publicada, **não existe caminho de recuperação de desastre funcionando hoje**. O backup exporta corretamente, mas nunca poderia ser restaurado. Isso não está no §5 nem no §8 e, na minha leitura, é mais grave que a própria falha de pagamento — uma falha de pagamento é percebida no mesmo dia; um backup irrestaurável só é descoberto no dia em que ele é necessário.

### V2 — As Fases 1 e 2 transformaram corrupção silenciosa em indisponibilidade visível

Isto é consequência direta e correta do trabalho anterior, mas precisa ser dito explicitamente porque muda o sequenciamento de deploy.

- **Antes da Fase 1:** escritas independentes → `quote_payments` negado em silêncio, receita gravada assim mesmo → **livro contábil inconsistente sem nenhum aviso**.
- **Depois da Fase 1:** `update()` multi-path único com `.catch` → **nada é gravado e o operador vê "Erro ao salvar pagamento: PERMISSION_DENIED"**.

A atomicidade fez exatamente o que deveria: parou de produzir estado parcial. Mas o efeito prático é que **publicar as Fases 1 e 2 em produção antes de corrigir as regras retira da secretária a capacidade de registrar qualquer pagamento**, em vez de registrá-lo pela metade.

Confirmei que `5ef65b8` já está em `origin/feat/auditoria-analista-financeiro`. Como é branch de feature e não `main`, presumo que não esteja servindo produção — mas essa presunção precisa ser verificada antes de qualquer merge. **Regras primeiro, merge depois.**

### V3 — Provável passivo de dados históricos

Se o item 1 do §1 se confirmar, existem hoje orçamentos com `receitaGeradaId` preenchido e lançamento de receita persistido, **sem o `quote_payments` correspondente**. Para esses registros, `calcValorPago()` retorna 0 e o orçamento aparece como não pago, enquanto a receita já conta no DRE e nos relatórios.

Ou seja: o faturamento pode estar correto e o contas-a-receber inflado, simultaneamente. Nenhuma das três fases tocou nisso, e uma reconciliação desses casos precisa ser escopo próprio — não pode ser um efeito colateral da correção de regras, porque no instante em que `quote_payments` voltar a aceitar escrita os dois números continuarão divergindo para o histórico.

Sugiro quantificar antes de decidir: contar quantos orçamentos têm `receitaGeradaId` e nenhum `quote_payments` vinculado. É uma consulta de leitura sobre o backup já exportado.

### V4 — As regras de escrita não são escopadas por `$id`

`lancamentos`, `orcamentos` e `patients` declaram `.write` **no nó da coleção**, não em `$id`. Isso autoriza literalmente `dbRef.child('lancamentos').set(null)` — apagar toda a base de lançamentos numa escrita, por qualquer um dos dois usuários autenticados.

A regra de `log` mostra que o padrão correto já é conhecido pelo autor da baseline: `"log": { "$logId": { ".write": "... && !data.exists()" } }`. As demais coleções deveriam seguir a mesma forma. Deve entrar na proposta por papel — e é, provavelmente, o ganho de segurança mais barato de todo o conjunto.

### V5 — `log` é append-only de verdade, mas a autoria é forjável

Crédito onde é devido: `!data.exists()` bloqueia sobrescrita **e** remoção, porque apagar no RTDB é escrever `null` sobre um nó existente, e `data.exists()` é verdadeiro nesse momento. A propriedade append-only está correta.

O que falta é `.validate`. Qualquer cliente autenticado pode gravar um evento declarando `usuario` e `email` de outra pessoa. Como `PROJECT_RULES` → Firebase, item 2 já diz que não se deve confiar em identidade fornecida pelo navegador, o fecho mínimo é barato:

```json
"log": {
  "$logId": {
    ".write": "auth != null && !data.exists()",
    ".validate": "newData.hasChildren(['acao','email','dataServidor']) && newData.child('email').val() === auth.token.email"
  }
}
```

Isso amarra o evento ao autenticado que o gravou, sem depender de backend.

### V6 — Autorização por e-mail, não por `uid`

`auth.token.email` funciona, mas é o identificador menos estável do Firebase Auth: muda com troca de endereço e depende do provedor. `auth.uid` é imutável. Como a proposta por papel vai reescrever essas condições de qualquer forma, é o momento certo de migrar para `uid` — idealmente lendo os papéis de um nó `roles/$uid` em vez de embutir endereços literais em cada linha, que hoje se repetem 11 vezes e precisam ser alterados em conjunto.

---

## 3. Respostas às 5 perguntas

**1. Que campos de `orcamentos` a secretária deve poder alterar como efeito de um pagamento?**
Apenas `status` e `receitaGeradaId` — e só esses. É o que `salvarPagamento()` de fato escreve, e o princípio deve ser: a permissão descreve o que o comando precisa, nunca mais. Regra por campo, no formato `orcamentos/$orcId/status`. Nada de `.write` no nó do orçamento para ela, senão a segregação de funções vira nominal — quem pode reescrever o orçamento pode alterar o total depois do pagamento.

**2. A secretária precisa de `patients` e `lancamentos`?**
`patients`: sim, escrita necessária — ela cadastra a paciente antes do orçamento, e bloquear isso cria um gargalo no médico para uma tarefa administrativa. `lancamentos`: sim, mas **não pelo motivo aparente**. Ela não precisa criar lançamentos manuais; precisa porque o `update()` atômico de pagamento grava a receita e a taxa de cartão em `lancamentos`. Se a permissão for retirada, o pagamento volta a ser negado por inteiro. Vale escopar por `$lancId` com `.validate` exigindo `linked_pay_id` presente — assim ela grava lançamentos **vinculados a um pagamento**, e não lançamentos livres. Isso responde à intenção da pergunta sem quebrar o comando.

**3. Custos internos e logs devem permanecer visíveis à secretária?**
Não, e este é o achado de LGPD mais relevante da rodada. `procedureTeamCosts`, `procedureCommissionRules` e `hospitalPrices` são a estrutura de margem do consultório; `log` é a trilha de auditoria sobre a própria secretária. Nenhum dos três é necessário para registrar um pagamento.

Mas atenção a uma armadilha de implementação: **hoje a aplicação carrega a raiz `consultorio` de uma vez**. Descer o `.read` para os nós individuais faz a leitura da raiz ser negada e **quebra o carregamento inteiro** — não só as áreas restritas. Isso precisa vir acompanhado de mudança no cliente, para escutar nó a nó em vez da raiz. É trabalho de código, não só de regra, e não deve ser subestimado no planejamento. O §8 chega perto disso, mas não diz que a leitura da raiz falha por completo.

**4. Corrigir `quote_payments`/`recorrentes` primeiro, ou migrar pagamento para backend antes?**
Nenhuma das duas, como está formulado — a pergunta pressupõe que isto é uma escolha de arquitetura. Se a verificação do §1 confirmar, é uma **indisponibilidade**, e a ordem passa a ser ditada por isso:

1. restaurar a capacidade de gravar (`quote_payments` e `recorrentes`), com regra mínima e revisável;
2. segregar por papel, junto com o escopo por `$id` do V4 e o `.validate` do V5;
3. só então avaliar backend — e o §3 do próprio relatório já argumenta bem que, com uma única registradora, ele é desproporcional.

Migrar para backend antes de restaurar a permissão deixaria o consultório semanas sem registrar pagamento. E não existe homologação neste projeto: criar um segundo projeto Firebase só para testar regras é possível, mas é infraestrutura nova — se for esse o caminho, precisa ser decisão consciente, não pressuposto.

**5. Procedimento para comparar o arquivo com as regras publicadas?**
Diff textual não resolve, porque não há como exportar as regras publicadas de forma confiável sem CLI. O procedimento que recomendo é comportamental, com o **Rules Playground** do Console: simular, contra as regras publicadas, um conjunto fixo de escritas — `quote_payments/$id`, `recorrentes/$id`, `lancamentos/$id`, `orcamentos/$id/status`, `log/$id` sobre nó existente e sobre nó novo — com cada um dos dois e-mails. O resultado é uma tabela allow/deny que pode ser versionada ao lado do JSON como evidência datada. Se essa tabela bater com o que o arquivo prediz, a baseline está confirmada. Nenhuma escrita real, nenhum deploy.

---

## 4. Aderência ao processo

| Regra | Situação |
| --- | --- |
| Relatório nomeado e estruturado | ✅ |
| Não publicou regra remota, commit ou push | ✅ |
| Separou fato confirmado de hipótese | ✅ — o §3 é explícito sobre a procedência da cópia |
| Não propôs regra permissiva para "destravar" | ✅ — resistir a isso foi a decisão certa |
| Registrou realidade operacional antes de propor solução | ✅ — descartar Cloud Function por concorrência inexistente é a conclusão certa |
| Rastreou as consequências dos nós negados | ⚠️ parcial — restauração de backup (V1) e passivo histórico (V3) não foram mapeados |

---

## 5. Recomendação

**Antes de propor qualquer regra:** executar a verificação 1 do §1 (exportar o backup e inspecionar `quote_payments` e `recorrentes`) e, se possível, a 3 (Rules Playground). Sem isso, a proposta por papel é derivada de um artefato não confirmado.

**Se confirmado**, tratar como indisponibilidade e seguir a ordem da resposta 4. Incluir na proposta o escopo por `$id` (V4) e o `.validate` de autoria em `log` (V5), que são baratos e não dependem de decisão de negócio. Abrir escopo separado para o passivo do V3.

**Se não confirmado**, descartar a baseline como referência, obter as regras reais pelo Console e refazer o §5 sobre elas. Nesse caso o `firebase.database.rules.json` deve ser renomeado ou marcado no cabeçalho como não verificado, para não ser confundido com fonte de verdade por um leitor futuro.

**Em qualquer cenário:** não fazer merge das Fases 1 e 2 para a branch que serve produção antes de resolver as regras (V2). Uma falha de pagamento visível é melhor que uma silenciosa, mas nenhuma das duas deve chegar à operação de propósito.

Registro, por fim, que a decisão de versionar a baseline sem deploy e sem CLI foi acertada, e que `FIREBASE_RTD_RULES_GAP.md` continua sendo o documento mais bem construído do conjunto.
