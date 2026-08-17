# Revisões e Auditorias

Esta pasta guarda relatórios de auditoria, revisões técnicas, planos de teste e registros de validação.

## Linha de base

Em 30 de julho de 2026 foi concluída auditoria estática, somente leitura, de `analista_financeiro.html`. A auditoria identificou riscos críticos de integridade financeira, operações Firebase, backup, LGPD, lixeira, pagamentos e modelagem de domínio.

Novos relatórios devem separar:

- fatos demonstrados pelo código ou teste;
- hipóteses a validar;
- recomendações;
- decisão tomada e responsável;
- evidência de correção e regressão.

## Processo permanente de revisao independente

Depois de toda nova funcionalidade, refatoracao importante ou mudanca estrutural, deve ser criado um arquivo chamado `REVIEW_YYYY-MM-DD_<tema>.md` nesta pasta.

Cada relatorio deve conter:

1. objetivo da alteracao;
2. arquivos modificados;
3. decisoes arquiteturais;
4. fluxo do usuario antes e depois;
5. beneficios;
6. possiveis riscos;
7. casos de teste executados;
8. limitacoes conhecidas;
9. perguntas especificas para revisao.

O relatorio e insumo para um revisor independente. Deve destacar alternativas possivelmente melhores, duvidas e riscos remanescentes. Sugestoes recebidas nao devem ser incorporadas sem autorizacao explicita do titular.
