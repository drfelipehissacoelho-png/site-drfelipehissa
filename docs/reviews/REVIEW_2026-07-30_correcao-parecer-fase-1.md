# Revisão Independente — Correções do parecer da Fase 1

**Data:** 2026-07-30
**Escopo:** `analista_financeiro.html` e documentação técnica relacionada
**Estado:** alterações locais concluídas; aguardando nova revisão independente.

## 1. Objetivo da alteração

Incorporar os pontos técnicos do parecer independente sobre a Fase 1 que podiam causar regressão financeira, ordenação incorreta, perda de trilha de auditoria ou manutenção ambígua. Não foram implementadas políticas novas de crédito, comissão, despesas automáticas ou backend.

## 2. Arquivos modificados

- `analista_financeiro.html`
- `docs/reviews/REVIEW_2026-07-30_fase-1-integridade-critica.md`
- `docs/reviews/REVIEW_2026-07-30_correcao-parecer-fase-1.md`
- `docs/CHANGELOG_AI.md`
- `docs/architecture/README.md`

## 3. Decisões arquiteturais

- `getLog()` usa `dataServidor` quando disponível e `data` como fallback; a ordenação deixou de depender de aritmética com IDs Firebase.
- `renderOrcamentos()` usa `criadoEm` e, para dados legados, `data`; há desempate determinístico por ID string.
- Totais de orçamento são arredondados a duas casas nas fronteiras de persistência e apresentação. A representação continua em `Number`, não em centavos inteiros.
- A lixeira bloqueia tanto o envio quanto a purga de um orçamento se existir qualquer `quote_payment` vinculado, inclusive soft-deleted. A decisão privilegia integridade referencial e auditoria.
- `mudarStatusOrc()` grava status e evento de auditoria no mesmo `dbRef.update()` multi-path.
- Exportação e restauração usam listas de nós explícitas. `log` é exportado, porém nunca é importado.
- O código inalcançável do fluxo legado de geração de receita foi removido. O fluxo disponível para recebimento permanece o de pagamentos.
- `jsArg()` tem contrato explícito para handlers inline com atributo delimitado por aspas duplas e falha para valor ausente.

Alternativa possivelmente melhor: comandos financeiros e auditoria no servidor, com regras RTDB versionadas e valores em centavos inteiros. Esta alteração reduz falhas no cliente, mas não substitui essas garantias.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois |
| --- | --- | --- |
| Lista de orçamentos | IDs Firebase string eram subtraídos, produzindo `NaN` e ordem instável. | Exibe do mais recente ao mais antigo por data de criação, com fallback para orçamento legado. |
| Histórico de auditoria | Ordem dependia do ID, não do momento do evento. | Prioriza timestamp do servidor e preserva compatibilidade com eventos antigos. |
| Orçamento com desconto de fração de centavo | Tela/PDF podiam exibir arredondamento diferente do valor gravado; pagamento sugerido podia ser bloqueado. | Total gravado, tela e PDF são arredondados a centavos; tolerância de pagamento é de R$ 0,01. |
| Lixeira de orçamento | Exclusão e purga aplicavam critérios diferentes para pagamentos soft-deleted. | Ambas protegem a referência de qualquer pagamento vinculado. |
| Mudança de status | Log e status eram escritas separadas. | Status e log são enviados no mesmo update multi-path. |

## 5. Benefícios

- Corrige a regressão causada pela troca para IDs Firebase string.
- Evita bloqueio indevido do valor sugerido de pagamento após arredondamento exibido ao operador.
- Mantém a cadeia orçamento–pagamento–auditoria íntegra durante lixeira e purga.
- Reduz chance de status sem evento de auditoria correspondente.
- Torna a política de backup/restauração verificável no código.
- Remove um fluxo morto que poderia induzir manutenção ou reativação acidental de receita duplicada.

## 6. Possíveis riscos

- O bloqueio conservador da lixeira pode exigir procedimento administrativo para eliminar dados históricos que possuam pagamentos excluídos logicamente.
- Registros já existentes com mais de duas casas não são migrados neste lote; a tolerância de R$ 0,01 é compatibilidade temporária, não solução contábil definitiva.
- Dois usuários ainda podem calcular o mesmo saldo local e registrar pagamentos concorrentes; não há transação ou validação de saldo no servidor.
- `jsArg()` continua destinado apenas a handlers inline existentes; o HTML monolítico mantém essa superfície técnica até modularização aprovada.

## 7. Casos de teste executados

- `node --check` no único script inline: aprovado.
- Testes puros: 10/10 aprovados.
  - arredondamento de R$ 999,995 para R$ 1.000,00;
  - total de R$ 9.999,95 com 10% de desconto resulta em R$ 8.999,95;
  - pagamento exibido de R$ 8.999,96 sobre saldo legado de R$ 8.999,955 é aceito pela tolerância;
  - R$ 8.999,97 continua bloqueado;
  - ordenação de log por `dataServidor` e fallback pt-BR;
  - ordenação de orçamento por `criadoEm`, fallback `data` e desempate por ID;
  - pagamento soft-deleted preserva bloqueio de lixeira/purga;
  - `jsArg()` serializa chave Firebase e rejeita `null`.
- Verificação estática: não restam ordenações `b.id-a.id`, fluxo legado de receita nem lista de restauração derivada da lista de exportação.
- `git diff --check`: aprovado.

## 8. Limitações conhecidas

- Não houve validação com Firebase real, regras RTDB, desconexão/reconexão ou duas sessões concorrentes.
- Não há conversão completa de valores existentes para centavos inteiros.
- Não foi criado fluxo de crédito, estorno financeiro formal, comissão ou despesa automática para pagamentos parciais.
- Não houve mudança de estrutura do projeto nem modularização do HTML.

## 9. Perguntas específicas para revisão

1. A política conservadora de impedir lixeira e purga diante de qualquer pagamento soft-deleted é adequada à retenção/auditoria da clínica, ou deve existir fluxo administrativo de anonimização/retenção?
2. O fallback de datas legadas cobre os formatos históricos reais de `log` e `orcamentos` disponíveis no Firebase?
3. A tolerância de R$ 0,01 é aceitável até uma migração para centavos inteiros? Que plano de compatibilidade deve tratar saldos antigos com três ou mais casas?
4. O uso de `dbRef.update()` basta para alteração de status, ou as regras RTDB devem obrigar um `AuditEvent` correspondente?
5. Há um desenho de Cloud Function ou transação RTDB aprovado para validar saldo e idempotência de pagamentos concorrentes?