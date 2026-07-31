# Arquitetura

Esta pasta guarda registros de arquitetura, decisões técnicas e diagramas que descrevem o sistema como ele existe e as mudanças aprovadas.

## Estado atual resumido

O Analista Financeiro está concentrado em `analista_financeiro.html`, com estado global no navegador, Firebase RTDB como persistência e bibliotecas externas para gráficos e PDF. A separação entre interface, domínio financeiro e persistência ainda não existe.

Registros futuros nesta pasta devem identificar data, decisão, contexto, alternativas consideradas, impacto em dados existentes e plano de reversão.

## Identificadores temporários e persistentes

No estado atual, `genId()` produz chaves `push()` do Firebase RTDB tanto para entidades persistidas quanto para linhas temporárias da interface de orçamento. A escolha mantém compatibilidade imediata e evita colisões, mas acopla o estado transitório da UI ao mecanismo de persistência. Em uma modularização aprovada, avaliar separar `genPersistentId()` de `genUiId()`, com inventário dos handlers inline e compatibilidade para dados legados.
## Lacuna de regras RTDB

- [FIREBASE_RTD_RULES_GAP.md](FIREBASE_RTD_RULES_GAP.md): ausência confirmada de regras RTDB versionadas neste repositório; descreve o limite da proteção atual e o pré-requisito para auditoria/implantação remota.

## Arredondamento monetario e valores negativos

Os valores permanecem em `Number`, persistidos com duas casas, enquanto nao houver migracao aprovada para centavos inteiros. `arredondarCentavos()` protege entradas finitas e casos de notacao exponencial, mas `Math.round()` nao e simetrico para meios centavos negativos. O fluxo atual usa valores nao negativos; **estorno, credito ou ajuste negativo nao devem reutilizar esta regra sem uma politica explicita de arredondamento assinado** ou, preferencialmente, uma representacao integral em centavos.

A futura decisao deve registrar: direcao de arredondamento, tratamento de taxa e desconto negativos, compatibilidade de dados legados e testes de reconciliacao entre totais exibidos e persistidos.
