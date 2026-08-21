# Regras Firebase Realtime Database — baseline não verificada e lacunas

**Status:** a procedência da cópia ainda não foi confirmada comportamentalmente contra as regras publicadas.
**Arquivo local:** `firebase.database.rules.unverified.json`.
**Implantação remota:** não realizada nesta fase.

## Por que a baseline é não verificada

A cópia foi fornecida pelo titular e preservada localmente. O acesso automatizado ao Console foi bloqueado antes da autenticação e não houve leitura independente, CLI, deploy ou ambiente de homologação. O nome do arquivo impede que ele seja confundido com fonte de verdade até a verificação manual descrita em [FIREBASE_RTD_RULES_VERIFICATION.md](FIREBASE_RTD_RULES_VERIFICATION.md).

O repositório ainda não contém `firebase.json`, `.firebaserc`, Cloud Functions ou ambiente de homologação. Versionar o JSON não o conecta a deploy nem altera o Firebase.

## Fatos condicionais à confirmação da baseline

A tabela abaixo descreve o efeito **se** a cópia corresponder às regras publicadas. O cruzamento estático entre o JSON e o código é confirmado; a identidade entre JSON e produção permanece pendente.

| Nó RTDB | Regra na baseline | Código que grava | Efeito se publicada |
| --- | --- | --- | --- |
| `quote_payments` | Não há `.write` no nó ou em ancestral com escrita. | `salvarPagamento()` e `excluirPagamento()`. | O `dbRef.update()` de pagamento é negado integralmente; nada da operação atômica confirma. |
| `recorrentes` | Não há `.write` no nó ou em ancestral com escrita. | `salvarRecorrente()`, `toggleRecorrente()`, `excluirRecorrente()` e `_gerarLancRecorrente()`. | Cadastro, alteração e geração automática são negados; no `update()` da geração, lançamento e log também não confirmam. |
| Restauração de backup | `BACKUP_RESTORE_NODES` inclui os dois nós negados. | `importarJSON()` usa um único `dbRef.update(nodes)`. | A restauração inteira é negada, inclusive nós que teriam permissão individual. |
| `lancamentos`, `orcamentos`, `patients` | `.write` no nível da coleção para médico e secretária. | Fluxos comerciais e financeiros. | Qualquer um dos dois pode escrever ou apagar a coleção inteira, por exemplo `set(null)`, além de alterar campos sem schema ou transição validada. |
| `log/$logId` | Criação append-only para ambos. | `criarEventoLog()` e `anexarLogAtualizacao()`. | Sobrescrita e remoção de evento existente são bloqueadas. Ainda se pode criar evento arbitrário com identidade e conteúdo fornecidos pelo navegador. |

O módulo grava nos nós `config`, `hospitalPrices`, `lancamentos`, `log`, `orcamentos`, `patients`, `procedureConfig`, `procedures`, `quote_payments` e `recorrentes`. Os dois últimos determinam a verificação prioritária.

## Impacto operacional e histórico

Depois da Fase 1, pagamento passou a usar uma única escrita atômica e a mostrar falha ao operador. Se a baseline estiver publicada, isso transforma a inconsistência silenciosa antiga em indisponibilidade visível: `salvarPagamento()` exibe erro e não grava parcialmente receita, pagamento, status e auditoria. Essa é a propriedade correta do novo fluxo, mas a regra deve ser corrigida antes de ele servir a operação.

Há um **passivo histórico possível**, não confirmado: orçamentos com `receitaGeradaId` e lançamentos de receita podem não ter `quote_payments` correspondente. Nesse cenário, DRE pode conter receita enquanto `calcValorPago()` retorna zero. A quantificação deve ser feita sobre backup local, sem enviar dados pessoais, antes de qualquer reconciliação.

## Leitura, LGPD e segregação de funções

A regra `.read` no nível `consultorio` concede aos dois usuários acesso de leitura a toda a árvore, inclusive custos internos, configurações hospitalares, comissões e logs. Em RTDB, a permissão concedida no ancestral não pode ser revogada nos filhos.

A decisão operacional informada para esta fase é:

- a secretária é a única pessoa que registra pagamentos;
- o médico é o responsável pelos orçamentos.

Isso elimina concorrência humana entre dois registradores de pagamento, mas não elimina clique duplo, reconexão, escrita manual via console ou comportamento de código futuro. As regras atuais, se confirmadas, continuam permitindo à secretária alterar qualquer orçamento e ler custos internos.

## Limites técnicos da baseline

- Não há `.validate` para estrutura, tipos, valores monetários, vínculo entre pagamento/lançamento/orçamento ou transição de status.
- A escrita por e-mail é frágil a troca de endereço e repete a mesma política diversas vezes; uma evolução futura deve preferir `auth.uid` e papéis versionados.
- O append-only de `log` é real, mas autoria é forjável sem ao menos validar `newData.child('email').val() === auth.token.email` e campos mínimos.
- Atomicidade de `update()` garante tudo-ou-nada somente depois que cada caminho é autorizado; não torna o conjunto de caminhos obrigatório para outros clientes.
- A aplicação escuta a raiz `consultorio`. Retirar leitura da raiz para segregar custos exige refatoração do cliente para escutar nós individuais; apenas mudar a regra quebraria o carregamento.

## Próximo passo autorizado necessário

Executar o roteiro em [FIREBASE_RTD_RULES_VERIFICATION.md](FIREBASE_RTD_RULES_VERIFICATION.md) sem escrita real. Até que os resultados allow/deny coincidam com a baseline, não se deve propor nem implantar regras por papel.

Se confirmado, a próxima proposta deverá incluir escopo por `$id`, escrita mínima da secretária para o pagamento atômico, validação de autoria de log e um plano separado de reconciliação histórica. Este documento não é uma regra implantável nem autorização para deploy.

---

## ATUALIZAÇÃO 2026-08-20 — Baseline substituída (deploy executado)

**A baseline documentada neste arquivo deixou de ser a regra vigente em 2026-08-20.**

- Questão B (procedência) fechada: a baseline ERA a regra publicada — provado por leitura direta do texto no Console + 12/12 simulações (ver `docs/reviews/REVIEW_2026-08-20_regras-propostas.md` §2).
- Estado antes do deploy: pagamento de orçamento, geração de recorrentes e restauração de backup **negados em bloco** (quote_payments e recorrentes sem `.write`).
- Deploy executado pelo titular em 2026-08-20 ~21h, seguindo o plano da §9 do relatório: publicação de `firebase.database.rules.proposed.json` no Console, smoke test com dados de teste **aprovado** (pagamento de orçamento salva e baixa saldo — operação antes quebrada).
- Artefato de rollback: `firebase.database.rules.published-2026-08-20.json` (estado anterior, sem dados).
- Verificação pós-deploy: pendente registrar aqui o resultado das 24h de observação.
- Seguem pendentes e documentados na §8 do relatório: segregação de leitura por papel (exige refatoração do cliente), migração para `auth.uid`, reconciliação dos 6 lançamentos órfãos e dos 50 orçamentos sem quote_payment (rodada própria).
