# Contexto do Projeto

## Fonte oficial

Este repositório é a fonte oficial do site do Dr. Felipe Hissa Coelho. Repositórios ou diretórios secundários podem conter backups e orientações antigas, mas não substituem este código.

Na criação desta documentação, a branch de trabalho era `feat/auditoria-analista-financeiro` e o remote oficial era `origin` para `github.com/drfelipehissacoelho-png/site-drfelipehissa`.

## Estrutura atual

O projeto é um site estático hospedável na Vercel. A configuração de deploy está em `vercel.json`. A raiz reúne páginas HTML de procedimentos, imagens e ativos estáticos, além dos diretórios `consultorio/`, `feliz-dia-das-maes/`, `img/` e `procedure_svgs_refinados/`.

O módulo operacional em escopo é `analista_financeiro.html`. Ele é um aplicativo monolítico com aproximadamente 6,5 mil linhas e cerca de 248 funções declaradas. HTML, CSS, JavaScript, regras financeiras, renderização, geração de PDF e acesso ao Firebase estão no mesmo arquivo.

## Analista Financeiro: estado atual

O módulo atende à operação diária de consultório para:

- orçamentos cirúrgicos e procedimentos estéticos;
- pacientes, lançamentos, DRE, relatórios e visão CFO;
- pagamentos parciais e múltiplas formas de pagamento;
- despesas automáticas de equipe, taxas de cartão e comissão;
- tabela hospitalar, recorrências, lixeira, auditoria, backup JSON e PDF.

Não é prontuário médico. Ainda assim, trata dados pessoais como nome, CPF, RG, telefone, e-mail, valores e histórico comercial/financeiro; portanto, LGPD e segurança são requisitos de produto.

## Dependências e persistência observadas

- Firebase Authentication e Firebase Realtime Database;
- Chart.js, jsPDF e jsPDF AutoTable carregados por CDN;
- dados sob a raiz RTDB `consultorio`, incluindo lançamentos, orçamentos, pagamentos, pacientes, configurações, procedimentos, preços hospitalares, logs e recorrências;
- armazenamento local do navegador apenas para funcionalidades de arquivos/PDF quando suportadas.

A cópia declarada das regras RTDB está preservada como não verificada em `firebase.database.rules.unverified.json` desde 2026-07-31. Não há `firebase.json`, `.firebaserc`, Cloud Functions, ambiente de homologação nem confirmação automática de que o arquivo corresponda ao ambiente remoto; os controles continuam sujeitos à auditoria específica.

## Base de decisão

Em 30 de julho de 2026 foi realizada auditoria estática, somente leitura, do arquivo `analista_financeiro.html`. O veredito foi: **não aprovar para uso financeiro diário antes das correções críticas**.

Os riscos prioritários são integridade de IDs, operações Firebase não atômicas, inconsistências entre orçamento/pagamento/DRE, despesas automáticas incompletas, recorrências concorrentes, recuperação de lixeira, backup, autorização e LGPD. O detalhamento deve ser mantido em `docs/reviews/`.

## Documentação oficial

- `PROJECT_RULES.md`: regras de mudança e segurança operacional;
- `PRODUCT_VISION.md`: estado atual e visão de produto explicitamente separada;
- `AI_TEAM.md`: protocolo para contribuições assistidas por IA;
- `CHANGELOG_AI.md`: registro de trabalho realizado por IA;
- `architecture/`: registros de arquitetura e decisões técnicas;
- `reviews/`: auditorias, revisões e planos de validação.
