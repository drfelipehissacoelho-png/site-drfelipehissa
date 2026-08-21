const fs=require('fs');
const t=require('targaryen');

const MED='drfelipehissacoelho@gmail.com';
const SEC='simonefrancape@gmail.com';
const med={uid:'uid-med',token:{email:MED}};
const sec={uid:'uid-sec',token:{email:SEC}};
const outro={uid:'uid-x',token:{email:'terceiro@gmail.com'}};
const anon=null;

// ── Estado sintético (nenhum dado real). Espelha o formato de producao. ──
const ORC='-Orc00000000000000001';
const LANC='-Lanc0000000000000001';
const PAY='-Pay00000000000000001';
const LOGEX='-Log00000000000000001';
const REC='-Rec00000000000000001';

const seed=()=>({consultorio:{
  lancamentos:{
    [LANC]:{id:LANC,data:'2026-08-01',valor:1500,categoria:'Cirurgias Particulares',pagamento:'Pix',
      descricao:'',paciente:'PACIENTE TESTE',procedimento:'Proc X',tipo:'receita',
      usuario:'Secretaria',email:SEC,criadoEm:'2026-08-01T10:00:00.000Z',
      linked_orc_id:ORC,linked_pay_id:'orfao-pre-atomicidade'},
    'legado-v1':{data:'2024-01-10',valor:300,categoria:'Outros',tipo:'despesa'}
  },
  orcamentos:{
    [ORC]:{id:ORC,paciente:'PACIENTE TESTE',data:'2026-07-01',status:'aberto',
      subtotal:10000,desconto:0,hospTotal:0,total:10000,
      servicos:[{proc:'Proc X',qty:1,valorUnit:10000,descPct:0,subtotal:10000}],
      usuario:'Medico',email:MED,criadoEm:'2026-07-01T10:00:00.000Z'}
  },
  quote_payments:{},
  recorrentes:{
    [REC]:{descricao:'Aluguel',valor:4000,categoria:'Aluguel',frequencia:'mensal',
      diaVencimento:5,ativo:true,criadoEm:'2026-01-01T00:00:00.000Z',criadoPor:'Medico',
      ultimoPeriodoGerado:'2026-07'}
  },
  patients:{'-Pat00000000000000001':{id:'-Pat00000000000000001',nome:'PACIENTE TESTE',cpf:'',rg:'',tel:'',email:'',criadoEm:'2026-01-01T00:00:00.000Z',usuario:'Medico'}},
  hospitalPrices:{}, procedureConfig:{}, procedures:{}, procedureTeamCosts:{},
  procedureCommissionRules:{}, config:{meta:{valor:50000}},
  log:{[LOGEX]:{id:LOGEX,data:'2026-08-01T10:00:00.000Z',dataServidor:1,usuario:'Medico',email:MED,acao:'ACESSO',detalhe:'x'}}
}});

const logEvt=(id,who,email)=>({id,data:'2026-08-20T12:00:00.000Z',dataServidor:1755691200000,
  usuario:who,email,acao:'TESTE',detalhe:'evento de teste'});

const payObj=(id,quoteId,over={})=>Object.assign({
  id,quote_id:quoteId,payment_date:'2026-08-20',amount:5000,payment_method:'Pix',
  installments:1,card_brand:'',status:'confirmado',notes:'',
  created_by:'Secretaria',created_by_email:SEC,
  created_at:'2026-08-20T12:00:00.000Z',updated_at:'2026-08-20T12:00:00.000Z'},over);

const lancRec=(id,over={})=>Object.assign({
  id,data:'2026-08-05',valor:4000,categoria:'Aluguel',pagamento:'Transferência',
  descricao:'🔁 Aluguel',tipo:'despesa',usuario:'X',email:SEC,
  criadoEm:'2026-08-20T12:00:00.000Z',recorrente_id:REC,recorrente_periodo:'2026-08',
  auto_generated:true},over);

// ── Runner ──────────────────────────────────────────────────────────────
function makeRunner(rulesPath,label){
  const rules=JSON.parse(fs.readFileSync(rulesPath,'utf8'));
  const rows=[];
  let fails=0;
  const run=(id,desc,auth,op,expected)=>{
    const db=t.database(rules,seed());
    const s=db.as(auth);
    let r;
    try{ r=op(s); }catch(e){ r={allowed:false,error:e.message}; }
    const got=r.allowed?'ALLOW':'DENY';
    const ok=got===expected;
    if(!ok)fails++;
    rows.push({id,desc,auth:auth?auth.token.email.split('@')[0]:'anonimo',esperado:expected,obtido:got,ok});
    return r;
  };
  return {run,rows,get fails(){return fails;},label};
}

const P=(o)=>o; // helper legibilidade
module.exports={med,sec,outro,anon,seed,logEvt,payObj,lancRec,makeRunner,ORC,LANC,PAY,LOGEX,REC,MED,SEC};
