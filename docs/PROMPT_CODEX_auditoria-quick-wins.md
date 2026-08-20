# Prompt para o Codex — Auditoria independente das melhorias de qualidade de vida

> Gerado em 2026-08-19. O Codex atua como **auditor independente e somente-leitura**
> das mudanças feitas por Kimi em `analista_financeiro.html`.
> Copie o bloco abaixo integralmente para o Codex.

---

```text
Você é um AUDITOR INDEPENDENTE de código. Sua tarefa é revisar criticamente um
conjunto de mudanças já implementadas, procurando bugs, regressões e riscos.
Você NÃO deve editar, corrigir ou "melhorar" nenhum arquivo — somente ler,
analisar e reportar. Se encontrar problemas, descreva-os; não os conserte.

PASSO 0 — CONFIRME O REPOSITÓRIO
Repositório: C:\Users\drfel\OneDrive\Documents\GitHub\site-drfelipehissa
Branch: feat/auditoria-analista-financeiro
As mudanças auditadas estão NÃO COMMITADAS na working tree. Para ver exatamente
o que mudou, rode:
  git diff -- analista_financeiro.html
Se a pasta conectada não tiver o subdiretório docs/ (estrutura plana com HTMLs
soltos), você está numa pasta de deploy — PARE e peça o repositório correto.
Confirme no relatório qual pasta e branch você leu.

CONTEXTO
analista_financeiro.html é um monólito HTML+CSS+JS (~7.400 linhas) com Firebase
Realtime Database. As mudanças sob auditoria foram feitas em 2026-08-19 e estão
documentadas em:
  - docs/reviews/REVIEW_2026-08-19_quick-wins-ux.md  (o que foi implementado)
  - docs/reviews/REVIEW_2026-08-19_megaavaliacao-ux-produto.md  (auditoria origem)
  - docs/reviews/REVIEW_2026-08-19_resposta-verificacao-executor.md
  - docs/CHANGELOG_AI.md  (entradas de 2026-08-19)

ESCOPO DA AUDITORIA — as 4 frentes de mudança:

1. CORREÇÕES P0
   - renderCFO: declaração de `const META=getMeta();` — confira se getMeta()
     existe, retorna o esperado e se não há outra referência indefinida na função.
   - Pacientes: editarPaciente com jsArg(p.patId); `id:pid` (sem `+`) em
     salvarEdicaoPaciente e esquecerPaciente; set(updated) com .then()/.catch().
     Confira se jsArg produz aspas válidas dentro do onclick e se pid é usado
     de forma consistente como chave string.
   - CSS: --txt, --card, .help-box — confira se os valores casam com o design
     e se não havia definição duplicada em outro lugar.
   - PAG_MEIOS/PAG_ICONS como fonte única: confira se TODOS os consumidores
     (payModal, conciliação, _pagIcon, relatórios) usam a constante ou se algum
     ficou com lista hardcoded divergente.
   - Remoção das opções 11x/12x do payParcelas: confira se nenhum código ainda
     trata 11x/12x (ex.: getTaxaPct) e se orçamentos antigos com 11x/12x salvos
     não quebram a renderização.
   - Taxa de split com linked_group_id + auto_generated: confira se a exclusão/
     estorno de pagamento encontra e trata essa taxa corretamente.
   - gerarPDFOrcamento com getClinica(): confira se todos os campos usados
     (medico, crm, especialidade, telefone, email, endereco) existem em
     DEFAULT_CLINICA e se não sobraram literais hardcoded no PDF.

2. ORÇAMENTOS BUSCA-FIRST (renderOrcamentos)
   - Sem busca: slice(0,5) + hint; com busca: ignora _orcStatusFilter.
   - Procure: ordenação aplicada ANTES do slice? contadores das tabs ficam
     consistentes? o hint aparece nos casos certos? busca vazia vs. espaços?

3. COMPARATIVO DE PROPOSTAS (toggleCompararOrc, renderCompareBar, abrirComparacao,
   gerarPDFComparativo, modal #compareModal)
   - jsPDF: confira se `const{jsPDF}=window.jspdf` está presente antes de
     `new jsPDF(...)` (jsPDF NÃO é global neste arquivo).
   - _salvarPdfBlob recebe doc.output('blob') (Blob), não o doc.
   - autoTable em landscape: larguras de coluna, quebra de "Procedimentos"
     (string com \n), finalY antes de escrever o rodapé.
   - Escaping: nomes de paciente/procedimento com aspas ou HTML nos onclicks
     e no innerHTML.
   - Estado _orcCompare: persiste entre renders? limpa ao trocar de aba?
     comportamento ao excluir um orçamento selecionado?
   - ESC fecha o modal (modalFns)? display flex/none consistente com os
     demais modais?

4. CHIPS DE HOSPITAL (hospChips, addHospRowProc, renderHospRows)
   - Chips computados antes do early-return de tabela vazia.
   - Escaping de aspas simples no onclick de addHospRowProc.
   - Interação com updateHospSelect (auto-fill do custo) e validarHospitaisDoOrcamento.
   - Ao remover item do orçamento, o chip/linha correspondente se atualiza?

VERIFICAÇÕES TRANSVERSAIS
   - Rode: node --check no script inline extraído (ou new Function()) e
     git diff --check. Reporte o resultado.
   - Procure no diff por: variáveis não declaradas, funções chamadas mas
     inexistentes, ids de DOM referenciados mas ausentes no HTML, template
     literals quebrados, e handlers inline com escaping incorreto.
   - Confira se alguma mudança grava caminho novo no Firebase RTDB (não
     deveria haver nenhum — o endurecimento de regras está sendo feito em
     paralelo por outro agente e depende dessa invariante).

FORMATO DA RESPOSTA
- Confirmação do PASSO 0 (pasta + branch + hash do diff).
- Tabela de achados: Severidade (P0 quebra / P1 risco / P2 qualidade) | Local
  (função/linha) | Descrição | Evidência (trecho de código).
- Veredito por frente (1–4): APROVADO / APROVADO COM RESSALVAS / REPROVADO.
- Resposta explícita: o diff introduz algum caminho novo de escrita no RTDB?
- Conclusão em até 8 linhas: as mudanças estão aptas para commit?

RESTRIÇÕES
- NÃO edite arquivos. NÃO faça commit. NÃO execute o app contra o Firebase real.
- Se não puder verificar algo (ex.: comportamento visual em navegador), marque
  como NÃO VERIFICÁVEL e diga o que falta — não presuma.
```

---

## Notas para o titular

- O Codex precisa estar conectado ao **repositório** (mesmo caminho do PASSO 0), branch `feat/auditoria-analista-financeiro`. Como as mudanças ainda não foram commitadas, ele audita a working tree via `git diff`.
- O ponto mais sensível da auditoria é a **invariante do RTDB**: se o Codex confirmar "nenhum caminho novo de escrita", o Claude pode endurecer as regras em paralelo com segurança.
- Se o Codex reprovar algo, me devolva a tabela de achados que eu corrijo antes do commit.
