const H=require('./harness');
const R=H.makeRunner('/mnt/user-data/uploads/site-drfelipehissa/firebase.database.rules.unverified.json','baseline');
const {med,sec,outro,anon,ORC,LOGEX}=H;
const both=[['medico',med],['secretaria',sec]];

// Os 6 casos do roteiro FIREBASE_RTD_RULES_VERIFICATION.md
both.forEach(([n,a])=>R.run('B-a','write consultorio/quote_payments/teste-fase3 ('+n+')',a,s=>s.write('/consultorio/quote_payments/teste-fase3',{id:'teste-fase3'}),'DENY'));
both.forEach(([n,a])=>R.run('B-b','write consultorio/recorrentes/teste-fase3 ('+n+')',a,s=>s.write('/consultorio/recorrentes/teste-fase3',{descricao:'x',valor:1,categoria:'c',frequencia:'mensal'}),'DENY'));
both.forEach(([n,a])=>R.run('B-c','write consultorio/lancamentos/teste-fase3 ('+n+')',a,s=>s.write('/consultorio/lancamentos/teste-fase3',{id:'teste-fase3',valor:1,tipo:'despesa',data:'2026-08-20'}),'ALLOW'));
both.forEach(([n,a])=>R.run('B-d','write consultorio/orcamentos/<id>/status ('+n+')',a,s=>s.write('/consultorio/orcamentos/'+ORC+'/status','aceito'),'ALLOW'));
both.forEach(([n,a])=>R.run('B-e','write consultorio/log/teste-fase3 (no novo) ('+n+')',a,s=>s.write('/consultorio/log/teste-fase3',H.logEvt('teste-fase3','X',a.token.email)),'ALLOW'));
both.forEach(([n,a])=>R.run('B-f','write consultorio/log/<id existente> ('+n+')',a,s=>s.write('/consultorio/log/'+LOGEX,H.logEvt(LOGEX,'X',a.token.email)),'DENY'));
// leitura
R.run('B-g','read /consultorio (medico)',med,s=>s.read('/consultorio'),'ALLOW');
R.run('B-g','read /consultorio (secretaria)',sec,s=>s.read('/consultorio'),'ALLOW');
R.run('B-h','read /consultorio (terceiro autenticado)',outro,s=>s.read('/consultorio'),'DENY');
R.run('B-i','read /consultorio (anonimo)',anon,s=>s.read('/consultorio'),'DENY');
// pagamento atomico completo sob a baseline
const payUpd={};
payUpd['quote_payments/PAYNEW']=H.payObj('PAYNEW',ORC);
payUpd['lancamentos/LANCNEW']={id:'LANCNEW',data:'2026-08-20',valor:5000,categoria:'Cirurgias Particulares',pagamento:'Pix',tipo:'receita',usuario:'S',email:H.SEC,criadoEm:'2026-08-20T12:00:00.000Z',linked_orc_id:ORC,linked_pay_id:'PAYNEW'};
payUpd['orcamentos/'+ORC+'/receitaGeradaId']='LANCNEW';
payUpd['orcamentos/'+ORC+'/status']='aceito';
payUpd['log/LOGNEW']=H.logEvt('LOGNEW','Secretaria',H.SEC);
both.forEach(([n,a])=>R.run('B-j','UPDATE ATOMICO de pagamento (5 caminhos) ('+n+')',a,s=>s.update('/consultorio',payUpd),'DENY'));
// restauracao de backup sob a baseline
const restore={lancamentos:{a:{id:'a',valor:1,tipo:'despesa',data:'2020-01-01'}},orcamentos:{},quote_payments:{},patients:{},hospitalPrices:{},procedureConfig:{},procedures:{},procedureTeamCosts:{},procedureCommissionRules:{},config:{},recorrentes:{}};
R.run('B-k','RESTAURACAO backup v2 (11 nos) (medico)',med,s=>s.update('/consultorio',restore),'DENY');

console.log('\n=== MATRIZ A — BASELINE (firebase.database.rules.unverified.json) ===');
console.table(R.rows);
console.log('divergencias vs. previsto:',R.fails);
