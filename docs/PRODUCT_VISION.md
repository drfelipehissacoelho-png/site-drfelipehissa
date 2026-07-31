# Visão de Produto

## Estado atual do produto

O Analista Financeiro apoia a operação comercial e financeira de um consultório de cirurgia plástica. Hoje ele permite cadastrar pacientes, montar orçamentos, registrar lançamentos, controlar pagamentos, consultar DRE, manter preços hospitalares, gerar PDF e administrar custos internos.

O produto atende operação real, mas a auditoria identificou riscos que impedem tratá-lo como sistema financeiro confiável sem correções de integridade, segurança e modelagem.

## Objetivo de produto

Oferecer uma ferramenta operacional simples para que o consultório consiga transformar uma oportunidade comercial em orçamento, aceite, recebimento e acompanhamento financeiro sem perder contexto, duplicar dados ou expor custos internos ao paciente.

O sistema deve responder com clareza a quatro perguntas:

1. Qual proposta foi apresentada, em qual versão e para qual paciente?
2. Qual alternativa comercial foi escolhida e qual cirurgia/procedimento será realizado?
3. Quanto foi recebido, quanto falta receber e por quais meios?
4. Qual é a margem real, considerando taxas, equipe, comissão, materiais e custos hospitalares conforme a política definida?

## Princípios de produto

- operação rápida, porém com barreiras contra erro humano;
- informação comercial separada de financeiro realizado;
- custos internos nunca aparecem no PDF do paciente;
- busca rápida por paciente, proposta, procedimento e situação financeira;
- histórico rastreável sem depender de nomes livres;
- clareza entre dado salvo, pendente de sincronização e falha de gravação;
- uso adequado em notebook e celular.

## Visão de produto — ainda não implementada

As capacidades abaixo são visão futura, não descrição do código atual.

### Caso comercial e alternativas

Uma paciente poderá ter um `CommercialCase` com alternativas comparáveis, por exemplo: cirurgia A, cirurgia B ou combinação A+B. Cada alternativa terá itens, hospital, preço, validade, observações e comparação visual sem exigir que o operador recrie propostas desconectadas.

### Ciclo financeiro explícito

Orçamento, recebível, pagamento confirmado, estorno, crédito, receita, despesa e pass-through hospitalar terão estados e vínculos próprios. A DRE e o fluxo de caixa indicarão claramente a política usada: caixa, competência ou ambas.

### Margem confiável por procedimento

Custos de anestesista, instrumentadora, auxiliar, materiais, taxas e comissão serão vinculados à linha de procedimento e à regra aplicada naquele momento. Uma combinação de procedimentos não poderá usar silenciosamente apenas a configuração do primeiro item.

### Segurança operacional

Papéis de acesso, trilha de auditoria confiável, backups verificáveis e operações idempotentes reduzirão o risco de perda, fraude, duplicidade e alteração acidental.

## Não objetivos

- não substituir prontuário médico;
- não armazenar dados clínicos ou imagens médicas sem decisão específica de produto e segurança;
- não automatizar decisões médicas ou financeiras sem revisão humana;
- não converter visão futura em requisito implementado sem aprovação explícita.
