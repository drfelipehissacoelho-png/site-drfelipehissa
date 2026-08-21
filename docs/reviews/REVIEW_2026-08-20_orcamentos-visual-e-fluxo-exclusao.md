# REVIEW — Orçamentos: linguagem visual + fluxo de exclusão

**Data:** 2026-08-20 (noite, 4ª leva)
**Autor:** Kimi (front-end)
**Escopo:** apenas `analista_financeiro.html`. Nenhum dado, regra ou deploy tocado.

---

## 1. Motivação

1. Titular pediu a mesma linguagem visual dos Lançamentos na aba Orçamentos (referência: app "Finanças").
2. Bug de UX reportado com print: ao clicar na lixeira de um orçamento com pagamentos, um toast dizia "Exclua ou estorne os pagamentos antes de movê-lo para a lixeira" — sem dizer **onde** nem **como**. Titular: "ficou confuso o que fazer".

## 2. O que mudou

### 2.1 Fluxo de exclusão com pagamentos (`excluirOrcamento`)
- Toast → `showConfirm` informativo ("Orçamento com pagamentos", botão "Entendi"):
  - informa N pagamentos e o total R$;
  - orienta: excluir cada pagamento no histórico do próprio cartão (botão ✕), ali na aba Orçamentos;
  - explica o porquê (caixa e DRE continuam batendo).
- Regra de negócio **inalterada**: orçamento com pagamentos não vai para a lixeira (proteção de integridade mantida).

### 2.2 Cards de orçamento (`renderOrcamentos`)
- Procedimento com `_procDisplay()` (sem CAPS) + indicador "+N" quando há mais serviços.
- Badges financeiros em title case ("Pendente/Parcial/Quitado").
- Autor removido da linha de meta → `title` do cartão ("Criado por …", hover).
- Botões: `gBtn` ghost (branco, borda, texto muted) para secundários; sólidos só para Abrir/Aceitar/+ Pagar; 🗑 e ✗ Recusar em ghost com texto vermelho.

## 3. O que NÃO mudou

- Estrutura da página (form no topo, lista abaixo — já era vertical desde a Fase 4A).
- Lógica de status, filtros, busca, comparativo, pagamentos, PDF/impressão.
- Nenhuma mudança em dados ou Firebase.

## 4. Validação

- `node --check`: OK. `git diff --check`: limpo. Sem teste em navegador — validação visual do titular.

## 5. Riscos conhecidos

- O diálogo usa o modal de confirmação padrão (botões "Entendi" + "Cancelar"); o Cancelar simplesmente fecha — sem efeito colateral.
