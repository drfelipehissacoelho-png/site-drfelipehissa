const H=require('./harness');
const RULES='/home/claude/rules-lab/out/firebase.database.rules.proposed.json';
const R=H.makeRunner(RULES,'restore');
const {med,sec,MED,SEC}=H;

// BACKUP_RESTORE_NODES do cliente (log NAO entra)
const NODES=['lancamentos','orcamentos','quote_payments','patients','hospitalPrices',
  'procedureConfig','procedures','procedureTeamCosts','procedureCommissionRules','config','recorrentes'];

// ── Backup v1: versoes antigas exportavam so lancamentos (+log, nao restaurado) ──
const v1={
  lancamentos:{
    'L1':{id:'L1',data:'2024-03-01',valor:1200,categoria:'Outros',pagamento:'Dinheiro',tipo:'despesa',usuario:'Medico',email:MED,criadoEm:'2024-03-01T00:00:00.000Z'},
    'L2':{data:'2024-03-02',valor:300,categoria:'Outros',tipo:'receita'},                 // sem id, sem usuario/email
    'L3':{id:'L3',data:'2024-03-03',valor:0,categoria:'Ajuste',tipo:'despesa'},           // valor zero
    'L4':{id:'L4',valor:99.9,tipo:'receita'},                                             // sem data/categoria
    'L5':{id:'L5',data:'2024-03-05',valor:150,categoria:'X',tipo:'despesa',deletedAt:'2024-04-01T00:00:00.000Z',deletedBy:'Medico'}
  }
};
// ── Backup v2: todos os nos ──
const ORCB='-OrcBkp0000000000001';
const v2={
  lancamentos:v1.lancamentos,
  orcamentos:{[ORCB]:{id:ORCB,paciente:'P',data:'2026-05-01',status:'aceito',subtotal:8000,desconto:0,hospTotal:0,total:8000,usuario:'Medico',email:MED,criadoEm:'2026-05-01T00:00:00.000Z'},
              'ORC-LEGADO':{paciente:'Q',total:500}},                                     // orcamento legado minimo
  quote_payments:{'PB1':H.payObj('PB1',ORCB,{created_by_email:SEC,created_by:'Secretaria'})},
  patients:{'PT1':{id:'PT1',nome:'P',criadoEm:'2026-01-01T00:00:00.000Z'},'PT2':{nome:'Q'}},
  hospitalPrices:{H1:{'Proc A':1000}}, procedureConfig:{'Proc A':{anesthetistCost:500}},
  procedures:{K1:{nome:'Proc A',active:true}}, procedureTeamCosts:{}, procedureCommissionRules:{},
  config:{meta:{valor:50000},clinica:{medico:'Dr'},usuarios:{}},
  recorrentes:{'RB1':{descricao:'Aluguel',valor:4000,categoria:'Aluguel',frequencia:'mensal',diaVencimento:5,ativo:true,criadoEm:'2026-01-01T00:00:00.000Z',criadoPor:'Medico',ultimoPeriodoGerado:'2026-07'}}
};
const only=(obj)=>{const o={};NODES.forEach(k=>{if(obj[k]!==undefined)o[k]=obj[k];});return o;};

R.run('R1','RESTAURACAO backup v1 (so lancamentos, registros incompletos) — medico',med,s=>s.update('/consultorio',only(v1)),'ALLOW');
R.run('R2','RESTAURACAO backup v1 — secretaria (guarda de papel agora tambem no servidor)',sec,s=>s.update('/consultorio',only(v1)),'DENY');
R.run('R3','RESTAURACAO backup v2 (11 nos) — medico',med,s=>s.update('/consultorio',only(v2)),'ALLOW');
R.run('R4','RESTAURACAO backup v2 — secretaria',sec,s=>s.update('/consultorio',only(v2)),'DENY');
R.run('R5','v2 com quote_payment criado pela OUTRA pessoa (autoria nao e exigida em quote_payments)',med,s=>s.update('/consultorio',only(v2)),'ALLOW');
R.run('R6','v2 onde o orcamento do pagamento vem no MESMO payload (integridade referencial via newData)',med,s=>s.update('/consultorio',only(v2)),'ALLOW');

// ── Casos que a regra proposta REJEITA no restore (trade-offs a documentar) ──
const v2orfao=JSON.parse(JSON.stringify(v2)); v2orfao.quote_payments={'PB2':H.payObj('PB2','ORC-QUE-NAO-EXISTE')};
R.run('R7','v2 com quote_payment ORFAO (orcamento ausente do payload e do banco)',med,s=>s.update('/consultorio',only(v2orfao)),'DENY');
const v2str=JSON.parse(JSON.stringify(v2)); v2str.lancamentos={'LS':{id:'LS',data:'2024-01-01',valor:'1200',categoria:'X',tipo:'despesa'}};
R.run('R8','v2 com lancamento de valor STRING (tipo legado divergente)',med,s=>s.update('/consultorio',only(v2str)),'DENY');
const v2rec=JSON.parse(JSON.stringify(v2)); v2rec.recorrentes={'RB2':{descricao:'X',valor:10,frequencia:'mensal'}};
R.run('R9','v2 com recorrente sem categoria (hasChildren)',med,s=>s.update('/consultorio',only(v2rec)),'DENY');
const v2st=JSON.parse(JSON.stringify(v2)); v2st.orcamentos={'O1':{id:'O1',total:1,status:'pago'}};
R.run('R10','v2 com orcamento de status fora do enum',med,s=>s.update('/consultorio',only(v2st)),'DENY');

// ── Restore parcial: o cliente so envia os nos presentes no arquivo ──
R.run('R11','v1 parcial (update NAO apaga nos ausentes) — medico',med,s=>s.update('/consultorio',{lancamentos:v1.lancamentos}),'ALLOW');
R.run('R12','restauracao tentando incluir log (fora do contrato do cliente)',med,s=>s.update('/consultorio',{log:{X:H.logEvt('X','Medico',MED)}}),'DENY');

console.log('\n=== MATRIZ C — REGRESSAO DE RESTAURACAO DE BACKUP ===');
console.table(R.rows);
console.log('total:',R.rows.length,'| divergencias vs. esperado:',R.fails);
const bad=R.rows.filter(r=>!r.ok);
if(bad.length){console.log('\nDIVERGENCIAS:');console.table(bad);}
