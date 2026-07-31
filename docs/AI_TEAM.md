# Protocolo da Equipe de IA

## Missão

Qualquer IA que trabalhe neste repositório deve priorizar integridade financeira, segurança, LGPD, continuidade operacional e reversibilidade. Velocidade de entrega não justifica alterar ou inferir dados financeiros.

## Leitura obrigatória antes de atuar

1. `docs/PROJECT_CONTEXT.md`;
2. `docs/PROJECT_RULES.md`;
3. `docs/PRODUCT_VISION.md`;
4. registros relevantes em `docs/reviews/` e `docs/architecture/`;
5. estado atual do Git.

## Protocolo de trabalho

1. Confirmar o escopo pedido pelo usuário.
2. Inspecionar o repositório antes de editar e preservar mudanças existentes.
3. Distinguir claramente fato demonstrado, inferência e recomendação.
4. Para alterações financeiras, mapear origem do dado, persistência, cálculo, relatório, PDF, lixeira, backup e auditoria.
5. Fazer a menor mudança que resolva o problema autorizado.
6. Validar com testes proporcionais ao risco e informar resultados reais.
7. Atualizar documentação e `CHANGELOG_AI.md` após mudanças efetivas.
8. Ao concluir mudanca relevante, gerar relatorio para revisao independente conforme `PROJECT_RULES.md`.

## Papéis de análise esperados

Uma revisão relevante do Analista Financeiro deve considerar, no mínimo:

- arquitetura de software;
- auditoria de sistemas financeiros;
- Firebase, autenticação e concorrência;
- segurança e LGPD;
- UX de operação de consultório;
- visão de CFO para margem, recebimento, custos e DRE.

Esses papéis são perspectivas de análise, não autorização para ampliar escopo.

## Regras de implementação

- Não realizar push, merge, checkout ou mudança de branch sem autorização.
- Não tocar em módulos fora do escopo sem autorização.
- Não usar dados reais de pacientes como massa de teste.
- Não criar falso sucesso para gravações assíncronas.
- Não introduzir `eval`, HTML não escapado, credenciais, logs com dados pessoais ou permissões client-side como única proteção.
- Não declarar auditoria, backup ou anonimização como concluídos sem cobrir todos os dados relacionados.

## Padrão de entrega

Toda entrega deve informar:

1. resultado objetivo;
2. arquivos alterados;
3. comportamento preservado ou modificado;
4. riscos remanescentes;
5. testes executados e resultado;
6. pendências que exigem decisão do titular.

## Relatorio para revisao independente

Apos nova funcionalidade, refatoracao importante ou mudanca estrutural, criar `docs/reviews/REVIEW_YYYY-MM-DD_<tema>.md` com:

1. objetivo da alteracao;
2. arquivos modificados;
3. decisoes arquiteturais;
4. fluxo do usuario antes e depois;
5. beneficios;
6. possiveis riscos;
7. casos de teste executados;
8. limitacoes conhecidas;
9. perguntas especificas para revisao.

O relatorio deve ser critico e verificavel. Sempre indicar onde uma alternativa pode ser superior ou onde faltam evidencias. Depois de criado, nao incorporar sugestoes de revisao sem autorizacao explicita do titular.
