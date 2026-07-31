# Regras Oficiais do Projeto

## Escopo e autoridade

1. Este repositório é a fonte oficial do site e do Analista Financeiro.
2. Arquivos de backup ou instruções antigas não prevalecem sobre este repositório sem autorização explícita do titular.
3. Alterações devem respeitar o escopo autorizado. Não modificar módulos não relacionados para resolver um problema local.

## Git e entrega

1. Antes de alterar arquivos, verificar repositório Git, `git status`, branch e remote.
2. Não executar `push`, `merge`, `checkout`, `reset` ou operações destrutivas sem autorização explícita.
3. Preservar alterações existentes de outros autores.
4. Toda mudança deve informar arquivos afetados, motivo, risco e validação realizada.
5. Atualizar `CHANGELOG_AI.md` quando uma IA efetivamente alterar documentação, código, testes ou configuração.

## Regras financeiras

1. Valores monetários devem ser tratados em centavos inteiros ou decimal exato; ponto flutuante não é fonte de verdade financeira.
2. Orçamento, recebível, pagamento, receita, despesa, taxa, estorno e crédito são conceitos distintos e não devem ser confundidos.
3. Nenhuma operação composta pode deixar receita, pagamento, comissão, taxa ou despesa automática em estado parcial.
4. Todo fluxo financeiro deve ser idempotente e seguro contra clique duplo, reconexão e dois usuários simultâneos.
5. Alterações em lançamentos, pagamentos, taxas, comissão e regras automáticas exigem teste com valores e resultados esperados.
6. Um orçamento aceito não deve ser tratado automaticamente como caixa recebido sem política contábil declarada.

## Firebase e segurança

1. Firebase Authentication não substitui autorização. Papéis e permissões devem ser aplicados no servidor/regras Firebase.
2. Não confiar em nome de usuário, e-mail, data/hora, ID ou log fornecidos pelo navegador como evidência forense.
3. Escritas relacionadas devem ser atômicas e aguardar confirmação do Firebase antes de mostrar sucesso, imprimir ou abrir o próximo fluxo.
4. Logs de auditoria devem ser append-only, usar horário confiável e não ser restaurados por sobrescrita.
5. Regras Firebase, configurações de segurança e qualquer backend devem ser versionados ou documentados para auditoria.
6. Não expor, registrar ou compartilhar dados pessoais em logs de desenvolvimento, capturas de tela ou documentos desnecessários.

## LGPD e dados pessoais

1. O sistema não é prontuário médico, mas contém dados pessoais e financeiros que exigem minimização, controle de acesso e retenção definida.
2. `patientId` estável deve prevalecer sobre associação por nome.
3. Direito ao esquecimento, anonimização, exportação e retenção devem abranger todos os nós relacionados, inclusive índices e logs, respeitada eventual obrigação legal de retenção.
4. Backups JSON e PDFs com dados pessoais devem ter armazenamento e acesso controlados.

## Qualidade e arquitetura

1. Separar gradualmente domínio financeiro, persistência Firebase, interface, PDF e relatórios.
2. Não modularizar por estética: cada extração precisa preservar comportamento e ter testes de regressão.
3. Funções puras de cálculo devem ser testáveis sem DOM nem Firebase.
4. Falhas devem ser visíveis ao operador; não usar sucesso otimista para operações financeiras críticas.
5. Funcionalidades futuras só entram após decisão explícita de produto e devem ser identificadas como visão, não como estado atual.

## Revisao independente obrigatoria

1. Apos concluir uma alteracao relevante - nova funcionalidade, refatoracao importante ou mudanca estrutural - criar um relatorio em `docs/reviews/` antes de solicitar ou incorporar sugestoes externas.
2. O nome obrigatorio e `REVIEW_YYYY-MM-DD_<tema>.md`, usando tema curto, descritivo e em minusculas com hifens.
3. O relatorio deve conter: objetivo da alteracao; arquivos modificados; decisoes arquiteturais; fluxo do usuario antes e depois; beneficios; possiveis riscos; casos de teste executados; limitacoes conhecidas; e perguntas especificas para revisao.
4. O objetivo do relatorio e facilitar revisao critica independente. Ele deve expor trade-offs, duvidas e pontos em que outra solucao pode ser melhor; nao deve ser uma justificativa da implementacao.
5. Apos gerar o relatorio, aguardar autorizacao explicita do titular antes de incorporar sugestoes do revisor independente.
