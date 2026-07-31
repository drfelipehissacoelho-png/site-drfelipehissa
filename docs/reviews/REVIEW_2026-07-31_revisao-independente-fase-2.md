# Revisão Independente — Fase 2: integridade de recorrências

**Data:** 2026-07-31
**Revisor:** revisão independente (segundo revisor)
**Documentos revisados:** `docs/reviews/REVIEW_2026-07-31_fase-2-integridade-recorrencias.md`, `docs/architecture/FIREBASE_RTD_RULES_GAP.md`
**Código revisado:** `analista_financeiro.html` (working tree, não commitado)

---

## 0. Veredito

**APROVADO**, com 1 correção de robustez recomendada no mesmo lote (H1) e 1 decisão arquitetural que vale reverter agora, enquanto é barata (H2).

O núcleo da Fase 2 está correto. A chave determinística resolve a duplicação de despesa recorrente pela causa — não por detecção posterior — e o `update()` multi-path fecha a janela entre lançamento e marcador. Verifiquei que duas abas concorrentes convergem para o mesmo nó `lancamentos/recorrente_<id>_<periodo>`: a segunda escrita sobrescreve a primeira em vez de criar uma despesa nova. É a propriedade que N4 pedia.

Diferente das rodadas anteriores, **as alegações do §7 reproduzem**: sintaxe do script inline aprovada e `git diff --check -- analista_financeiro.html` limpo.

---

## 1. Verificação do que foi entregue

| Alegação | Status |
| --- | --- |
| Chave determinística `recorrente_<recId>_<periodo>` | ✅ `chaveLancamentoRecorrente()` |
| Lançamento + `ultimoPeriodoGerado` + log em um único `update()` | ✅ `_gerarLancRecorrente()` |
| Validação de caracteres proibidos em chave RTDB | ✅ `chaveRecorrenciaValida()` — conjunto `. # $ [ ] /` correto |
| Soft-delete impede recriação | ✅ o `&& !l.deletedAt` que existia em `HEAD` foi **removido** de `_lancRecorrenteExiste`, que é exatamente a correção |
| Processador aguarda confirmação e bloqueia reentrada | ✅ `await` por período + `_processandoRecorrentes` com `try/finally` |
| `TOLERANCIA_CENTAVO` centralizada | ✅ 3 usos, nenhum literal `0.01` financeiro restante |
| `arredondarCentavos(1250.995)` = `1251` | ✅ reproduzido |
| Toast por área com supressão e recuperação | ⚠️ funciona, mas ver H3 |

Dois pontos merecem crédito explícito porque não estavam no meu parecer anterior e são melhores do que o que eu havia sugerido:

- **Semântica de retry parcial correta.** Se o período P1 grava e o P2 falha, `ultimoPeriodoGerado` fica em P1 e a próxima execução retoma de P2. Os períodos são produzidos em ordem cronológica nas três frequências, então o marcador nunca "pula" um período pendente.
- **Arredondamento por componente.** `subtotal` e `desconto` são arredondados antes da subtração. Isso não só corrige a exibição — faz `subtotal - desconto` cancelar **exatamente** em desconto de 100%. Testei 200.000 valores de R$ 0,01 a R$ 2.000,00 com desconto integral: nenhum resíduo de ponto flutuante. Um arredondamento aplicado só no total não teria essa propriedade.

---

## 2. Achados

### H1 — `arredondarCentavos()` retorna `NaN` para entrada em notação exponencial (corrigir neste lote)

```js
return Number(Math.round(Number(`${numero}e2`))+'e-2');
```

A técnica de deslocamento decimal depende de `${numero}` produzir notação posicional. O JavaScript passa a usar notação exponencial para `|x| < 1e-6` e `|x| >= 1e21`. Nesses casos a interpolação gera `"1e-7e2"`, que não é número:

| Entrada | Resultado |
| --- | --- |
| `1250.995` | `1251` ✅ |
| `0.125` / `1.005` / `2.675` | `0.13` / `1.01` / `2.68` ✅ |
| `1e-7` | **`NaN`** |
| `5e-7` | **`NaN`** |
| `1e21` | **`NaN`** |
| `-1250.995` | `-1250.99` (ver H5) |

O guard `Number.isFinite(numero)` valida a **entrada**, não a saída. Um `NaN` que chegue a `dbRef.update()` faz o Firebase lançar (`contains undefined or NaN`) e derruba a operação inteira.

**Alcançabilidade: nenhuma hoje.** Auditei os 23 pontos de chamada. Todo argumento é (a) valor digitado pelo operador, (b) `reduce` de somas não-negativas — que só chega a zero se todas as parcelas forem zero, e aí é zero exato, ou (c) diferença entre valores **já arredondados**, que nunca cai no intervalo `(0, 1e-6)`. Confirmei por varredura.

Ainda assim recomendo corrigir agora, por dois motivos: a implementação anterior retornava `0` para as mesmas entradas — então isto é regressão de robustez, não defeito herdado; e é a primitiva financeira mais reutilizada do arquivo, a um único `arredondarCentavos(a-b)` com argumento cru de virar alcançável.

```js
function arredondarCentavos(valor){
  const numero=Number(valor);
  if(!Number.isFinite(numero))return 0;
  const deslocado=Math.round(Number(`${numero}e2`));
  if(!Number.isFinite(deslocado))return Math.round(numero*100)/100;  // fora da faixa posicional
  return Number(`${deslocado}e-2`);
}
```

Acrescentar `1e-7` e `1e21` aos testes de centavos.

### H2 — Chave determinística de auditoria conflita com a regra append-only planejada

Esta é a resposta à pergunta 1 do relatório, e é o único ponto em que discordo de uma decisão do §3.

`chaveEventoRecorrente()` fixa `log/recorrencia_<recId>_<periodo>`. A justificativa — reduzir logs duplicados em retry — é razoável isolada, mas colide com o objetivo declarado em `FIREBASE_RTD_RULES_GAP.md`: `log` append-only, sem sobrescrita.

Sob `".write": "!data.exists()"` em `log/$id`, uma segunda tentativa no mesmo período é **rejeitada pela regra**. Como a escrita é multi-path e atômica, a rejeição derruba junto o lançamento e o `ultimoPeriodoGerado`. O caminho de retry deixa de funcionar exatamente sob a regra que se quer implantar.

A janela é estreita hoje (se a 1ª tentativa gravou, `_lancRecorrenteExiste` já pula; se falhou inteira, nada existe e o retry passa). Mas ela existe em confirmação parcial e em qualquer cenário de reconexão, e o custo de mudar depois é reescrever o desenho de auditoria junto com a implantação das regras — o pior momento possível.

**Recomendação: separar idempotência de auditoria.** A idempotência pertence ao nó de domínio, onde já está e funciona (`lancamentos/recorrente_<id>_<periodo>`). O log deve voltar a `push()`. Dois eventos para duas tentativas não é duplicidade — é o registro correto de que houve duas tentativas, que é precisamente o que uma trilha de auditoria deve preservar. Um log que se sobrescreve a si mesmo em retry está apagando evidência para economizar uma linha.

### H3 — O caminho de recuperação de `renderAll` pode causar uma falha maior que a original

Duas questões no novo `_r`:

**(a) `showToast` dentro do `catch` não está protegido.** `showToast` faz `document.getElementById('toast').textContent = msg` sem guarda de nulo. Se o elemento não existir naquele instante — carga inicial, aba ainda não montada — ele lança de dentro do `catch`, a exceção escapa de `_r`, e **todas as áreas seguintes deixam de renderizar**. O mecanismo criado para tornar a falha visível vira a causa de uma tela em branco. Envolver a notificação no seu próprio `try/catch`.

**(b) `#toast` é um elemento único e compartilhado.** São 21 áreas registradas. Um payload malformado do Firebase faz todas falharem no mesmo `renderAll`, e as 21 chamadas sobrescrevem `textContent` do mesmo nó em microssegundos. O operador vê **uma** mensagem, nomeando uma área arbitrária — a última da lista — e as outras 20 desaparecem sem rastro.

O §7 afirma que "falha contínua não inunda a tela". É verdade, mas por um motivo diferente do testado: os 3 testes cobrem chamadas **sucessivas** de `renderAll`; nenhum cobre N falhas **simultâneas** dentro de uma passada. Sugestão: acumular os rótulos em falha durante a passada e emitir um único toast ao final (`"Erro ao atualizar 4 áreas (Lançamentos, DRE, …)."`).

### H4 — Trocar a frequência de uma recorrência existente pode travar a geração por um ciclo

`_periodosFaltando` compara `chave <= ultimo` por string, mas as três frequências usam formatos incompatíveis: `2026-07` (mensal), `2026-07-Q1` (quinzenal), `2026` (anual). Se uma recorrência mensal com `ultimoPeriodoGerado = '2026-07'` for alterada para anual, a chave `'2026'` é lexicograficamente menor e o período é descartado — o lançamento daquele ano nunca é gerado.

Sem risco de duplicação (a checagem de existência cobre), e o efeito se resolve no ciclo seguinte. Correção barata: limpar `ultimoPeriodoGerado` ao salvar uma recorrência cuja `frequencia` mudou.

### H5 — `arredondarCentavos()` é assimétrico em negativos

`Math.round(-125099.5)` = `-125099` (arredonda para `+∞`), então `-1250.995` → `-1250.99` enquanto `+1250.995` → `+1251.00`. Irrelevante hoje, porque o domínio é não-negativo. Deixa de ser quando entrarem estorno e crédito — a mesma primitiva passaria a arredondar sistematicamente a favor de um lado. Registrar em `docs/architecture/` junto da decisão de centavos inteiros.

### H6 — `chaveRecorrenciaValida()` não cobre caracteres de controle nem limite de tamanho

Além de `. # $ [ ] /`, o RTDB rejeita ASCII 0–31 e 127 e limita a chave a 768 bytes. Nenhum dos dois é alcançável (`recId` é chave `push()` ou id numérico legado; o período é gerado por template). Uma linha a mais fecha o contrato: `/[\x00-\x1F\x7F]/.test(chave) === false && chave.length <= 768`.

---

## 3. Sobre `FIREBASE_RTD_RULES_GAP.md`

O documento faz a coisa certa e faz bem: registra a ausência como **fato verificado**, não presume o que existe no ambiente remoto, e não se apresenta como regra implantável. A lista de cobertura mínima está correta e ordenada por risco.

Duas adições que aumentariam o valor dele:

1. **Declarar o que a ausência de regras significa hoje, em termos concretos.** Sem `log` append-only, qualquer cliente autenticado pode sobrescrever ou apagar eventos de auditoria — o que torna a trilha inadmissível como evidência. Isso é mais acionável que "não impedem outro cliente autenticado de escrever dados".
2. **Nomear o que já depende da regra que não existe.** Hoje: a atomicidade de pagamento (garante tudo-ou-nada, não obrigatoriedade), o bloqueio de sobrepagamento e a proteção da lixeira. Todos são de tela. Um leitor futuro precisa saber quais garantias do código evaporam se as regras estiverem permissivas.

---

## 4. Respostas às 5 perguntas

**1. Chave determinística para o evento de auditoria é adequada considerando `log` append-only?**
Não — ver H2. Idempotência no nó de domínio, `push()` na auditoria. Registro de duas tentativas é informação, não ruído.

**2. Criar rotina de reconciliação para preencher `ultimoPeriodoGerado` em recorrências legadas?**
Não vale o risco. `_lancRecorrenteExiste` já varre `DATA.lancamentos` por `recorrente_id` + `recorrente_periodo` e cobre exatamente esse caso — a recorrência legada não duplica, apenas revalida até um período novo atualizar o marcador. O custo é uma varredura em memória de uma janela de 3 meses. Uma rotina de backfill traria risco de escrita em dados históricos para eliminar um custo que não é observável. Se incomodar, a alternativa segura é preencher `ultimoPeriodoGerado` **como efeito colateral da próxima geração bem-sucedida** — que é o que o código já faz.

**3. O consultório tem uso simultâneo real por mais de um operador?**
Só você pode responder, e a resposta define a Fase 3 inteira. O que posso oferecer é o critério: se secretaria e médico registram pagamento na mesma janela de minutos, é concorrência real e a Cloud Function se paga. Se o acesso é sequencial e um operador por vez, `transaction()` sobre um `valorPagoAcumulado` no orçamento resolve a corrida a custo quase zero, sem deploy e sem backend novo. Recomendo responder antes de desenhar — a diferença entre as duas é uma ordem de grandeza de esforço e uma operação de deploy que o projeto hoje não tem.

**4. Procedimento autorizado para obter e versionar as regras RTDB efetivamente implantadas?**
O caminho somente-leitura é o console do Firebase → Realtime Database → Regras, que exibe o JSON publicado; ele pode ser copiado para `firebase.database.rules.json` no repositório sem tocar no ambiente. Isso estabelece a linha de base auditável, que é o que falta. **Não** instale ou autentique o Firebase CLI para essa etapa: `firebase deploy` erra por um dedo e não há ambiente de homologação para absorver o erro. Versionar primeiro, revisar em diff, e só então discutir implantação — com backup do JSON de regras atual guardado fora do repositório.

**5. Traduzir os rótulos técnicos de falha para nomes de tela antes de ampliar o padrão?**
Sim, e antes de ampliar. "Erro ao atualizar `rChDRE`" não é acionável para quem opera. Mas resolva H3(b) primeiro: um mapa de rótulos amigáveis sobre um mecanismo que mostra apenas uma área arbitrária das 21 melhora a redação de uma mensagem que continua omitindo as outras 20.

---

## 5. Aderência ao processo

| Regra | Situação |
| --- | --- |
| Relatório nomeado e estruturado | ✅ |
| Relatório crítico e verificável | ✅ — o §6 assume as limitações sem maquiar |
| Alegações de teste reproduzem | ✅ — sintaxe e `diff --check` conferidos; §7 exato desta vez |
| Não fez push/merge | ✅ |
| Escopo respeitado | ✅ |
| `CHANGELOG_AI.md` e `architecture/` atualizados | ✅ |
| Decisão arquitetural documentada | ✅ — e o `FIREBASE_RTD_RULES_GAP.md` é o melhor documento do conjunto até agora |

---

## 6. Recomendação

**Aplicar neste lote:** H1 (guarda de saída em `arredondarCentavos` + 2 casos de teste) e H2 (auditoria recorrente volta a `push()`).

**Recomendado, mesmo lote se houver folga:** H3(a) — proteger o `showToast` dentro do `catch`. É três linhas e elimina um modo de falha em que o mecanismo de aviso derruba a renderização.

**Próximo lote:** H3(b) agregação de falhas + rótulos funcionais, H4, H6.

**Fase 3, nesta ordem:** obter e versionar as regras RTDB publicadas (pergunta 4) → decisão sobre concorrência real (pergunta 3) → transação ou Cloud Function de pagamento → entidade de crédito → política de comissão/equipe.

Nenhum achado desta rodada compromete integridade financeira no fluxo em produção. H1 não é alcançável hoje e H2 só se manifesta sob uma regra que ainda não existe — mas ambos ficam mais caros depois do que agora.
