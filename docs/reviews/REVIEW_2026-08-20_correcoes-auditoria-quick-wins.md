# Revisão para auditoria independente — correções dos quick wins

**Data:** 2026-08-20  
**Escopo:** correção dos achados P0/P1/P2 da auditoria estática de 2026-08-19/20 no Analista Financeiro.  
**Não executado:** commit, push, deploy, Firebase real ou alteração de Firebase Rules.

## 1. Objetivo da alteração

Corrigir a decomposição incorreta de custo hospitalar no comparativo de propostas, reduzir riscos de estado e escaping nos chips hospitalares, impedir comparações entre pacientes distintos ou itens na lixeira, preservar taxa histórica de cartão 11x/12x e eliminar divergência entre listas de meios de pagamento.

## 2. Arquivos modificados

- analista_financeiro.html
- docs/CHANGELOG_AI.md
- docs/reviews/REVIEW_2026-08-20_correcoes-auditoria-quick-wins.md

## 3. Decisões arquiteturais

- _totalHospitalarOrcamento() trata hospRows como formato canônico e aceita hospitais, hospTotal e hospVal apenas como compatibilidade de leitura. Não houve migração ou escrita de dados existentes.
- _orcamentosAtivosDoComparativo() centraliza a remoção de IDs inexistentes ou marcados com deletedAt. A seleção continua local à tela; nenhum novo caminho RTDB foi criado.
- O comparativo exige igualdade do nome da paciente porque o orçamento atual ainda não persiste patient_id. Essa é uma barreira operacional, não substitui a futura modelagem por ID.
- getTaxaPct() devolve null para crédito acima de 10 parcelas. salvarEdicao() interpreta null como “preservar taxa histórica”; não cria uma taxa 10x substituta.
- Os selects de meios de pagamento e splits passam a consumir PAG_MEIOS; o preenchimento acontece após autenticação, quando o DOM do app está disponível.
- A edição de paciente usa anexarLogAtualizacao() e um único dbRef.update() para gravar registro e evento de auditoria juntos.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois |
|---|---|---|
| Comparar propostas com hospital | Total geral incluía hospital, mas a linha de hospital era R$ 0,00. | Tela e PDF usam hospRows e mostram o mesmo custo incorporado no total. |
| Excluir orçamento selecionado | Item da lixeira podia permanecer na barra e no PDF comparativo. | Seleção é removida após exclusão e também saneada em cada abertura/geração. |
| Comparar pacientes diferentes | PDF único podia combinar duas pacientes. | Operação é bloqueada com aviso. |
| Remover/trocar procedimento | Linha hospitalar incompatível permanecia e bloqueava salvamento. | Linhas vinculadas ao procedimento removido saem do estado temporário e chips são renderizados novamente. |
| Cartão histórico 11x/12x | Edição podia aplicar taxa 10x silenciosamente. | Taxa existente é preservada; a ocorrência fica indicada no resumo de edição. |
| Meio de pagamento | Formulários e splits tinham listas divergentes. | Os três selects e splits usam PAG_MEIOS. |

## 5. Benefícios

- Evita apresentar decomposição financeira contraditória em PDF de proposta.
- Remove uma exposição indevida de dados de duas pacientes no mesmo documento.
- Evita bloqueio tardio ao salvar orçamento após trocar procedimento.
- Elimina vetores de quebra de atributo/handler no chip de hospital ao serializar com jsArg().
- Mantém histórico de taxa fora da faixa configurável sem alteração automática de valor.
- Registra edição de paciente e log no mesmo update RTDB.

## 6. Possíveis riscos

- O bloqueio de mesma paciente compara nomes, não um identificador estável. Homônimos continuam uma limitação do modelo atual.
- Um PDF muito longo pode ganhar uma página final apenas para as observações legais; é preferível a texto cortado, mas merece avaliação visual.
- null como sinal de taxa histórica é um contrato interno novo; futuros chamadores de getTaxaPct() devem preservar essa semântica.
- A lista única abrange os meios conhecidos. Um meio histórico desconhecido continua sem política de normalização ou cadastro próprio.

## 7. Casos de teste executados

- Sintaxe: os 7 blocos script compilam via new Function().
- Formatação: git diff --check -- analista_financeiro.html sem erro.
- _totalHospitalarOrcamento(): hospRows de R$ 1.500 + R$ 2.300 = R$ 3.800; fallback hospitais = R$ 700; fallback hospTotal = R$ 900.
- _sincronizarHospitaisComItens(): com procedimentos A e linhas A/B/vazia, após sincronização permanecem A e vazia.
- _orcamentosAtivosDoComparativo(): seleção a,b,sumido,c, onde b está em lixeira, resulta em a,c.
- getTaxaPct(): crédito 2x retornou taxa configurada; crédito 12x retornou null; débito continuou retornando sua taxa.
- preencherMeiosPagamento(): fPag, ePag e payMetodo receberam as 9 opções de PAG_MEIOS.
- jsArg() com aspas, tag e barra invertida não produziu aspas duplas nem tags cruas no handler.

## 8. Limitações conhecidas

- Não houve teste em navegador, geração visual de PDF, impressão, autenticação ou Firebase real.
- Não houve migração de orçamentos antigos, pois os fallbacks são somente leitura.
- O comparativo ainda é uma seleção temporária, não uma entidade persistida de alternativas comerciais.
- A correção não resolve a ausência estrutural de patient_id ou CommercialCase.

## 9. Perguntas específicas para revisão

1. O fallback de leitura hospRows → hospitais → hospTotal/hospVal é suficiente, ou convém declarar e executar migração controlada?
2. Bloquear comparação pelo nome da paciente é a barreira adequada até existir patient_id, ou o comparativo deveria exibir confirmação adicional?
3. Para taxa histórica 11x/12x, preservar o valor é a melhor política ou a edição deveria ser bloqueada até haver regra histórica explícita?
4. A página adicional para observações finais do PDF é aceitável para o fluxo de impressão, ou uma solução com nota no rodapé de cada página seria superior?
5. A centralização de meios deve evoluir para uma configuração persistida, ou a constante atual é suficiente no curto prazo?
