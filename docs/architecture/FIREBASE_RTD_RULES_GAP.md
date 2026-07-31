# Lacuna de regras Firebase Realtime Database

**Estado verificado em:** 2026-07-31

## Fato observado

Este repositório não contém `firebase.json`, `.firebaserc`, exportação de regras RTDB, Cloud Functions ou outro artefato que permita verificar ou implantar a autorização do Firebase. Nenhuma regra remota foi lida ou alterada nesta fase.

## Consequência

As proteções presentes em `analista_financeiro.html` reduzem erros do cliente, mas não impedem outro cliente autenticado de escrever dados, sobrescrever eventos de auditoria ou contornar validações financeiras se as regras remotas não fizerem isso.

## Próximo passo autorizado necessário

Antes de versionar ou implantar regras, é necessário acesso somente leitura às regras RTDB efetivamente publicadas e uma decisão sobre papéis operacionais. A partir dessa referência, criar uma configuração versionada que trate, no mínimo:

- autenticação e escopo de leitura/escrita por papel;
- `log` append-only, sem sobrescrita nem remoção pelo cliente;
- integridade de relações entre orçamento, pagamento e lançamento;
- restrições para lixeira, purga e dados pessoais;
- validações de formato e chaves permitidas.

Este documento não é uma regra Firebase implantável e não presume que esses controles já existam no ambiente remoto.

## Efeito concreto da ausencia de regras verificaveis

Sem uma regra remota `append-only` para `log`, qualquer cliente autenticado que receba permissao de escrita no no pode sobrescrever ou apagar eventos. Nessa condicao, a trilha de auditoria nao e evidencia confiavel de quem alterou um dado ou quando a alteracao ocorreu.

As protecoes atualmente implementadas no cliente dependem de regras remotas para se tornarem obrigatorias:

- o `update()` multi-path de pagamento garante que a escrita aceita seja tudo-ou-nada, mas nao obriga outro cliente a registrar pagamento, receita, taxa e auditoria juntos;
- o bloqueio de sobrepagamento e validado na tela, portanto pode ser contornado por escrita direta se a regra for permissiva;
- lixeira, restauracao e purga possuem guardas no cliente, mas nao protegem contra exclusao ou alteracao direta de dados pessoais e financeiros;
- a idempotencia de recorrencias reduz duplicacao no caminho normal, mas nao substitui autorizacao nem validacao de schema no servidor.

Esta e uma lacuna de autoridade no backend, nao uma confirmacao de que o ambiente remoto esteja permissivo. As regras publicadas precisam ser obtidas em modo somente leitura antes de qualquer conclusao sobre a configuracao em producao.
