// contar_passivo_rtdb.js — Contagens agregadas do backup RTDB (passivo histórico)
//
// Uso:   node tools/contar_passivo_rtdb.js <caminho-do-backup.json>
//
// Produz APENAS contagens agregadas (TAREFA 2 do prompt de verificação).
// Nenhum nome, CPF, valor individual ou dado pessoal é impresso.
// Nada é escrito em lugar nenhum — script somente-leitura.
//
// Aceita tanto o backup v2 exportado pelo app (nós no topo do JSON)
// quanto um export bruto do Console (com wrapper "consultorio").

const fs = require('fs');

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node tools/contar_passivo_rtdb.js <caminho-do-backup.json>');
  process.exit(1);
}

let bruto;
try {
  bruto = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
} catch (e) {
  console.error('Erro ao ler/parsear o JSON: ' + (e.message || e));
  process.exit(1);
}

// Desembrulha: aceita {consultorio:{...}} ou os nós no topo
const raiz = bruto.consultorio && typeof bruto.consultorio === 'object' ? bruto.consultorio : bruto;

const norm = obj => {
  if (!obj) return {};
  if (Array.isArray(obj)) { const o = {}; obj.forEach(x => { if (x && x.id != null) o[x.id] = x; }); return o; }
  return obj;
};

const quotePayments = norm(raiz.quote_payments);
const recorrentes   = norm(raiz.recorrentes);
const orcamentos    = norm(raiz.orcamentos);
const lancamentos   = norm(raiz.lancamentos);

const orcAtivos = Object.values(orcamentos).filter(o => o && !o.deletedAt);
const paysAtivos = Object.values(quotePayments).filter(p => p && !p.deletedAt);

const orcComReceita  = orcAtivos.filter(o => o.receitaGeradaId).length;
const lancComPayId   = Object.values(lancamentos).filter(l => l && !l.deletedAt && l.linked_pay_id).length;
const orcComPay      = new Set(paysAtivos.map(p => String(p.quote_id)));
const orcSemPayment  = orcAtivos.filter(o => !orcComPay.has(String(o.id))).length;
const orcAceitos     = orcAtivos.filter(o => (o.status || 'aberto') === 'aceito').length;

console.log('=== Contagens agregadas do backup RTDB ===');
console.log('nós em quote_payments ................: ' + Object.keys(quotePayments).length);
console.log('nós em recorrentes ...................: ' + Object.keys(recorrentes).length);
console.log('orcamentos (ativos) ..................: ' + orcAtivos.length);
console.log('orcamentos com receitaGeradaId .......: ' + orcComReceita);
console.log('lancamentos com linked_pay_id ........: ' + lancComPayId);
console.log('orcamentos SEM quote_payment .........: ' + orcSemPayment + '  (passivo histórico)');
console.log('orcamentos com status "aceito" .......: ' + orcAceitos);
console.log('');
console.log('=== Sinal de procedência (interpretação) ===');
if (orcAceitos > 0 && Object.keys(quotePayments).length === 0) {
  console.log('quote_payments VAZIO com ' + orcAceitos + ' orçamento(s) aceito(s):');
  console.log('forte evidência de que a baseline (sem .write em quote_payments)');
  console.log('ESTÁ publicada em produção — pagamentos estariam sendo negados.');
} else if (Object.keys(quotePayments).length > 0) {
  console.log('quote_payments POPULADO (' + Object.keys(quotePayments).length + ' nós):');
  console.log('evidência de que a baseline NÃO corresponde às regras publicadas');
  console.log('(ou as regras foram alteradas depois da cópia local).');
} else {
  console.log('Sem orçamentos aceitos e sem pagamentos — sinal inconclusivo.');
}
