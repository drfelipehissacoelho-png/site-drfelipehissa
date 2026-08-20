const H=require('./harness');
const RULES='/home/claude/rules-lab/out/firebase.database.rules.proposed.json';
const R=H.makeRunner(RULES,'proposta');
const {med,sec,outro,anon,ORC,LANC,LOGEX,REC,MED,SEC}=H;
const both=[['medico',med],['secretaria',sec]];

// ───────── 1. LEITURA (nao pode mudar) ─────────
R.run('1.1','read /consultorio (medico)',med,s=>s.read('/consultorio'),'ALLOW');
R.run('1.2','read /consultorio (secretaria)',sec,s=>s.read('/consultorio'),'ALLOW');
R.run('1.3','read /consultorio (terceiro autenticado)',outro,s=>s.read('/consultorio'),'DENY');
R.run('1.4','read /consultorio (anonimo)',anon,s=>s.read('/consultorio'),'DENY');
R.run('1.5','read /consultorio/procedureTeamCosts (secretaria) — segregacao NAO tentada',sec,s=>s.read('/consultorio/procedureTeamCosts'),'ALLOW');

// ───────── 2. PAGAMENTO ATOMICO (desbloqueio) ─────────
function payUpdate(over={},payId='PAYNEW',lancId='LANCNEW',logId='LOGNEW',email=SEC,usuario='Secretaria'){
  const u={};
  u['quote_payments/'+payId]=H.payObj(payId,ORC,over);
  u['lancamentos/'+lancId]={id:lancId,data:'2026-08-20',valor:5000,categoria:'Cirurgias Particulares',
    pagamento:'Pix',descricao:'',paciente:'PACIENTE TESTE',procedimento:'Proc X',tipo:'receita',
    usuario,email,criadoEm:'2026-08-20T12:00:00.000Z',linked_orc_id:ORC,linked_pay_id:payId};
  u['orcamentos/'+ORC+'/receitaGeradaId']=lancId;
  u['orcamentos/'+ORC+'/status']='aceito';
  u['log/'+logId]=H.logEvt(logId,usuario,email);
  return u;
}
R.run('2.1','pagamento atomico 5 caminhos (secretaria)',sec,s=>s.update('/consultorio',payUpdate()),'ALLOW');
R.run('2.2','pagamento atomico 5 caminhos (medico)',med,s=>s.update('/consultorio',payUpdate({created_by_email:MED},'PAYNEW','LANCNEW','LOGNEW',MED,'Medico')),'ALLOW');
R.run('2.3','pagamento atomico (terceiro autenticado)',outro,s=>s.update('/consultorio',payUpdate()),'DENY');
R.run('2.4','pagamento atomico (anonimo)',anon,s=>s.update('/consultorio',payUpdate()),'DENY');
// pagamento com taxa de cartao (6 caminhos)
R.run('2.5','pagamento cartao com taxa — 6 caminhos (secretaria)',sec,s=>{
  const u=payUpdate({payment_method:'Cartão de Crédito',installments:3,card_brand:'Visa'});
  u['lancamentos/TAXANEW']={id:'TAXANEW',data:'2026-08-20',valor:199.5,categoria:'Taxas de Cartão',
    pagamento:'Transferência',descricao:'Taxa Crédito 3x',paciente:'PACIENTE TESTE',procedimento:'Proc X',
    tipo:'despesa',usuario:'Secretaria',email:SEC,criadoEm:'2026-08-20T12:00:00.000Z',
    auto_generated:true,linked_orc_id:ORC,linked_pay_id:'PAYNEW'};
  return s.update('/consultorio',u);
},'ALLOW');
// validacoes negativas de quote_payments
R.run('2.6','pagamento com amount = 0 (secretaria)',sec,s=>s.update('/consultorio',payUpdate({amount:0})),'DENY');
R.run('2.7','pagamento com amount negativo (secretaria)',sec,s=>s.update('/consultorio',payUpdate({amount:-100})),'DENY');
R.run('2.8','pagamento com amount string (secretaria)',sec,s=>s.update('/consultorio',payUpdate({amount:'5000'})),'DENY');
R.run('2.9','pagamento sem campos obrigatorios (secretaria)',sec,s=>s.write('/consultorio/quote_payments/PAYNEW',{amount:100}),'DENY');
R.run('2.10','pagamento com id != $payId (secretaria)',sec,s=>s.update('/consultorio',payUpdate({id:'OUTRO'})),'DENY');
R.run('2.11','pagamento ORFAO — quote_id inexistente (secretaria)',sec,s=>s.write('/consultorio/quote_payments/PAYNEW',H.payObj('PAYNEW','orc-que-nao-existe')),'DENY');
R.run('2.12','pagamento com status invalido (secretaria)',sec,s=>s.update('/consultorio',payUpdate({status:'pago'})),'DENY');
R.run('2.13','pagamento avulso valido em orcamento existente (secretaria)',sec,s=>s.write('/consultorio/quote_payments/PAYNEW',H.payObj('PAYNEW',ORC)),'ALLOW');

// ───────── 3. ESTORNO DE PAGAMENTO (UPDATE, nao create) ─────────
function seedComPagamento(){ /* usa write previo simulado via update unico */ }
R.run('3.1','estorno: deletedAt/By em quote_payments + lancamentos + receitaGeradaId=null (secretaria)',sec,s=>{
  // cria o pagamento e o lancamento primeiro no mesmo grafo
  const u={};
  u['quote_payments/'+'PAYEX']=H.payObj('PAYEX',ORC);
  u['lancamentos/'+LANC+'/linked_pay_id']='PAYEX';
  const r1=s.update('/consultorio',u);
  if(!r1.allowed) return r1;
  // agora o estorno, sobre um grafo que ja contem o pagamento
  const db2=require('targaryen').database(JSON.parse(require('fs').readFileSync(RULES,'utf8')),
    (()=>{const st=H.seed();st.consultorio.quote_payments['PAYEX']=H.payObj('PAYEX',ORC);
          st.consultorio.lancamentos[LANC].linked_pay_id='PAYEX';
          st.consultorio.orcamentos[ORC].receitaGeradaId=LANC;return st;})());
  const u2={};
  u2['quote_payments/PAYEX/deletedAt']='2026-08-20T13:00:00.000Z';
  u2['quote_payments/PAYEX/deletedBy']='Secretaria';
  u2['lancamentos/'+LANC+'/deletedAt']='2026-08-20T13:00:00.000Z';
  u2['lancamentos/'+LANC+'/deletedBy']='Secretaria';
  u2['orcamentos/'+ORC+'/receitaGeradaId']=null;
  u2['log/LOGEST']=H.logEvt('LOGEST','Secretaria',SEC);
  return db2.as(sec).update('/consultorio',u2);
},'ALLOW');
R.run('3.2','hard delete de quote_payments/$id (secretaria)',sec,s=>s.write('/consultorio/quote_payments/'+'PAYEX',null),'DENY');
R.run('3.3','hard delete de quote_payments/$id (medico)',med,s=>s.write('/consultorio/quote_payments/'+'PAYEX',null),'ALLOW');

// ───────── 4. RECORRENTES (desbloqueio + papel) ─────────
const recNovo={descricao:'Internet',valor:250,categoria:'Infraestrutura',frequencia:'mensal',
  diaVencimento:10,ativo:true,criadoEm:'2026-08-20T12:00:00.000Z',criadoPor:'Medico'};
R.run('4.1','criar recorrente (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',recNovo),'ALLOW');
R.run('4.2','criar recorrente (secretaria)',sec,s=>s.write('/consultorio/recorrentes/RECNEW',recNovo),'DENY');
R.run('4.3','editar recorrente existente (medico)',med,s=>s.write('/consultorio/recorrentes/'+REC,Object.assign({},recNovo,{descricao:'Aluguel novo'})),'ALLOW');
R.run('4.4','toggle ativo (medico)',med,s=>s.write('/consultorio/recorrentes/'+REC+'/ativo',false),'ALLOW');
R.run('4.5','toggle ativo (secretaria)',sec,s=>s.write('/consultorio/recorrentes/'+REC+'/ativo',false),'DENY');
R.run('4.6','hard delete de recorrente (medico) — decisao registrada',med,s=>s.write('/consultorio/recorrentes/'+REC,null),'ALLOW');
R.run('4.7','hard delete de recorrente (secretaria)',sec,s=>s.write('/consultorio/recorrentes/'+REC,null),'DENY');
R.run('4.8','recorrente com valor 0 (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',Object.assign({},recNovo,{valor:0})),'DENY');
R.run('4.9','recorrente com frequencia invalida (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',Object.assign({},recNovo,{frequencia:'semanal'})),'DENY');
R.run('4.10','recorrente sem campos obrigatorios (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',{descricao:'x'}),'DENY');
R.run('4.11','recorrente com diaVencimento 31 (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',Object.assign({},recNovo,{diaVencimento:31})),'DENY');
R.run('4.12','recorrente com ativo string (medico)',med,s=>s.write('/consultorio/recorrentes/RECNEW',Object.assign({},recNovo,{ativo:'sim'})),'DENY');

// geracao automatica (roda na sessao de QUALQUER usuario logado)
function gerUpdate(){
  const u={};
  u['lancamentos/recorrente_'+REC+'_2026-08']=H.lancRec('recorrente_'+REC+'_2026-08');
  u['recorrentes/'+REC+'/ultimoPeriodoGerado']='2026-08';
  u['log/LOGGER']=H.logEvt('LOGGER','X',SEC);
  return u;
}
R.run('4.13','geracao automatica de recorrente — 3 caminhos (secretaria)',sec,s=>s.update('/consultorio',gerUpdate()),'ALLOW');
R.run('4.14','geracao automatica de recorrente — 3 caminhos (medico)',med,s=>{
  const u=gerUpdate(); u['lancamentos/recorrente_'+REC+'_2026-08'].email=MED; u['log/LOGGER']=H.logEvt('LOGGER','Medico',MED); return s.update('/consultorio',u);},'ALLOW');
R.run('4.15','secretaria tenta criar recorrente pelo atalho ultimoPeriodoGerado',sec,s=>s.write('/consultorio/recorrentes/RECFAKE/ultimoPeriodoGerado','2026-08'),'DENY');

// ───────── 5. LANCAMENTOS ─────────
const lancNovo={id:'LANCX',data:'2026-08-20',valor:100,categoria:'Outros',pagamento:'Pix',
  descricao:'teste',paciente:'',procedimento:'',tipo:'despesa',usuario:'X',email:SEC,criadoEm:'2026-08-20T12:00:00.000Z'};
both.forEach(([n,a])=>R.run('5.1','criar lancamento ('+n+')',a,s=>s.write('/consultorio/lancamentos/LANCX',Object.assign({},lancNovo,{email:a.token.email})),'ALLOW'));
both.forEach(([n,a])=>R.run('5.2','soft-delete de lancamento ('+n+')',a,s=>s.update('/consultorio',{['lancamentos/'+LANC+'/deletedAt']:'2026-08-20T13:00:00.000Z',['lancamentos/'+LANC+'/deletedBy']:'X'}),'ALLOW'));
both.forEach(([n,a])=>R.run('5.3','restaurar da lixeira — deletedAt=null ('+n+')',a,s=>s.update('/consultorio',{['lancamentos/'+LANC+'/deletedAt']:null,['lancamentos/'+LANC+'/deletedBy']:null}),'ALLOW'));
R.run('5.4','PURGA de lancamento por $id (medico)',med,s=>s.update('/consultorio',{['lancamentos/'+LANC]:null}),'ALLOW');
R.run('5.5','PURGA de lancamento por $id (secretaria) — restricao proposta',sec,s=>s.update('/consultorio',{['lancamentos/'+LANC]:null}),'DENY');
R.run('5.6','set(null) na COLECAO lancamentos (secretaria)',sec,s=>s.write('/consultorio/lancamentos',null),'DENY');
R.run('5.7','set(null) na COLECAO lancamentos (medico) — inerente ao restore',med,s=>s.write('/consultorio/lancamentos',null),'ALLOW');
R.run('5.8','lancamento com valor string (secretaria)',sec,s=>s.write('/consultorio/lancamentos/LANCX',Object.assign({},lancNovo,{valor:'100'})),'DENY');
R.run('5.9','lancamento com tipo invalido (secretaria)',sec,s=>s.write('/consultorio/lancamentos/LANCX',Object.assign({},lancNovo,{tipo:'transferencia'})),'DENY');
R.run('5.10','editar valor de lancamento existente (secretaria)',sec,s=>s.write('/consultorio/lancamentos/'+LANC+'/valor',2000),'ALLOW');
R.run('5.11','anonimizacao LGPD: patients/$id + lancamentos/$id/paciente (medico)',med,s=>s.update('/consultorio',{
  ['patients/-Pat00000000000000001']:{id:'-Pat00000000000000001',nome:'Paciente Anônimo #000001',cpf:'',rg:'',tel:'',email:'',obs:'',anonimizadoEm:'2026-08-20T12:00:00.000Z',anonimizadoPor:'Medico'},
  ['lancamentos/'+LANC+'/paciente']:'Paciente Anônimo #000001'}),'ALLOW');

// ───────── 6. ORCAMENTOS ─────────
both.forEach(([n,a])=>R.run('6.1','criar orcamento ('+n+')',a,s=>s.write('/consultorio/orcamentos/ORCX',{id:'ORCX',paciente:'P',data:'2026-08-20',status:'aberto',subtotal:100,desconto:0,hospTotal:0,total:100,usuario:'X',email:a.token.email,criadoEm:'2026-08-20T12:00:00.000Z'}),'ALLOW'));
both.forEach(([n,a])=>R.run('6.2','mudar status para aceito ('+n+')',a,s=>s.update('/consultorio',{['orcamentos/'+ORC+'/status']:'aceito',['log/LOGST']:H.logEvt('LOGST','X',a.token.email)}),'ALLOW'));
R.run('6.3','status invalido (medico)',med,s=>s.write('/consultorio/orcamentos/'+ORC+'/status','pago'),'DENY');
R.run('6.4','total como string (medico)',med,s=>s.write('/consultorio/orcamentos/'+ORC+'/total','10000'),'DENY');
R.run('6.5','PURGA de orcamento (medico)',med,s=>s.update('/consultorio',{['orcamentos/'+ORC]:null}),'ALLOW');
R.run('6.6','PURGA de orcamento (secretaria) — restricao proposta',sec,s=>s.update('/consultorio',{['orcamentos/'+ORC]:null}),'DENY');
R.run('6.7','soft-delete de orcamento (secretaria)',sec,s=>s.update('/consultorio',{['orcamentos/'+ORC+'/deletedAt']:'2026-08-20T13:00:00.000Z',['orcamentos/'+ORC+'/deletedBy']:'X'}),'ALLOW');

// ───────── 7. LOG — autoria nao forjavel ─────────
both.forEach(([n,a])=>R.run('7.1','criar evento de log com o proprio email ('+n+')',a,s=>s.write('/consultorio/log/LOGN',H.logEvt('LOGN','X',a.token.email)),'ALLOW'));
R.run('7.2','secretaria cria log assinado como o medico',sec,s=>s.write('/consultorio/log/LOGN',H.logEvt('LOGN','Medico',MED)),'DENY');
R.run('7.3','medico cria log assinado como a secretaria',med,s=>s.write('/consultorio/log/LOGN',H.logEvt('LOGN','Secretaria',SEC)),'DENY');
both.forEach(([n,a])=>R.run('7.4','sobrescrever evento de log existente ('+n+')',a,s=>s.write('/consultorio/log/'+LOGEX,H.logEvt(LOGEX,'X',a.token.email)),'DENY'));
both.forEach(([n,a])=>R.run('7.5','apagar evento de log existente ('+n+')',a,s=>s.write('/consultorio/log/'+LOGEX,null),'DENY'));
R.run('7.6','log com id != $logId (medico)',med,s=>s.write('/consultorio/log/LOGN',H.logEvt('OUTRO','X',MED)),'DENY');
R.run('7.7','log sem campos minimos (medico)',med,s=>s.write('/consultorio/log/LOGN',{acao:'X'}),'DENY');
R.run('7.8','set(null) na COLECAO log (medico)',med,s=>s.write('/consultorio/log',null),'DENY');

// ───────── 8. NOS MEDICO-ONLY ─────────
R.run('8.1','config/meta (medico)',med,s=>s.write('/consultorio/config/meta',{valor:60000}),'ALLOW');
R.run('8.2','config/meta (secretaria)',sec,s=>s.write('/consultorio/config/meta',{valor:60000}),'DENY');
R.run('8.3','procedures/<key>/active (medico)',med,s=>s.write('/consultorio/procedures/K/active',false),'ALLOW');
R.run('8.4','procedures/<key>/active (secretaria)',sec,s=>s.write('/consultorio/procedures/K/active',false),'DENY');
R.run('8.5','hospitalPrices (secretaria)',sec,s=>s.write('/consultorio/hospitalPrices/H/Proc','100'),'DENY');
R.run('8.6','patients/$id (secretaria)',sec,s=>s.write('/consultorio/patients/PATX',{id:'PATX',nome:'Novo',criadoEm:'2026-08-20T12:00:00.000Z',usuario:'X'}),'ALLOW');
R.run('8.7','set(null) na COLECAO patients (secretaria)',sec,s=>s.write('/consultorio/patients',null),'DENY');

console.log('\n=== MATRIZ B — REGRA PROPOSTA ===');
console.table(R.rows);
const bad=R.rows.filter(r=>!r.ok);
console.log('total de casos:',R.rows.length,'| divergencias:',R.fails);
if(bad.length){console.log('\nDIVERGENCIAS:');console.table(bad);}
