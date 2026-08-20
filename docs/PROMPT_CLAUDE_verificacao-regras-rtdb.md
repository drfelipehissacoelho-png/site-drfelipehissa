# Prompt para o executor (Claude) — Verificação das regras RTDB e passivo histórico

> Versão 2 — atualizado em 2026-08-19 após a 1ª rodada, em que o executor rodou
> conectado a uma pasta de deploy (plana, sem `docs/`) e leu uma cópia antiga do
> código. Esta versão fixa o repositório correto e adiciona o ponto `/` vs
> `/consultorio` à matriz. Copie o bloco abaixo integralmente para o executor.

---

```text
Você é um executor de verificação. NÃO altere código, NÃO faça deploy de regras,
NÃO escreva no Firebase real e NÃO exponha dados pessoais. Sua tarefa é somente
VERIFICAR e REPORTAR evidências.

PASSO 0 — CONFIRME O REPOSITÓRIO (obrigatório antes de qualquer leitura)
O repositório correto é:
  C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa
Ele CONTÉM o subdiretório docs/ e o arquivo firebase.database.rules.unverified.json
na raiz. Se a pasta conectada não tiver subdiretórios (estrutura plana com vários
HTML soltos), você está numa pasta de deploy/build — PARE e peça para apontarem
para o repositório correto. NÃO use nenhuma cópia de analista_financeiro.html
fora deste repositório: a versão vigente é a da raiz deste repo, branch
feat/auditoria-analista-financeiro. Confirme no relatório qual pasta e qual
branch você efetivamente leu.

CONTEXTO
O projeto é o módulo financeiro do consultório (analista_financeiro.html +
Firebase Realtime Database). Existe uma baseline de regras NÃO VERIFICADA e um
roteiro de verificação já preparado. Leia, nesta ordem:

1. firebase.database.rules.unverified.json
   (cópia declarada pelo titular, procedência remota não confirmada)
2. docs/architecture/FIREBASE_RTD_RULES_VERIFICATION.md
   (roteiro do Rules Playground + matriz de evidência)
3. docs/architecture/FIREBASE_RTD_RULES_GAP.md
   (gaps documentados que precisam de confirmação comportamental)

TAREFA 1 — Rules Playground (simulações, SEM escrita real)
Execute o roteiro do FIREBASE_RTD_RULES_VERIFICATION.md no Rules Playground do
Firebase. Para cada um dos 6 caminhos abaixo, rode simulações de escrita que
devem ser PERMITIDAS e simulações que devem ser NEGADAS, conforme o roteiro:

  a) quote_payments/$id        (fluxo atômico de pagamentos)
  b) recorrentes/$id           (despesas recorrentes)
  c) lancamentos/$id           (lançamentos financeiros)
  d) orcamentos/$id/status     (mudança de status de orçamento)
  e) log/$novoId               (append de novo registro de auditoria)
  f) log/$idExistente          (tentativa de sobrescrever registro existente —
                              deve ser NEGADA se append-only estiver correto)

Para cada simulação registre: caminho, autenticado sim/não, operação,
resultado (allow/deny) e se o resultado é o ESPERADO pelo roteiro.

TAREFA 1b — RAIZ DAS REGRAS (item novo, obrigatório)
O app usa um ÚNICO listener .on('value') na raiz 'consultorio' — todo o estado
vem de ref('consultorio'). Verifique e registre na matriz:
  - As regras da baseline estão escritas em qual nó: "/" ou "/consultorio"?
  - Se estiverem em "/", elas casam com os caminhos que o app realmente usa
    (consultorio/lancamentos, consultorio/quote_payments etc.)?
  - Regras de LEITURA granulares por filho (ex.: negar read em
    consultorio/lancamentos para algum papel) quebrariam o listener único da
    raiz? Simule um read em "consultorio" com cada papel e registre o resultado.

TAREFA 2 — Passivo histórico (backup LOCAL, sem dados pessoais)
Peça ao titular o backup local do RTDB (JSON exportado) e produza APENAS
contagens:

  - quantos nós existem em quote_payments
  - quantos nós existem em recorrentes
  - quantos orcamentos possuem receitaGeradaId
  - quantos lancamentos possuem linked_pay_id
  - quantos orcamentos NÃO possuem nenhum quote_payment associado
    (candidatos a "passivo histórico" cujo status financeiro é só inferido)

NÃO liste nomes, CPFs, valores individuais nem qualquer dado pessoal —
somente as contagens agregadas.

TAREFA 3 — Relatório
Preencha a matriz de evidência do FIREBASE_RTD_RULES_VERIFICATION.md e responda
objetivamente:

  1. A baseline (firebase.database.rules.unverified.json) CONFERE com o
     comportamento observado no Playground? Para cada gap documentado em
     FIREBASE_RTD_RULES_GAP.md, diga: CONFIRMADO / NÃO CONFIRMADO / INCONCLUSIVO,
     com a evidência.
  2. As regras estão no nó correto ("/" vs "/consultorio")? O listener único
     da raiz sobrevive às regras de leitura?
  3. Existe passivo histórico relevante (orçamentos sem quote_payments)?
     Quantos?
  4. Liste qualquer divergência entre regras, código e documentação.

NOTA SOBRE ACHADOS ESTÁTICOS (não repita falsos alarmes)
A rodada anterior leu uma cópia antiga do código e reportou dois achados que já
foram reconciliados (ver docs/reviews/REVIEW_2026-08-19_resposta-verificacao-executor.md):
  - "lancamentos apagados com .remove()": o fluxo real é soft-delete com Lixeira;
    a função de hard delete era código morto e já foi removida.
  - "receitaGeradaId gravado como String e número": no arquivo vigente há uma
    única escrita e genId() retorna push key (sempre string).
Se encontrar esses padrões, verifique se não está lendo uma cópia desatualizada.

FORMATO DA RESPOSTA
- Confirmação do PASSO 0 (pasta + branch lidas).
- Tabela da matriz de evidência preenchida (incluindo TAREFA 1b).
- Contagens da Tarefa 2.
- Conclusão em até 10 linhas: baseline confere? regras no nó correto? qual o
  maior risco confirmado? o que deve ser priorizado?

RESTRIÇÕES
- Nenhuma escrita real no Firebase.
- Nenhum deploy de regras.
- Nenhum dado pessoal no relatório.
- Se algo não puder ser verificado, marque INCONCLUSIVO e explique o que falta.
```

---

## Notas para o titular

- O executor precisa estar conectado à pasta do **repositório** (caminho no PASSO 0), com acesso ao Console do Firebase (Rules Playground) e ao backup local do RTDB em JSON.
- O resultado esperado é a **matriz de evidência preenchida** (incluindo o ponto `/` vs `/consultorio`) + contagens + conclusão.
- Histórico: v1 gerada em 2026-08-19; v2 (esta) corrige o desvio de pasta da 1ª rodada e incorpora os falsos alarmes já reconciliados.
