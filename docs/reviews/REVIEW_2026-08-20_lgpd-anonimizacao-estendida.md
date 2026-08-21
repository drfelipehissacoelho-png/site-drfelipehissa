# REVIEW 2026-08-20 — Anonimização LGPD estendida + pendências de cadastro

- **Data:** 2026-08-20
- **Autor:** Kimi
- **Escopo:** `analista_financeiro.html` — função `esquecerPaciente` (direito ao esquecimento) + registro de pendências reportadas pelo titular.

---

## 1. O que mudou na anonimização (esquecerPaciente)

| Antes | Depois |
|---|---|
| Cobria só `patients` + `lancamentos` | Cobre também `orcamentos`: nome → token anônimo **e CPF gravado no orçamento é removido** (`cpf=null`) |
| Log fire-and-forget antes da operação (se o log falhasse, a anonimização ia mesmo assim; se o update falhasse, o log já tinha gravado) | Log **dentro do mesmo update atômico** (`anexarLogAtualizacao`) — tudo-ou-nada, alinhado à regra do projeto "sem log, nada é modificado" |
| Texto do modal não refletia cobertura real | Modal agora lista exatamente o que é coberto e declara a limitação do log |

**Validação:** `node --check` OK; `git diff --check` limpo. Não testado em navegador/Firebase real.

## 2. Limitações que permanecem (documentadas, não escondidas)

1. **Log de auditoria é somente-acréscimo** (regra `!data.exists()`): registros antigos que citam o nome da paciente (ex.: "PAGAMENTO ORCAMENTO ... | Maria | ...") **não podem ser editados** sem mudança de regra. Fica como entrada no escopo do endurecimento de regras (executor Claude): permitir redação de campo específico em `log` ou aceitar a retenção como registro de tratamento, com justificativa LGPD.
2. **Campos livres** (`descricao`/`obs` de lançamentos, `notes` de pagamentos) podem conter o nome digitado manualmente — não é possível detectar com segurança; permanece fora do escopo automático.
3. **Vínculo por nome:** a localização dos registros da paciente é por nome exato (`trim`). Se o mesmo nome foi gravado com grafia diferente em algum registro, ele não é alcançado. Resolve-se de vez com `patient_id` (pendência estrutural).
4. O **registro da própria anonimização** cita o nome original de propósito — prestação de contas da operação, em log de acesso restrito aos dois usuários. Prática compatível com LGPD (base legal: cumprimento de obrigação legal/regulatória), mas fica registrada aqui para revisão.

## 3. Pendências registradas (pedido do titular, 2026-08-20)

> **Cadastro de pacientes:** remover o campo **RG** (não é necessário). O cadastro deve ter apenas **Nome, CPF e Data de Nascimento** — e **data de nascimento está faltando no fluxo de novo cadastro** (modal `newPatModal` / `abrirNovoPatOrc`).
> **Status:** REGISTRADO — não implementado nesta rodada.
> **Impacto ao implementar:** `newPatModal` (form de novo paciente), `editPatModal` (edição), `salvarNovoPatOrc`/`salvarEdicaoPaciente` (payload), `renderPacientes` (exibição) e a anonimização (campo `nascimento` a limpar). Decisão a tomar: manter RG no schema para registros antigos (só esconder da UI) ou remover de vez.

## 4. Fila conhecida atualizada (ordem de risco)

1. ~~Anonimização LGPD cobrindo orçamentos~~ → **feito nesta rodada** (ressalvas na seção 2)
2. Atomicidade de `salvarLancamento` (múltiplas escritas fire-and-forget)
3. `patient_id`/`case_id` nos orçamentos + migração dos antigos
4. Cadastro de pacientes: remover RG, adicionar data de nascimento (seção 3)
5. Decisão: Convênio/Parcelado no modal de pagamento de orçamento (fonte única `PAG_MEIOS`)
6. Endurecimento de regras RTDB — alça do executor Claude (aguardando proposta)
