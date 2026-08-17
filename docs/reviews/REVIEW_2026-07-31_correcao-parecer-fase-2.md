# Revisao tecnica - correcao do parecer independente da Fase 2

**Data:** 2026-07-31
**Escopo:** correcoes autorizadas a partir de `REVIEW_2026-07-31_revisao-independente-fase-2.md`
**Estado:** alteracoes locais concluidas; nenhuma regra Firebase remota, commit ou push executado.

## 1. Objetivo da alteracao

Incorporar os achados H1 a H6 do parecer independente sobre recorrencias e renderizacao, sem ampliar o escopo para backend: evitar `NaN` em arredondamento, separar idempotencia financeira de auditoria, tornar avisos de renderizacao resilientes, resetar marcador em troca de frequencia e fechar o contrato de chaves RTDB.

## 2. Arquivos modificados

- `analista_financeiro.html`
- `docs/CHANGELOG_AI.md`
- `docs/architecture/README.md`
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`
- `docs/reviews/REVIEW_2026-07-31_fase-2-integridade-recorrencias.md`
- `docs/reviews/REVIEW_2026-07-31_correcao-parecer-fase-2.md`

O parecer independente original em `docs/reviews/REVIEW_2026-07-31_revisao-independente-fase-2.md` foi preservado sem alteracao.

## 3. Decisoes arquiteturais

- `chaveLancamentoRecorrente()` continua deterministica: o mesmo par `recorrente_id`/periodo grava no mesmo no financeiro e reduz duplicacao de despesa.
- `_gerarLancRecorrente()` volta a criar a auditoria com `criarEventoLog()`, portanto cada evento recebe chave `push()` e e compativel com futura regra append-only em `log`.
- `renderAll()` acumula falhas novas em uma passada e mostra um unico aviso com nomes operacionais. O proprio `showToast()` esta isolado para nao derrubar a atualizacao da tela se o elemento de aviso estiver indisponivel.
- `salvarRecorrente()` limpa `ultimoPeriodoGerado` somente quando `frequencia` muda; configuracoes sem troca preservam o marcador.
- `chaveRecorrenciaValida()` valida caracteres proibidos, controles ASCII e limite de 768 bytes com `TextEncoder`.
- Valores seguem em `Number`; a assimetria para meios centavos negativos foi documentada, nao corrigida de forma parcial.

Uma alternativa potencialmente melhor continua sendo centavos inteiros no dominio financeiro e geracao de recorrencias por processo de servidor. Ela exige migracao, regras RTDB e decisao de operacao; nao foi simulada como se ja existisse.

## 4. Fluxo do usuario antes e depois

| Fluxo | Antes desta correcao | Depois |
| --- | --- | --- |
| Retry de recorrencia com futura regra append-only | O log deterministico poderia colidir com a regra e rejeitar todo o `update()` multi-path. | O lancamento permanece idempotente; o log recebe uma nova chave `push()` por tentativa aceita. |
| Varios erros na mesma atualizacao de tela | Avisos sucessivos competiam pelo mesmo toast; a ultima area mascarava as demais. | Um aviso unico lista as areas novas que falharam. |
| Elemento de toast indisponivel | A falha do aviso podia escapar do `catch` e interromper a renderizacao restante. | A falha do aviso e registrada no console sem interromper as areas. |
| Recorrencia com frequencia alterada | O marcador antigo podia ser comparado em formato incompativel e atrasar um ciclo. | O marcador e reiniciado no salvamento; a verificacao de existencia evita duplicacao. |

## 5. Beneficios

- Mantem a propriedade financeira idempotente sem sacrificar uma trilha de auditoria append-only futura.
- Reduz a chance de falha secundaria de interface durante indisponibilidade parcial do DOM.
- Entrega aviso acionavel para a operacao, sem repeticao a cada renderizacao continua.
- Evita bloqueio por comparacao lexicografica entre formatos de periodo distintos.
- Formaliza limites de entrada de chave e deixa explicitas as garantias que ainda nao existem no Firebase remoto.

## 6. Possiveis riscos

- `push()` no log nao torna auditoria imutavel sozinho: a propriedade depende de regras RTDB ainda ausentes do repositorio.
- Duas tentativas aceitas podem gerar dois eventos de auditoria; isto e intencional como evidencia de tentativas, mas exige uma interface futura que apresente o historico com clareza.
- O fallback de arredondamento para numeros fora da faixa posicional apenas evita `NaN`; valores gigantes permanecem limitados pela precisao de `Number` e nao pertencem ao dominio normal de moeda.
- `TextEncoder` e esperado em navegadores modernos. Nao houve matriz de compatibilidade de navegadores legados.
- A alteracao de frequencia reinicia apenas o marcador; nao cria uma rotina de reconciliacao historica nem altera lancamentos existentes.

## 7. Casos de teste executados

- Compilacao do unico script inline com `new Function()`.
- `arredondarCentavos()`: R$ 0,125, R$ 1,005, R$ 2,675 e R$ 1.250,995; `1e-7` e `1e21` permanecem finitos, sem `NaN`.
- `chaveRecorrenciaValida()`: chave valida, caractere `/`, controles ASCII 0 e 127, 768 e 769 bytes ASCII, e 800 bytes Unicode.
- `_gerarLancRecorrente()` com RTDB simulado: um `update()` contem lancamento deterministico, marcador de periodo e log com chave `push()`; nao ha caminho `log/recorrencia_*`.
- `salvarRecorrente()` com frequencia mensal alterada para anual: `ultimoPeriodoGerado` persistido como `null`.
- `renderAll()`: duas falhas simultaneas geram um aviso agregado; falha continua e suprimida; recuperacao permite novo aviso; excecao de `showToast()` nao escapa de `renderAll()`.
- `git diff --check` nos arquivos alterados.

Nao houve teste contra Firebase real, duas abas reais, modo offline ou regras remotas.

## 8. Limitacoes conhecidas

- Nao existe configuracao de regras RTDB neste repositorio e nenhuma regra publicada foi lida ou modificada.
- Pagamentos concorrentes, recebiveis, credito, estorno formal e comissao/equipe continuam fora deste lote.
- A politica de arredondamento para valores negativos ainda precisa ser decidida antes de introduzir estornos ou creditos.
- O modulo continua monolitico em `analista_financeiro.html`; nao houve modularizacao.

## 9. Perguntas especificas para revisao

1. A politica futura deve migrar todos os valores para centavos inteiros antes de implementar credito e estorno, ou aprovar uma regra de arredondamento assinado transitoria?
2. Quando as regras RTDB forem obtidas, `log` deve aceitar somente criacao (`!data.exists()`) para todos os clientes ou a auditoria deve ser escrita exclusivamente por backend?
3. O reinicio de `ultimoPeriodoGerado` ao trocar frequencia e suficiente para a operacao atual, ou a tela precisa informar claramente que o proximo processamento revisara a janela recente?
4. A interface de auditoria deve distinguir explicitamente tentativa, sucesso e falha de uma recorrencia quando existir processamento por servidor?
5. Ha requisito de suporte a navegadores sem `TextEncoder`? Se houver, a validacao de tamanho precisa de fallback testado antes de distribuir a mudanca.