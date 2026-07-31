# Revisão Independente — Fase 1: integridade crítica

**Data:** 2026-07-30
**Escopo:** `analista_financeiro.html`
**Estado:** implementação local concluída; ainda sem revisão independente.

## 1. Objetivo da alteração

Corrigir falhas confirmadas que podiam causar perda de dados, inconsistência entre orçamento/pagamento/DRE ou erro operacional imediato, sem introduzir uma nova política comercial ou financeira.

## 2. Arquivos modificados

- `analista_financeiro.html`
- `docs/CHANGELOG_AI.md`
- `docs/reviews/REVIEW_2026-07-30_fase-1-integridade-critica.md`

Nenhum outro módulo, configuração de deploy, regra Firebase ou dado remoto foi alterado.

## 3. Decisões arquiteturais

- `genId()` passou a usar chaves `push()` do Firebase RTDB. Isso elimina a perda de precisão de IDs numéricos e reduz colisões entre dispositivos.
- IDs novos são strings; `jsArg()` preserva IDs numéricos antigos e torna os IDs string seguros nos handlers HTML existentes.
- Orçamento novo, edição de orçamento, pagamento e exclusão de pagamento usam atualização multi-path única com o evento de auditoria no mesmo commit RTDB.
- O sucesso de salvar orçamento, imprimir, gerar PDF ou abrir pagamento só acontece após a Promise do Firebase ser confirmada.
- Datas de campos `date` passaram a usar o calendário local, não a conversão UTC de `toISOString()`.
- O fluxo legado que lançava receita pendente a partir do orçamento foi removido da interface e bloqueado na função pública.
- Linhas hospitalares precisam estar completas e vinculadas a um procedimento presente no orçamento antes de salvar, gerar PDF rápido ou imprimir rápido.
- A restauração não sobrescreve o nó `log`; backups agora incluem recorrências.

Alternativa potencialmente superior: mover os comandos financeiros para Cloud Functions ou outro backend transacional com regras RTDB versionadas. A solução atual melhora a consistência no cliente, mas não substitui autoridade no servidor.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois |
| --- | --- | --- |
| Salvar e imprimir orçamento | PDF/impressão podia abrir antes da confirmação remota. | Aguarda confirmação do orçamento e do log no Firebase. |
| Pagamento de orçamento | Pagamento, receita, taxa, status e log eram várias escritas independentes. | Um único commit grava os itens vinculados e o log. |
| Valor acima do saldo | Operador podia confirmar sobrepagamento sem entidade de crédito. | Bloqueado até existir fluxo explícito de crédito. |
| Lixeira de orçamento | Botões chamavam funções inexistentes e a proteção considerava pagamentos ativos de forma diferente da purga. | Restaurar e purgar funcionam; mover para lixeira e purgar são ambos bloqueados quando existe qualquer pagamento vinculado, inclusive excluído logicamente, para preservar a trilha de auditoria. |
| Hospital | Era possível persistir custo de hospital ligado a procedimento fora do orçamento. | Seleção e salvamento restringem a combinação. |
| Backup/restauração | Recorrências não eram exportadas; log podia ser sobrescrito. | Recorrências entram no backup e logs são preservados na restauração. |

## 5. Benefícios

- Menor risco de perda parcial de registros financeiros durante falha de rede ou regra Firebase rejeitada.
- Menor risco de imprimir/prosseguir com orçamento ainda não confirmado.
- Eliminação do erro de precisão dos IDs numéricos.
- Redução de sobrepagamento não representado contabilmente.
- Recuperação efetiva de orçamentos na lixeira.
- Bloqueio de uma incompatibilidade hospital–procedimento confirmada.

## 6. Possíveis riscos

- IDs Firebase agora são strings. Os handlers revisados aceitam IDs numéricos legados e strings, mas telas pouco usadas podem ainda conter dependência implícita de IDs numéricos.
- Uma atualização multi-path do cliente ainda não resolve a corrida de dois usuários que calculam o mesmo saldo a partir de snapshots diferentes.
- Bloquear pagamento acima do saldo pode exigir um fluxo futuro de crédito, estorno ou adiantamento para casos legítimos.
- O bloqueio do fluxo legado impede novos lançamentos incorretos, mas não migra receitas pendentes já históricas.
- Orçamentos com qualquer pagamento vinculado, inclusive excluído logicamente, não podem ser movidos para a lixeira nem purgados. Isso preserva referências de auditoria, mas casos históricos inconsistentes exigem procedimento administrativo específico.

## 7. Casos de teste executados

- Estrutura de 7 tags `script` validada; `node --check` no único script inline do HTML: aprovado.
- Testes puros da Fase 1: 6/6 aprovados.
  - combinação hospital–procedimento válida;
  - procedimento hospitalar incompatível;
  - linha hospitalar incompleta;
  - data local `2026-07-30`;
  - serialização segura de ID Firebase string;
  - preservação de ID numérico legado.
- Verificação estática: funções de lixeira existem; backup contém `recorrentes`; restauração exclui `log`; orçamento e pagamento críticos usam `await dbRef.update(updates)`; salvar, PDF rápido e impressão rápida validam o orçamento.
- `git diff --check`: aprovado.

## 8. Limitações conhecidas

- Não houve teste contra Firebase real, múltiplas abas ou dois usuários concorrentes; não foram disponibilizadas regras RTDB nem ambiente de homologação.
- Não há transação de saldo/recebível no servidor. Portanto, a proteção contra sobrepagamento é apenas de cliente neste lote.
- Valores financeiros continuam em ponto flutuante. A migração para centavos inteiros exige etapa própria com compatibilidade de dados.
- Despesas de equipe e comissão para pagamento parcial não foram alteradas: falta política explícita sobre gatilho, base de cálculo e estorno.
- O HTML monolítico continua sem testes E2E, modularização ou separação de domínio.

## 9. Perguntas específicas para revisão

1. A conversão de novos IDs para chaves `push()` cobre todos os fluxos que ainda podem receber IDs numéricos históricos?
2. A política correta para pagamentos acima do saldo é bloquear, criar crédito, ou exigir ajuste do orçamento? Qual entidade deve representar esse crédito?
3. Despesas de equipe e comissão devem nascer no aceite, na data cirúrgica, no recebimento parcial ou no recebimento total? Como devem ser estornadas?
4. A política de preservar `log` na restauração é suficiente ou backups devem separar auditoria de dados operacionais por completo?
5. Qual desenho de regra RTDB/Cloud Function pode garantir saldo e idempotência quando dois operadores registram pagamentos simultaneamente?
