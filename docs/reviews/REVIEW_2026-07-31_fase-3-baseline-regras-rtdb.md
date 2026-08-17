# Revisão técnica — Fase 3: baseline de regras RTDB

**Data:** 2026-07-31  
**Escopo:** versionamento local e auditoria estática das regras RTDB recebidas.  
**Estado:** pronto para revisão independente; nenhuma regra remota foi publicada.

## 1. Objetivo da alteração

Criar uma linha de base versionada das regras do Firebase Realtime Database e verificar se os nós que o Analista Financeiro grava são realmente autorizados. Registrar a decisão operacional de que apenas a secretária registra pagamentos e o médico é responsável por orçamentos.

## 2. Arquivos modificados

- `firebase.database.rules.json`
- `docs/PROJECT_CONTEXT.md`
- `docs/CHANGELOG_AI.md`
- `docs/architecture/README.md`
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`
- `docs/reviews/REVIEW_2026-07-31_fase-3-baseline-regras-rtdb.md`

## 3. Decisões arquiteturais

- A regra recebida foi preservada como baseline local; não foi gerado `firebase.json`, autenticado CLI ou efetuado deploy.
- A origem é uma cópia declarada pelo titular. O arquivo deve ser revisado contra o Console antes de uma publicação futura, pois não houve leitura automática do ambiente remoto.
- Concorrência humana de pagamentos foi classificada como não aplicável: há uma única secretária registrando pagamentos. Isso não substitui idempotência contra clique duplo, reconexão ou escrita direta.
- Não foi proposta regra permissiva para “destravar” pagamentos de imediato. A falta de `quote_payments` e `recorrentes` exige uma proposta por papel que preserve a escrita atômica e a segregação de funções.

Alternativa que pode ser melhor: migrar o comando de pagamento para backend antes de restringir regras de orçamento. Ela fornece autoridade maior, porém exige infraestrutura de deploy que este repositório não contém. Com um único registrador humano, regras RTDB revisadas e idempotência atual podem ser o passo proporcional, desde que testadas fora de produção.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois desta rodada |
| --- | --- | --- |
| Auditoria de regras | Não havia arquivo versionado; a aplicação era a única fonte local de referência. | A cópia declarada está em `firebase.database.rules.json`, com limites de procedência documentados. |
| Registrar pagamento | A tela tenta uma escrita atômica contendo `quote_payments`, mas a regra ausente a nega. | O comportamento em produção não mudou; a causa está identificada e documentada para correção revisável. |
| Recorrências | Os fluxos tentam gravar `recorrentes` sem permissão correspondente. | O comportamento em produção não mudou; a incompatibilidade está documentada. |

## 5. Benefícios

- Torna as regras auditáveis por diff e revisão independente.
- Identifica dois bloqueios de autorização antes de propor alterações remotas.
- Separa fato confirmado de hipótese: a falha decorre de caminhos sem `.write` em operações atômicas.
- Registra a realidade operacional para evitar criar Cloud Function apenas por concorrência humana inexistente.

## 6. Possíveis riscos

- O JSON local pode divergir do Console se a cópia recebida não for a versão publicada mais recente.
- Publicar uma regra que apenas libere `quote_payments` e `recorrentes` sem segmentar `orcamentos` e `lancamentos` manteria privilégios excessivos.
- A regra de leitura no ancestral continua expondo custos internos e dados administrativos a ambos os usuários.
- Ajustar regras sem teste com dados legados pode bloquear pagamentos, restaurações ou o uso de orçamentos existentes.

## 7. Casos de teste executados

- Parse do arquivo `firebase.database.rules.json` como JSON.
- Varredura estática dos caminhos de escrita em `analista_financeiro.html` e comparação com os nós que possuem `.write` na baseline.
- Inspeção de `salvarPagamento()` e `excluirPagamento()`: ambos escrevem `quote_payments` em `dbRef.update()`.
- Inspeção das funções de recorrência: escrevem `recorrentes` diretamente e no `update()` de geração.
- `git diff --check` dos arquivos desta rodada.

Não houve teste contra Firebase real nem publicação de regra.

## 8. Limitações conhecidas

- Não há ambiente de homologação, Firebase CLI configurado ou mecanismo de teste de regras neste repositório.
- A regra recebida contém apenas autorização básica; não há schema, transições financeiras, validação de valores ou vínculo obrigatório de auditoria.
- A aplicação ainda carrega a raiz `consultorio`, portanto a segregação de leitura não pode ser resolvida apenas escondendo elementos da interface.
- Esta rodada não corrige a escrita negada em produção; apenas estabelece a baseline e o diagnóstico necessário para uma alteração segura.

## 9. Perguntas específicas para revisão

1. Dado que a secretária registra pagamentos, quais campos de `orcamentos` ela deve poder alterar como efeito de um pagamento: somente `status` e `receitaGeradaId`, ou nenhum?
2. A secretária precisa cadastrar/editar pacientes, criar lançamentos manuais ou apenas registrar pagamentos? A resposta define as permissões mínimas de `patients` e `lancamentos`.
3. Custos internos, tabelas hospitalares, comissões e logs devem permanecer visíveis à secretária? A regra `.read` no ancestral hoje concede todos eles.
4. É aceitável corrigir primeiro permissões de `quote_payments` e `recorrentes` em ambiente de homologação, ou o pagamento deve migrar para backend antes de qualquer liberação?
5. Qual procedimento aprovará a comparação final entre `firebase.database.rules.json` e as regras realmente publicadas antes de um futuro deploy?

## Correção posterior do parecer independente

Após a revisão independente e autorização do titular, a baseline foi renomeada para `firebase.database.rules.unverified.json` e complementada por `REVIEW_2026-07-31_correcao-parecer-fase-3.md`. As conclusões sobre `quote_payments` e `recorrentes` permanecem análise estática da cópia recebida; não são confirmação de produção até a matriz de `FIREBASE_RTD_RULES_VERIFICATION.md` ser preenchida.
