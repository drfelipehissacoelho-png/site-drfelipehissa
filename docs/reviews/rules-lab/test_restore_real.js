// Simula a RESTAURACAO do backup REAL contra a regra proposta, usando o motor
// de regras (nao apenas o espelho de predicados do checador).
// Nenhum dado pessoal e impresso: so allow/deny e contagens agregadas.
const fs = require('fs');
const t = require('targaryen');

const RULES = '/home/claude/rules-lab/out/firebase.database.rules.proposed.json';
const BACKUP = process.argv[2];

const MED = 'drfelipehissacoelho@gmail.com';
const SEC = 'simonefrancape@gmail.com';
const med = { uid: 'uid-med', token: { email: MED } };
const sec = { uid: 'uid-sec', token: { email: SEC } };

const NODES = ['lancamentos','orcamentos','quote_payments','patients','hospitalPrices',
  'procedureConfig','procedures','procedureTeamCosts','procedureCommissionRules','config','recorrentes'];

const rules = JSON.parse(fs.readFileSync(RULES, 'utf8'));
const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));

// Reproduz importarJSON(): norm() + so os nos presentes no arquivo
const norm = obj => {
  if (!obj) return {};
  if (Array.isArray(obj)) { const o = {}; obj.forEach(x => { if (x && x.id != null) o[x.id] = x; }); return o; }
  return obj;
};
const payload = {};
const contagens = [];
NODES.forEach(k => {
  if (backup[k] !== undefined) {
    payload[k] = norm(backup[k]);
    contagens.push(`${k}:${Object.keys(payload[k]).length}`);
  }
});

console.log('backup v' + (backup.versao || 1), '|', contagens.join(' '));
console.log('');

// Cenario 1: banco VAZIO (restauracao em base zerada — o pior caso)
// Cenario 2: banco com o proprio conteudo (restauracao por cima do estado atual)
const cenarios = [
  ['banco vazio', {}],
  ['banco com o conteudo atual', { consultorio: JSON.parse(JSON.stringify(payload)) }]
];

const linhas = [];
for (const [nome, estado] of cenarios) {
  for (const [papel, auth] of [['medico', med], ['secretaria', sec]]) {
    const db = t.database(rules, estado);
    const r = db.as(auth).update('/consultorio', payload);
    linhas.push({
      cenario: nome,
      papel,
      esperado: papel === 'medico' ? 'ALLOW' : 'DENY',
      obtido: r.allowed ? 'ALLOW' : 'DENY',
      ok: (r.allowed ? 'ALLOW' : 'DENY') === (papel === 'medico' ? 'ALLOW' : 'DENY')
    });
  }
}
console.table(linhas);
const falhas = linhas.filter(l => !l.ok).length;
console.log('divergencias:', falhas);

// Se o medico for negado, aponta QUAL caminho quebrou (sem imprimir valores)
if (linhas.some(l => l.papel === 'medico' && l.obtido === 'DENY')) {
  console.log('\nInvestigando qual no derruba a restauracao (so nomes de no):');
  for (const k of Object.keys(payload)) {
    const db = t.database(rules, {});
    const r = db.as(med).update('/consultorio', { [k]: payload[k] });
    console.log('  ' + (r.allowed ? 'ALLOW' : 'DENY ') + '  ' + k);
  }
}
