#!/usr/bin/env node
/**
 * checar_backup_vs_rules_proposed.js
 *
 * Verifica se TODOS os registros de um backup real satisfazem os `.validate`
 * de `firebase.database.rules.proposed.json`. É o pré-requisito do deploy:
 * se este script acusar qualquer violação, a restauração desse backup FALHARIA
 * sob a regra proposta — e a regra deve ser afrouxada antes de publicar.
 *
 * IMPORTANTE: este script ESPELHA os predicados das regras em JavaScript; ele
 * não executa o motor de regras do Firebase. Ao alterar o JSON das regras,
 * altere aqui também. As duas listas estão lado a lado de propósito.
 *
 * Uso:
 *   node tools/checar_backup_vs_rules_proposed.js caminho/do/backup_AAAA-MM-DD.json
 *
 * Privacidade: imprime apenas contagens, nomes de campo e chaves de nó.
 * Nenhum nome de paciente, CPF ou valor individual é exibido.
 */

const fs = require('fs');

const STATUS_ORC = ['aberto', 'aceito', 'recusado', 'expirado'];
const STATUS_PAY = ['confirmado', 'estornado'];
const FREQ_REC = ['mensal', 'quinzenal', 'anual'];

const isStr = v => typeof v === 'string';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isBool = v => typeof v === 'boolean';
const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== null;

const violacoes = [];
const add = (no, chave, campo, motivo) =>
  violacoes.push({ no, chave: String(chave).slice(0, 12) + '…', campo, motivo });

// campo opcional: só valida se estiver presente e não-nulo
function opt(no, chave, obj, campo, pred, motivo) {
  if (has(obj, campo) && !pred(obj[campo])) add(no, chave, campo, motivo);
}

function checar(backup) {
  const g = k => (backup && backup[k] && typeof backup[k] === 'object') ? backup[k] : {};
  const orcamentos = g('orcamentos');

  // ── lancamentos/$id ──────────────────────────────────────────────────────
  for (const [k, l] of Object.entries(g('lancamentos'))) {
    if (!l || typeof l !== 'object') { add('lancamentos', k, '(no)', 'nao e objeto'); continue; }
    opt('lancamentos', k, l, 'valor', isNum, 'valor precisa ser number');
    opt('lancamentos', k, l, 'tipo', v => isStr(v) && (v === 'receita' || v === 'despesa'), "tipo fora de {receita,despesa}");
    opt('lancamentos', k, l, 'data', isStr, 'data precisa ser string');
    opt('lancamentos', k, l, 'criadoEm', isStr, 'criadoEm precisa ser string');
    opt('lancamentos', k, l, 'deletedAt', isStr, 'deletedAt precisa ser string');
    opt('lancamentos', k, l, 'deletedBy', isStr, 'deletedBy precisa ser string');
    opt('lancamentos', k, l, 'linked_pay_id', isStr, 'linked_pay_id precisa ser string');
    opt('lancamentos', k, l, 'linked_orc_id', isStr, 'linked_orc_id precisa ser string');
  }

  // ── orcamentos/$id ───────────────────────────────────────────────────────
  for (const [k, o] of Object.entries(orcamentos)) {
    if (!o || typeof o !== 'object') { add('orcamentos', k, '(no)', 'nao e objeto'); continue; }
    ['total', 'subtotal', 'desconto', 'hospTotal'].forEach(c =>
      opt('orcamentos', k, o, c, isNum, c + ' precisa ser number'));
    opt('orcamentos', k, o, 'status', v => isStr(v) && STATUS_ORC.includes(v),
      'status fora de {' + STATUS_ORC.join(',') + '}');
    opt('orcamentos', k, o, 'receitaGeradaId', isStr, 'receitaGeradaId precisa ser string');
    ['data', 'deletedAt', 'deletedBy'].forEach(c =>
      opt('orcamentos', k, o, c, isStr, c + ' precisa ser string'));
  }

  // ── quote_payments/$id (validacao com hasChildren) ───────────────────────
  const OBRIG_PAY = ['id', 'quote_id', 'amount', 'payment_date', 'payment_method', 'status'];
  for (const [k, p] of Object.entries(g('quote_payments'))) {
    if (!p || typeof p !== 'object') { add('quote_payments', k, '(no)', 'nao e objeto'); continue; }
    const faltando = OBRIG_PAY.filter(c => !has(p, c));
    if (faltando.length) add('quote_payments', k, faltando.join(','), 'campos obrigatorios ausentes');
    if (has(p, 'id') && p.id !== k) add('quote_payments', k, 'id', 'id != chave do no');
    if (has(p, 'quote_id')) {
      if (!isStr(p.quote_id)) add('quote_payments', k, 'quote_id', 'quote_id precisa ser string');
      else if (!has(orcamentos, p.quote_id)) add('quote_payments', k, 'quote_id', 'orcamento referenciado ausente do backup (pagamento orfao)');
    }
    opt('quote_payments', k, p, 'amount', v => isNum(v) && v > 0, 'amount precisa ser number > 0');
    opt('quote_payments', k, p, 'installments', v => isNum(v) && v >= 1, 'installments precisa ser number >= 1');
    opt('quote_payments', k, p, 'status', v => isStr(v) && STATUS_PAY.includes(v),
      'status fora de {' + STATUS_PAY.join(',') + '}');
    ['payment_date', 'payment_method', 'created_at', 'updated_at', 'deletedAt', 'deletedBy'].forEach(c =>
      opt('quote_payments', k, p, c, isStr, c + ' precisa ser string'));
  }

  // ── recorrentes/$id (validacao com hasChildren) ──────────────────────────
  const OBRIG_REC = ['descricao', 'valor', 'categoria', 'frequencia'];
  for (const [k, r] of Object.entries(g('recorrentes'))) {
    if (!r || typeof r !== 'object') { add('recorrentes', k, '(no)', 'nao e objeto'); continue; }
    const faltando = OBRIG_REC.filter(c => !has(r, c));
    if (faltando.length) add('recorrentes', k, faltando.join(','), 'campos obrigatorios ausentes');
    opt('recorrentes', k, r, 'descricao', v => isStr(v) && v.length > 0, 'descricao vazia');
    opt('recorrentes', k, r, 'valor', v => isNum(v) && v > 0, 'valor precisa ser number > 0');
    opt('recorrentes', k, r, 'categoria', isStr, 'categoria precisa ser string');
    opt('recorrentes', k, r, 'frequencia', v => isStr(v) && FREQ_REC.includes(v),
      'frequencia fora de {' + FREQ_REC.join(',') + '}');
    opt('recorrentes', k, r, 'diaVencimento', v => isNum(v) && v >= 1 && v <= 28, 'diaVencimento fora de 1..28');
    opt('recorrentes', k, r, 'ativo', isBool, 'ativo precisa ser boolean');
    ['mes', 'criadoEm', 'criadoPor', 'ultimoPeriodoGerado'].forEach(c =>
      opt('recorrentes', k, r, c, isStr, c + ' precisa ser string'));
  }

  // ── patients/$id ─────────────────────────────────────────────────────────
  for (const [k, p] of Object.entries(g('patients'))) {
    if (!p || typeof p !== 'object') { add('patients', k, '(no)', 'nao e objeto'); continue; }
    opt('patients', k, p, 'nome', v => isStr(v) && v.length > 0, 'nome vazio ou nao-string');
    opt('patients', k, p, 'criadoEm', isStr, 'criadoEm precisa ser string');
    opt('patients', k, p, 'consentimentoLGPD', isStr, 'consentimentoLGPD precisa ser string');
  }
}

function main() {
  const arq = process.argv[2];
  if (!arq) { console.error('uso: node checar_backup_vs_rules_proposed.js <backup.json>'); process.exit(2); }
  const backup = JSON.parse(fs.readFileSync(arq, 'utf8'));

  const contagens = ['lancamentos', 'orcamentos', 'quote_payments', 'recorrentes', 'patients']
    .map(k => `${k}: ${Object.keys((backup[k] && typeof backup[k] === 'object') ? backup[k] : {}).length}`);

  checar(backup);

  console.log('backup versao:', backup.versao || 1);
  console.log('contagens →', contagens.join(' | '));
  console.log('');

  if (!violacoes.length) {
    console.log('✅ APROVADO — todos os registros passam nos .validate da regra proposta.');
    console.log('   A restauracao deste backup NAO seria bloqueada pelas novas regras.');
    process.exit(0);
  }

  const porMotivo = {};
  violacoes.forEach(v => {
    const chave = `${v.no}.${v.campo} → ${v.motivo}`;
    porMotivo[chave] = (porMotivo[chave] || 0) + 1;
  });
  console.log('❌ REPROVADO —', violacoes.length, 'violacao(oes). A restauracao FALHARIA.');
  console.log('   Afrouxe os .validate indicados antes de publicar as regras.\n');
  Object.entries(porMotivo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([m, n]) => console.log(`   ${String(n).padStart(5)}x  ${m}`));
  process.exit(1);
}

main();
