# Changelog de Trabalho Assistido por IA

Este arquivo registra mudanças efetivamente realizadas por IA neste repositório. Não substitui histórico Git, auditoria financeira ou logs do sistema.

## 2026-07-30 - Correcoes N1 e N2 da 2a rodada de revisao independente

### Alterado

- `analista_financeiro.html`: `dataParaTimestamp()` passou a testar o formato pt-BR explicito antes de `Date.parse()`. O parser legado do V8 aceita `MM/DD/YYYY`, entao datas historicas com dia menor ou igual a 12 eram lidas com dia e mes invertidos (`06/07/2026` virava 7 de junho), o que reintroduzia ordenacao incorreta na trilha de auditoria.
- `analista_financeiro.html`: removido `\r` isolado na linha 6650 (`imprimirOrcamentoRapido`), em arquivo com terminador LF.

### Validado

- Sintaxe do script inline: aprovado.
- `dataParaTimestamp()`: 8/8 casos aprovados, incluindo `06/07/2026 14:30` (6 de julho), `12/01/2026` (12 de janeiro), `01/12/2025 09:05` (1 de dezembro), ISO, numero, string invalida e `null`.
- `compararLogsRecentes()`: ordenacao correta em conjunto misto de `dataServidor`, ISO e pt-BR legado.
- `git diff --check` em `analista_financeiro.html`: limpo.

### Registrado

- Correcoes aplicadas pelo revisor independente a pedido do titular, com escopo limitado aos itens N1 e N2 de `docs/reviews/REVIEW_2026-07-30_revisao-independente-fase-1-rodada-2.md`.
- Nenhum push, merge ou commit foi executado.
- Os arquivos `*.svg` modificados no working tree sao anteriores a Fase 1 e nao devem entrar neste commit.

## 2026-07-30 - Processo permanente de engenharia e revisao

### Alterado

- `PROJECT_RULES.md`: instituido relatorio obrigatorio de revisao independente para mudancas relevantes.
- `AI_TEAM.md`: adicionado protocolo de geracao do relatorio e pausa antes de incorporar sugestoes externas.
- `reviews/README.md`: documentado nome, conteudo obrigatorio e finalidade de `REVIEW_YYYY-MM-DD_<tema>.md`.

### Registrado

- A IA atua como arquiteto tecnico principal, responsavel por arquitetura, implementacao, revisao tecnica, seguranca, testes, modelagem de dados e integridade financeira.
- Um segundo revisor independente avaliara os relatorios produzidos.
- Nenhuma sugestao externa sera incorporada sem autorizacao explicita do titular.

## 2026-07-30 — Baseline de documentação oficial

### Adicionado

- Estrutura `docs/`, `docs/architecture/` e `docs/reviews/`.
- `PROJECT_CONTEXT.md`, com escopo oficial, estrutura atual e contexto do Analista Financeiro.
- `PROJECT_RULES.md`, com regras de Git, finanças, Firebase, segurança, LGPD e qualidade.
- `PRODUCT_VISION.md`, separando estado atual de visão futura.
- `AI_TEAM.md`, com protocolo de atuação assistida por IA.
- Arquivos de índice para arquitetura e revisões.

### Registrado

- Auditoria estática e somente leitura de `analista_financeiro.html`.
- Veredito da auditoria: não aprovar o módulo para uso financeiro diário antes das correções críticas.
- Nenhum código de produção, configuração de deploy, dado Firebase ou módulo externo foi alterado nesta etapa.

## 2026-07-30 — Fase 1: integridade crítica do Analista Financeiro

### Alterado

- `analista_financeiro.html`: substituído o ID numérico inseguro por chave `push()` do Firebase; ajustados handlers para IDs string e numéricos legados.
- `analista_financeiro.html`: orçamento novo e edição de orçamento agora aguardam confirmação e incluem auditoria no mesmo `update()` multi-path.
- `analista_financeiro.html`: salvar e imprimir, PDF e salvar e pagar aguardam a confirmação do orçamento.
- `analista_financeiro.html`: pagamentos, receita vinculada, taxa de cartão, status e auditoria passam a ser gravados em um único `update()`; sobrepagamento sem crédito explícito é bloqueado.
- `analista_financeiro.html`: exclusão de pagamento é sempre em cascata lógica e atômica para os lançamentos vinculados.
- `analista_financeiro.html`: implementadas restauração e purga de orçamento; a purga é bloqueada quando existem pagamentos vinculados.
- `analista_financeiro.html`: validação e seletor hospitalar restringem procedimento hospitalar aos procedimentos do orçamento em salvar, PDF rápido e impressão rápida.
- `analista_financeiro.html`: corrigida data local de campos `date`; backup inclui recorrências; restauração não sobrescreve auditoria.
- `docs/reviews/REVIEW_2026-07-30_fase-1-integridade-critica.md`: criado relatório para revisão independente.

### Validado

- Estrutura das tags `script`, sintaxe do script inline, testes puros de regras hospitalares/data/IDs e `git diff --check` aprovados.

### Deliberadamente pendente

- Regras Firebase, validação de servidor, transações concorrentes de saldo, migração para centavos e política de despesas automáticas em pagamento parcial exigem fase e decisão específicas.

## 2026-07-30 — Correções do parecer independente da Fase 1

### Alterado

- `analista_financeiro.html`: ordenação de logs e orçamentos passou a usar timestamps (`dataServidor`, `criadoEm` e fallbacks legados), não subtração de IDs Firebase string.
- `analista_financeiro.html`: totais persistidos de orçamento, PDF rápido, impressão rápida e resumo da tela são arredondados a centavos; a tolerância de pagamento foi alinhada a R$ 0,01.
- `analista_financeiro.html`: mover orçamento para lixeira e purgar usam a mesma proteção para qualquer pagamento vinculado, inclusive pagamento excluído logicamente.
- `analista_financeiro.html`: status do orçamento e seu evento de auditoria passam a usar o mesmo `update()` multi-path.
- `analista_financeiro.html`: contratos de backup para exportação e restauração agora são listas explícitas e distintas; `log` continua exportado, mas não é restaurado.
- `analista_financeiro.html`: removido o corpo inalcançável do fluxo legado de geração direta de receita; pagamentos seguem como fluxo financeiro disponível.
- `analista_financeiro.html`: `jsArg()` documenta seu contexto permitido e rejeita ID ausente em vez de convertê-lo para string vazia.
- `docs/architecture/README.md`: registrada a dívida técnica de usar a chave Firebase também para IDs temporários de UI.
- `docs/reviews/REVIEW_2026-07-30_correcao-parecer-fase-1.md`: criado relatório para nova revisão independente.

### Validado

- Sintaxe do único script inline via `node --check`.
- 10 testes puros para arredondamento, tolerância de pagamento, ordenação, fallbacks legados, vínculos de pagamento e serialização de IDs.

### Deliberadamente pendente

- Regras RTDB, validação no servidor, transação concorrente de saldo, política de crédito e migração integral de valores para centavos inteiros continuam fora deste lote.
## 2026-07-31 — Fase 2: integridade de recorrências e falhas visíveis

### Alterado

- `analista_financeiro.html`: cada recorrência passou a usar chave determinística por recorrência/período e um único `dbRef.update()` para lançamento, `ultimoPeriodoGerado` e evento de auditoria.
- `analista_financeiro.html`: lançamentos recorrentes soft-deleted continuam sendo reconhecidos, impedindo recriação automática silenciosa.
- `analista_financeiro.html`: geração de recorrências é sequencial por período e protegida contra reentrada no mesmo cliente; sucesso só é informado após confirmação Firebase.
- `analista_financeiro.html`: `renderAll()` exibe erro ao operador na primeira falha por área e volta a permitir aviso se a área se recuperar e falhar novamente.
- `analista_financeiro.html`: `TOLERANCIA_CENTAVO` substitui os literais financeiros duplicados; `arredondarCentavos()` foi corrigido para casos como R$ 1.250,995.
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`: registrada a ausência de regras RTDB versionadas e o limite de não presumir controles remotos.

### Validado

- 10/10 testes de recorrência e arredondamento, com RTDB simulado.
- 3/3 testes de falha visível em `renderAll()`.
- 9/9 testes de datas legadas e ordenação mista de logs.
- Sintaxe do script inline e `git diff --check` aprovados.

### Deliberadamente pendente

- Regras RTDB remotas, append-only garantido no servidor, concorrência de pagamentos entre operadores, entidade de crédito e política de comissão/equipe exigem decisão de produto ou acesso ao ambiente Firebase.

## 2026-07-31 - Correcoes do parecer independente da Fase 2

### Alterado

- `analista_financeiro.html`: `arredondarCentavos()` passou a proteger a saida contra `NaN` em notacao exponencial, preservando o comportamento normal para valores financeiros usuais.
- `analista_financeiro.html`: o log de recorrencia voltou a usar `criarEventoLog()` com chave `push()`; a chave deterministica permanece exclusivamente no lancamento financeiro idempotente.
- `analista_financeiro.html`: `renderAll()` agrega falhas novas em um unico aviso com nomes de tela e isola falha do proprio `showToast()`.
- `analista_financeiro.html`: alterar a frequencia de uma recorrencia zera `ultimoPeriodoGerado`; validacao de chave RTDB cobre controles ASCII e o limite de 768 bytes.
- `docs/architecture/README.md`: registrada a limitacao de arredondamento para futuros valores negativos.
- `docs/architecture/FIREBASE_RTD_RULES_GAP.md`: explicitado que atomicidade no cliente nao equivale a obrigatoriedade no servidor e que auditoria sem append-only nao e evidencia confiavel.

### Validado

- Compilacao do unico script inline com `new Function()`.
- Suite local de cenarios para arredondamento, chaves RTDB, escrita atomica recorrente, troca de frequencia e falhas agregadas de renderizacao.
- `git diff --check` para os arquivos alterados.

### Deliberadamente pendente

- Politica de arredondamento assinado e migracao para centavos inteiros; regras RTDB publicadas, autorizacao, validacao de schema e concorrencia de pagamentos permanecem fora deste lote.

## 2026-07-31 — Fase 3: baseline de regras RTDB

### Adicionado

- `firebase.database.rules.unverified.json`: cópia declarada pelo titular, marcada como não verificada até confirmação comportamental; nenhuma implantação foi executada.
- `docs/reviews/REVIEW_2026-07-31_fase-3-baseline-regras-rtdb.md`: revisão do cruzamento entre regras e caminhos gravados pelo módulo.

### Confirmado

- `quote_payments` e `recorrentes` não têm regra de escrita e negam, respectivamente, o fluxo atômico de pagamentos e os fluxos de recorrências.
- A leitura concedida em `consultorio` expõe toda a árvore aos dois usuários autorizados, inclusive custos e dados administrativos.
- `log/$logId` é append-only, mas não possui validação de autoria ou vínculo obrigatório com a operação registrada.

### Deliberadamente pendente

- Proposta de regras por papel, validações de dados, testes em ambiente isolado e qualquer deploy remoto aguardam revisão independente e autorização explícita.

## 2026-07-31 — Correções do parecer independente da Fase 3

### Alterado

- A baseline foi renomeada para `firebase.database.rules.unverified.json` para não sugerir que sua procedência remota esteja confirmada.
- `FIREBASE_RTD_RULES_GAP.md` passou a registrar a restauração de backup negada, o risco de indisponibilidade após a atomicidade da Fase 1, o passivo histórico possível, a escrita destrutiva no nível de coleção e a autoria forjável em `log`.
- `FIREBASE_RTD_RULES_VERIFICATION.md` adiciona roteiro e matriz de evidência para Rules Playground e backup local, sem escrita real nem dados pessoais.
- `REVIEW_2026-07-31_correcao-parecer-fase-3.md` registra os limites e as perguntas abertas desta rodada.

### Deliberadamente pendente

- Confirmar a baseline contra as regras publicadas; propor permissões por papel; reconciliar eventuais pagamentos históricos; testar regras em ambiente isolado; e publicar qualquer regra remota.

## 2026-08-19 — Megaavaliação UX/produto + quick wins no analista_financeiro.html

### Adicionado

- `docs/reviews/REVIEW_2026-08-19_megaavaliacao-ux-produto.md`: auditoria A–I com achados P0–P3, fluxos, respostas do titular e roadmap.
- `docs/reviews/REVIEW_2026-08-19_quick-wins-ux.md`: relatório de implementação das correções e melhorias.
- `docs/PROMPT_CLAUDE_verificacao-regras-rtdb.md`: prompt para executor independente verificar a baseline de regras RTDB (Rules Playground, sem escrita real) e o passivo histórico (contagens do backup local, sem dados pessoais).
- Comparativo de propostas: seleção de 2–3 orçamentos (botão ⇄), barra de seleção, modal lado a lado e PDF comparativo em landscape A4 com dados de `getClinica()`.
- Chips de atalho de custo hospitalar por procedimento (`addHospRowProc`) — um clique cria a linha já vinculada ao procedimento do orçamento.

### Alterado

- `renderCFO`: `META` declarado (aba CFO volta a funcionar).
- Pacientes: `editarPaciente` com `jsArg`; `id:pid` (sem `+`) em edição e anonimização; `salvarEdicaoPaciente` com `.then()/.catch()` (fim do falso sucesso).
- CSS: `--txt`, `--card` e `.help-box` definidos.
- Pagamentos: `PAG_MEIOS`/`PAG_ICONS` como fonte única (TED/Cheque entram na conciliação); opções 11x/12x removidas do payModal; taxa de split grava `linked_group_id` + `auto_generated:true`; `fbAddLog('UI',...)` removido de `addProcLanc`.
- `gerarPDFOrcamento`: cabeçalho e rodapé passam a usar `getClinica()`.
- Orçamentos: busca-first — sem busca, só os 5 mais recentes com hint; com busca, varre todos os status com contagem.

### Validado

- `node --check` no script inline extraído (sintaxe OK após cada fase).
- `git diff --check` limpo (232 inserções, 26 remoções em `analista_financeiro.html`).
- Autorrevisão de integração: destruturação de `window.jspdf`, `_salvarPdfBlob` recebendo Blob, helpers existentes confirmados.

### Deliberadamente pendente

- Teste em navegador e contra o Firebase real (não executado neste lote).
- `patient_id`/`case_id` em orçamentos + migração; atomicidade de `salvarLancamento`; anonimização LGPD cobrindo `orcamentos`/`log`; segregação de visões médico vs secretária; verificação das regras RTDB e reconciliação do passivo histórico (aguardam o relatório do executor).
- Nenhum commit/push/deploy realizado, conforme restrição do titular.

## 2026-08-19 — Resposta à verificação do executor (regras RTDB)

### Adicionado

- `docs/reviews/REVIEW_2026-08-19_resposta-verificacao-executor.md`: reconciliação do relatório do executor independente com o estado real do repositório.

### Confirmado

- O executor rodou conectado a uma pasta plana (deploy/build), não ao repositório — todos os arquivos de entrada existem em `site-drfelipehissa`; o REVIEW dele não está neste repo.
- D3 parcialmente confirmado: `fbExcluirLanc` (`.remove()` em lancamentos) era código morto sem chamadores — o fluxo real já é soft-delete com Lixeira; `recorrentes` tem hard delete real, mitigado por log prévio, confirmação e restrição ao titular.
- D4 não confirmado no arquivo atual: `receitaGeradaId` tem escrita única e `genId()` retorna push key (string); leituras tolerantes a tipo. O padrão citado pelo executor pertence a uma cópia antiga fora do repositório.
- Listener único na raiz `consultorio` confirmado (já P1 na megaavaliação); baseline escrita para `/` vs `/consultorio` entra na matriz de evidência da rerodagem.

### Alterado

- `analista_financeiro.html`: removida `fbExcluirLanc` (hard delete morto). `node --check` e `git diff --check` OK.

### Deliberadamente pendente

- Rerodagem das TAREFAS 1–3 pelo executor apontado ao repositório correto; soft-delete de recorrentes; reconciliação do passivo histórico.

### Alterado (prompt v2)

- `docs/PROMPT_CLAUDE_verificacao-regras-rtdb.md`: v2 com PASSO 0 (confirmação do repositório correto e branch), TAREFA 1b (regras em "/" vs "/consultorio" e impacto no listener único) e nota anti-falso-alarme sobre D3/D4 já reconciliados.

### Adicionado (governança multi-agente)

- `docs/PROMPT_CODEX_auditoria-quick-wins.md`: prompt de auditoria independente (somente-leitura) para o Codex revisar as mudanças de 2026-08-19 via `git diff`, com veredito por frente e checagem da invariante "nenhum caminho novo de escrita no RTDB" (protege o endurecimento de regras em paralelo pelo executor Claude).

## 2026-08-20 — Resposta à execução do executor + guardas V3/V4 + script de contagens

### Adicionado

- `docs/reviews/REVIEW_2026-08-20_resposta-execucao-rules-e-guardas.md`: análise do relatório do executor (baseline 6/6 estática, procedência pendente, risco V1+V2) e sequência acordada para o endurecimento.
- `tools/contar_passivo_rtdb.js`: script somente-leitura que produz as 5 contagens agregadas da TAREFA 2 + sinal de procedência (quote_payments vazio com orçamentos aceitos ⇒ baseline publicada). Testado com dados sintéticos.

### Alterado

- `importarJSON()`: guarda de titular antes de ler o arquivo (V4 — BACKUP_RESTORE_NODES inclui 6 nós médico-only; secretária disparava operação condenada a falhar em bloco).
- `excluirRecorrente()`: log de exclusão passa a carregar a definição completa do template (V3 — hard delete mantido como decisão intencional documentada no código; trilha agora permite recriar o template).

### Validado

- `node --check` no script inline e no script de contagens; `git diff --check` limpo. Sem teste em navegador/Firebase real.

### Deliberadamente pendente

- Procedência das regras (Playground) e passivo histórico aguardam o backup exportado pelo titular; endurecimento de regras só após (B) fechar — alça do executor Claude.

## 2026-08-20 — Correções da auditoria de quick wins

### Alterado

- analista_financeiro.html: comparativo usa hospRows com fallbacks legados; recusa orçamentos de pacientes diferentes e remove seleção inativa/lixeira.
- analista_financeiro.html: chips hospitalares usam jsArg() e sincronizam linhas temporárias quando um procedimento é removido ou trocado.
- analista_financeiro.html: crédito histórico acima de 10 parcelas preserva a taxa existente em vez de aplicar a taxa de 10x; meios de pagamento passam a derivar de PAG_MEIOS.
- analista_financeiro.html: edição de paciente e respectivo evento de auditoria passam a usar o mesmo dbRef.update().
- docs/reviews/REVIEW_2026-08-20_correcoes-auditoria-quick-wins.md: relatório para revisão independente desta rodada.

### Validado

- Sintaxe dos 7 scripts inline, git diff --check e testes isolados de total hospitalar, limpeza de seleção, taxa 11x/12x, sincronização hospitalar, jsArg() e meios de pagamento.

### Deliberadamente pendente

- Teste visual em navegador/PDF e qualquer operação contra Firebase real; modelagem por patient_id/CommercialCase; migração de registros legados; commit, push e deploy.
