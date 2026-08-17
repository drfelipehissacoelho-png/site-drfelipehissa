# Verificação da procedência das regras RTDB

**Status:** pendente de execução manual no ambiente Firebase publicado.

Este roteiro não altera dados nem publica regras. Seu objetivo é confirmar se `firebase.database.rules.unverified.json` descreve as regras efetivamente publicadas antes de derivar qualquer proposta de autorização.

## 1. Backup local do módulo

1. Na tela do Analista Financeiro, exporte um backup JSON novo.
2. Abra-o localmente; não envie o arquivo para a conversa, pois contém dados pessoais e financeiros.
3. Registre somente as contagens: `quote_payments`, `recorrentes`, `orcamentos` com `receitaGeradaId` e `lancamentos` com `linked_pay_id`.

Sinal esperado caso a baseline seja a regra publicada: `quote_payments` e `recorrentes` vazios, apesar de receitas ou orçamentos marcados como aceitos/pagos.

## 2. Rules Playground no Console Firebase

No Rules Playground, simule escritas com o e-mail do médico e o da secretária. Não execute escritas reais. Use chaves de teste, por exemplo `teste-fase3`, e registre somente allow/deny.

| Caminho simulado | Resultado previsto pela baseline não verificada |
| --- | --- |
| `consultorio/quote_payments/teste-fase3` | deny para ambos |
| `consultorio/recorrentes/teste-fase3` | deny para ambos |
| `consultorio/lancamentos/teste-fase3` | allow para ambos |
| `consultorio/orcamentos/teste-fase3/status` | allow para ambos |
| `consultorio/log/teste-fase3` em nó novo | allow para ambos |
| `consultorio/log/<id-existente>` | deny para ambos |

## 3. Registro de evidência

| Data | Cenário | Médico | Secretária | Confere com baseline? | Observação sem dados pessoais |
| --- | --- | --- | --- | --- | --- |
| pendente | `quote_payments` |  |  |  |  |
| pendente | `recorrentes` |  |  |  |  |
| pendente | `lancamentos` |  |  |  |  |
| pendente | `orcamentos/status` |  |  |  |  |
| pendente | `log` novo |  |  |  |  |
| pendente | `log` existente |  |  |  |  |

## Decisão após a verificação

- Se a tabela coincidir, a baseline passa a ser referência comportamental confirmada e a correção das regras é tratada como indisponibilidade de produção.
- Se qualquer linha divergir, a baseline deve permanecer não verificada e nenhuma regra nova deve ser proposta até obter a configuração real publicada.

