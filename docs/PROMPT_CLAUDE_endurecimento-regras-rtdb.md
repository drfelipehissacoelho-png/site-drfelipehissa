# Prompt para o executor (Claude) — Endurecimento das regras RTDB

> Gerado em 2026-08-20, após a TAREFA 2 (contagens do backup) confirmar o sinal
> de procedência. Copie o bloco abaixo integralmente para o executor.

---

```text
Você é o executor responsável pelo ENDURECIMENTO das regras do Firebase Realtime
Database do módulo financeiro do consultório. Trabalhe com método: proposta →
teste em Playground → relatório. NENHUM deploy sem autorização explícita do
titular. NENHUMA escrita real no banco de produção.

PASSO 0 — CONFIRME O REPOSITÓRIO
Repositório: C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa
(branch feat/auditoria-analista-financeiro; contém docs/ e
firebase.database.rules.unverified.json na raiz). Se a pasta não tiver docs/,
PARE e peça o repositório correto. Confirme no relatório pasta + branch lidas.

EVIDÊNCIA NOVA (muda o patamar da decisão)
A TAREFA 2 foi executada sobre o backup real exportado em 2026-08-20:
  - quote_payments: 0 nós
  - recorrentes: 0 nós
  - orçamentos ativos: 50 (2 aceitos)
  - lançamentos com linked_pay_id: 6 (órfãos — a receita gravou, o pagamento
    foi negado; resíduo do fluxo pré-atomicidade)
  - passivo histórico: 50 orçamentos sem quote_payment
Interpretação (ver docs/reviews/REVIEW_2026-08-20_backup-contagens-e-limpeza-procedimentos.md):
a baseline está QUASE CERTAMENTE publicada, e o fluxo de pagamento (update
atômico multi-path que inclui quote_payments) e as recorrentes estão
INDISPONÍVEIS em produção. Ou seja: o endurecimento não é só defesa — é
DESBLOQUEIO de funcionalidade.

LEITURAS OBRIGATÓRIAS
1. firebase.database.rules.unverified.json (baseline)
2. docs/architecture/FIREBASE_RTD_RULES_GAP.md e FIREBASE_RTD_RULES_VERIFICATION.md
3. Seu próprio relatório: docs/reviews/REVIEW_2026-08-20_verificacao-rules-rtdb-execucao.md
4. docs/reviews/REVIEW_2026-08-20_backup-contagens-e-limpeza-procedimentos.md
5. analista_financeiro.html (raiz do repo) — para extrair os schemas reais

OBJETIVO
Propor firebase.database.rules.proposed.json que:
  a) ADICIONE escrita para quote_payments e recorrentes (desbloqueio);
  b) adicione .validate compatível com os dados reais (sem quebrar registros
     históricos nem a restauração de backups antigos);
  c) restrinja escrita por $id onde fizer sentido (sem .write amplo de coleção);
  d) torne a autoria do log não forjável (newData email == auth.token.email);
  e) NÃO quebre o listener único: o app lê tudo via .on('value') em
     ref('consultorio') — .read concedido em /consultorio NÃO pode ser revogado
     em filhos; portanto segregação de leitura por papel NÃO deve ser tentada
     por regras (impossível sem refatorar o cliente — já registrado no GAP doc).

CONTRATOS QUE AS REGRAS PRECISAM HONRAR (extraia e confirme no código)
- Pagamento de orçamento (update atômico, ~linha 5500-5560):
  quote_payments/<payId> (create), lancamentos/<lancId> (create) + taxa
  opcional, orcamentos/<id>/receitaGeradaId + /status, log/<id>.
  Campos de quote_payments: id, quote_id, payment_date, amount,
  payment_method, installments, card_brand, status, notes, created_by,
  created_by_email, created_at, updated_at (+ deletedAt/deletedBy no estorno).
- Estorno de pagamento: atualiza deletedAt/deletedBy em quote_payments e
  lancamentos vinculados, e orcamentos/<id>/receitaGeradaId=null → as regras
  devem permitir UPDATE (não só create) nesses caminhos.
- Recorrentes: create/update em recorrentes/<id> (campos: descricao, categoria,
  valor, frequencia, diaVencimento, mes, ativo, ultimoPeriodoGerado, criadoEm,
  criadoPor) e DELETE deliberado (hard delete de template — decisão registrada;
  lançamentos gerados são preservados).
- Restauração de backup: update multi-path incluindo TODOS os nós (somente
  titular no cliente; as regras devem refletir isso).
- Purga da lixeira: update com null em lancamentos/<id> (delete por $id deve
  continuar possível para os dois usuários, ou restrinja — proponha e justifique).

PROCESSO OBRIGATÓRIO
1. Rode no Playground os 6 casos do roteiro original contra a baseline
   publicada (fecha a questão B — procedência) e registre na matriz.
2. Só então teste a regra PROPOSTA no Playground: simule create/update/delete
   allow e deny por papel nos caminhos alterados, incluindo os fluxos atômicos
   completos (pagamento com 5-6 caminhos num único update).
3. Teste de regressão obrigatório: simule a restauração de um backup v1 e v2
   (update multi-path com nós legados) contra a regra proposta — .validate
   restritivo demais quebra restore de registros históricos; se houver tensão,
   prefira validações tolerantes e documente o trade-off.
4. NADA de deploy. O entregável é arquivo + matriz + relatório.

ENTREGÁVEIS
- firebase.database.rules.proposed.json (novo arquivo; não sobrescreva a baseline)
- Matriz de evidência: baseline publicada vs Playground (questão B) + regra
  proposta vs todos os fluxos acima
- docs/reviews/REVIEW_<data>_regras-propostas.md com: diff comentado das regras,
  riscos residuais, plano de deploy (backup prévio obrigatório, janela,
  rollback) e o que fica de fora e por quê

RESTRIÇÕES
- Sem deploy, sem escrita real, sem dados pessoais no relatório.
- Não altere analista_financeiro.html (alça de outro agente). Se a regra ideal
  exigir mudança de cliente (ex.: listeners por nó para segregação), registre
  como recomendação — não implemente.
- INCONCLUSIVO com explicação vale mais que suposição.
```

---

## Notas para o titular

- Esta rodada do Claude **precisa do Playground** (Console autenticado) — sem ele, a questão B (procedência) não fecha formalmente e a regra proposta não pode ser validada. A evidência do backup já destrava a *direção* (adicionar escrita em `quote_payments`/`recorrentes`), mas o deploy só depois do Playground + sua autorização.
- O entregável dele será `firebase.database.rules.proposed.json` — um arquivo novo, nada é publicado automaticamente.
- Enquanto isso, sigo com as melhorias de qualidade de vida no front-end, sem tocar em regras nem em caminhos do RTDB.
