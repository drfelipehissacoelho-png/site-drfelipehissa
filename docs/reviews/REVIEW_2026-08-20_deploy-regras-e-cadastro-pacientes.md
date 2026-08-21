# REVIEW 2026-08-20 — Deploy das regras RTDB + cadastro de pacientes + guarda de purga

- **Data:** 2026-08-20 (noite)
- **Autor:** Kimi
- **Contexto:** deploy das regras propostas executado pelo titular com sucesso ("FUNCIONOU, tudo perfeito" — smoke test do pagamento aprovado), seguido de nova rodada de qualidade de vida.

---

## 1. Deploy das regras RTDB — EXECUTADO E APROVADO

- Titular publicou `firebase.database.rules.proposed.json` no Console (~21h), seguindo o plano da §9 de `REVIEW_2026-08-20_regras-propostas.md`.
- Smoke test aprovado: pagamento de orçamento salvou e baixou saldo — operação que estava **negada em bloco** até então.
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md` atualizado: a baseline deixou de ser a regra vigente, com data e artefato de rollback registrados.
- **Pós-deploy pendente:** 24h de observação; reconciliação dos 6 lançamentos órfãos + 50 orçamentos sem `quote_payment` (rodada própria, com plano).

## 2. Cadastro de pacientes — RG sai, data de nascimento entra

Pedido do titular (2026-08-20): RG desnecessário; cadastro precisa de Nome, CPF e **data de nascimento** (faltava no novo cadastro).

| Ponto | Mudança |
|---|---|
| Modal **novo** paciente | Campo RG substituído por **Data de nascimento** (`npNasc`, `type=date`). Telefone/e-mail mantidos (contato operacional da clínica) |
| Modal **editar** paciente | Idem (`epNasc`); exibe `p.nascimento` |
| `salvarNovoPatOrc` | grava `nascimento`; não grava mais `rg` em registros novos |
| `salvarEdicaoPaciente` | grava `nascimento`; `rg` de registros antigos é **preservado** via spread (`old.rg`) — decisão: RG sai da UI, mas o schema antigo não é destruído |
| `esquecerPaciente` (LGPD) | anonimização agora zera também `nascimento`; texto do modal atualizado |
| Limpeza dos campos ao abrir/fechar modal | listas `np*` atualizadas (`npRG` → `npNasc`) |

## 3. Guarda de purga para secretária (RR5)

Com as regras novas, a purga da lixeira é **titular-only no servidor** — sem guarda no cliente, a secretária veria um erro de servidor sem contexto (recomendação de cliente registrada na §8 do relatório do Claude).

- `purgarLancamento` e `purgarOrcamento` agora verificam `CUEmail` do titular **antes** de qualquer coisa e mostram: *"Apenas o titular pode apagar permanentemente. Use 'Restaurar' ou fale com o Dr. Felipe."*
- A restauração da lixeira continua disponível para ambos.

## 4. Correção da rodada anterior (title-case)

- `_procDisplay()`: entradas "(cópia)" ficavam em CAPS porque o sufixo minúsculo reprovava o teste "100% maiúsculo". Sufixo agora avaliado à parte. Testado com os nomes reais do backup.

## 5. Validação

- `node --check` OK; `git diff --check` limpo; zero ocorrências de `npRG`/`epRG` na UI.
- Não testado em navegador — validação visual recomendada: novo paciente com data de nascimento, edição de paciente antigo (RG preservado invisível), purga com conta da secretária (deve mostrar o toast, não erro).

## 6. Fila atualizada

1. ~~RG/nascimento~~ → feito · ~~guarda de purga~~ → feito · ~~deploy regras~~ → feito
2. Reconciliação: 6 lançamentos órfãos + 50 orçamentos sem `quote_payment` (rodada própria — agora possível, pois as regras permitem escrever `quote_payments`)
3. Atomicidade de `salvarLancamento`
4. `patient_id`/`case_id` nos orçamentos
5. Decisão: Convênio/Parcelado no modal de pagamento
6. Guarda `isTitular` em `_processarRecorrentes` (§8 do relatório do Claude; permite remover a exceção de `ultimoPeriodoGerado` nas regras numa próxima revisão)
