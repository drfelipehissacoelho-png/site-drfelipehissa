# Revisão Independente — Fase 2: integridade de recorrências

**Data:** 2026-07-31
**Escopo:** `analista_financeiro.html` e documentação de arquitetura relacionada
**Estado:** alterações locais concluídas; aguardando revisão independente.

## 1. Objetivo da alteração

Eliminar a duplicação silenciosa de despesas recorrentes causada por escrita parcial entre lançamento e marcador de período, tornar falhas de renderização visíveis ao operador e consolidar a tolerância monetária usada em pagamentos. Registrar, sem presumir backend remoto, a ausência de regras Firebase RTDB versionadas no repositório.

## 2. Arquivos modificados

- `analista_financeiro.html`
- `docs/architecture/README.md`
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`
- `docs/CHANGELOG_AI.md`
- `docs/reviews/REVIEW_2026-07-31_fase-2-integridade-recorrencias.md`

## 3. Decisões arquiteturais

- A chave de lançamento recorrente agora é determinística por `recorrente_id` e `recorrente_periodo`. Duas abas que tentem criar o mesmo período apontam para o mesmo nó financeiro.
- Lançamento, `ultimoPeriodoGerado` e evento de auditoria recorrente são gravados no mesmo `dbRef.update()` multi-path. Uma falha não confirma parcialmente o período no novo fluxo.
- O evento de auditoria recorrente também usa chave determinística por período. Isso reduz logs duplicados em retries de cliente; regras append-only no servidor continuam necessárias para autoridade real.
- O processador aguarda cada confirmação antes de avançar e bloqueia reentrada no mesmo cliente.
- Registros recorrentes soft-deleted contam como existentes, evitando que uma exclusão intencional recrie a despesa automaticamente.
- `renderAll()` mostra toast uma vez por área em falha contínua e remove a supressão quando a área se recupera.
- `TOLERANCIA_CENTAVO` centraliza a compatibilidade de R$ 0,01. `arredondarCentavos()` passou a usar deslocamento decimal, corrigindo casos de ponto flutuante como `1250.995`.

Alternativa potencialmente superior: mover a geração de recorrências para Cloud Functions ou outro comando de servidor com chave de idempotência, regras RTDB versionadas e relógio confiável. O lote atual evita a duplicação financeira no cliente, mas não cria autoridade no servidor.

## 4. Fluxo do usuário antes e depois

| Fluxo | Antes | Depois |
| --- | --- | --- |
| Geração recorrente | Criava lançamento com ID aleatório, depois atualizava o período em outra escrita. Queda entre as duas podia duplicar despesa no próximo ciclo. | Usa um ID estável e uma única escrita para lançamento, período e auditoria. |
| Duas abas/reconexão | Podiam criar lançamentos diferentes para o mesmo período. | Convergem para o mesmo caminho de lançamento e auditoria daquele período; não criam duas despesas. |
| Lançamento recorrente removido | Soft-delete fazia o processador entendê-lo como ausente e podia recriá-lo. | Soft-delete continua impedindo recriação automática. |
| Falha ao renderizar uma área | A área podia ficar vazia e o erro ficava apenas no console. | O operador recebe aviso visível sem bloquear as demais áreas. |

## 5. Benefícios

- Reduz risco de despesa recorrente duplicada por falha de rede, retry ou múltiplas abas.
- Mantém lançamento, estado de processamento e auditoria consistentes no novo fluxo.
- Evita que exclusão intencional de despesa recorrente seja desfeita automaticamente.
- Torna falhas de dados/renderização perceptíveis na operação diária.
- Elimina três literais financeiros duplicados e corrige arredondamento de terceira casa decimal.
- Expõe documentalmente a limitação de não haver regras RTDB auditáveis no repositório.

## 6. Possíveis riscos

- Sem regras RTDB ou backend, outro cliente ainda pode escrever diretamente nos nós e contornar as proteções de tela.
- Dois clientes com dados de configuração diferentes podem disputar o mesmo caminho determinístico; não haverá despesa duplicada, mas a última escrita pode definir os metadados do lançamento. Regras/servidor continuam necessários para autoridade.
- Lançamentos legados com `ultimoPeriodoGerado` ausente não são migrados neste lote. Eles deixam de duplicar, mas podem continuar sendo verificados até que um período novo atualize o marcador.
- A alteração mantém valores financeiros em `Number`; o arredondamento é mais robusto, mas não substitui futura representação integral em centavos.
- O toast identifica a área técnica de renderização, não uma mensagem específica para cada tela.

## 7. Casos de teste executados

- 10/10 testes de recorrência e centavos com RTDB simulado:
  - chaves determinísticas de lançamento e auditoria;
  - rejeição de caracteres inválidos em chave RTDB;
  - soft-delete impede recriação;
  - uma única escrita contém lançamento, marcador e log;
  - R$ 1.250,995 resulta em R$ 1.251,00;
  - backfill mensal respeita período já gerado.
- 3/3 testes de renderização: primeira falha gera toast, falha contínua não inunda a tela e recuperação permite novo aviso futuro.
- 9/9 testes de `dataParaTimestamp()` e ordenação mista de logs, incluindo datas pt-BR com dia menor ou igual a 12.
- `node --check` no único script inline e `git diff --check -- analista_financeiro.html`: aprovados.

## 8. Limitações conhecidas

- Nenhuma regra RTDB remota foi lida, criada ou implantada; não há arquivo de regras no repositório.
- Não houve teste com Firebase real, modo offline, reconexão, duas contas ou duas abas reais.
- A solução não resolve concorrência de pagamentos nem cria recebível, crédito, estorno financeiro formal ou política de comissão/equipe.
- Não houve mudança de estrutura ou modularização do HTML monolítico.

## 9. Perguntas específicas para revisão

1. A chave determinística para evento de auditoria recorrente é a política adequada para retries, considerando uma futura regra `log` append-only?
2. Devemos criar uma rotina administrativa de reconciliação para preencher `ultimoPeriodoGerado` em recorrências legadas que já possuem lançamentos?
3. O consultório tem uso simultâneo real por mais de um operador? Essa resposta define se a próxima etapa deve usar transação RTDB ou backend para pagamentos.
4. Qual é o procedimento autorizado para obter, versionar e revisar as regras RTDB efetivamente implantadas sem alterar o ambiente de produção?
5. A mensagem de falha de renderização deve ser traduzida para nomes funcionais de tela antes de ampliar esse padrão para outros erros?

## Correcao posterior do parecer independente

Apos o parecer independente de 2026-07-31 e autorizacao expressa do titular, esta rodada foi corrigida em `REVIEW_2026-07-31_correcao-parecer-fase-2.md`.

- O identificador deterministico foi mantido somente em `lancamentos/recorrente_<recId>_<periodo>`; o evento em `log` voltou a usar `criarEventoLog()` com chave `push()` para ser compativel com futura regra append-only.
- `renderAll()` passou a agregar falhas novas em um unico toast com nomes funcionais e protege a propria tentativa de aviso.
- A mudanca de frequencia limpa `ultimoPeriodoGerado`; a validacao de chave passou a cobrir controles ASCII e limite de 768 bytes; `arredondarCentavos()` passou a tratar notacao exponencial.

As secoes anteriores descrevem o estado entregue antes dessa correcao e nao devem ser usadas isoladamente como especificacao atual.
