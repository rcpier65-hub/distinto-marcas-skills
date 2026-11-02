import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {today} from '../lib/finanzas/model.ts';
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.TEST_BASE_URL;assert(base);
const url=new URL(process.env.SUPABASE_DB_URL);assert.equal(url.hostname,'127.0.0.1');
const pool=new pg.Pool({connectionString:url.href,ssl:false});
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const prefix='QA-DEBT-'+randomUUID(),requests=[],sessions=[],accountId=randomUUID();
const month=today().slice(0,7);
async function login(name){
 const jar=new Map(),auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});sessions.push(auth);
 const {data,error}=await service.auth.admin.generateLink({type:'magiclink',email:name+'@agenciadistinto.com'});assert.ifError(error);
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);
 return {cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:base,'content-type':'application/json'};
}
async function post(headers,body){const requestId=body.requestId||randomUUID();requests.push(requestId);const r=await fetch(base+'/api/finanzas',{method:'POST',headers,body:JSON.stringify({...body,requestId})});return {status:r.status,body:await r.json()};}
async function read(h,status=200){const r=await fetch(base+'/api/finanzas?mes='+month,{headers:h});assert.equal(r.status,status);return r.json();}
function ok(r){assert.equal(r.status,200,JSON.stringify(r));return r.body.id;}
try{
 const pedro=await login('pedro'),nayeli=await login('nayeli'),ailyn=await login('ailyn');
 await read(pedro);await read(nayeli);await read(ailyn,403);
 const once={title:prefix+' carro',owner:'pedro',currency:'PEN',frequency:'once',total:1700000,installment:null,first_due:month+'-08',estimated:false,active:true,note:'Acuerdo original'};
 assert.equal((await post(ailyn,{action:'debt',data:once})).status,403);
 assert.equal((await post({...pedro,origin:'https://invalid.example'},{action:'debt',data:once})).status,403);
 const requestId=randomUUID();const duplicated=await Promise.all([post(pedro,{action:'debt',data:once,requestId}),post(pedro,{action:'debt',data:once,requestId})]);
 const onceId=ok(duplicated[0]);assert.equal(ok(duplicated[1]),onceId);
 let state=await read(pedro),charges=state.debtCharges.filter(c=>c.debt_id===onceId);assert.equal(charges.length,1);assert.equal(charges[0].base,1700000);assert.equal(charges[0].state,'confirmed');
 await pool.query("INSERT INTO finance_accounts(id,name,owner,usage,currency,opening,opening_date) VALUES($1,$2,'pedro','personal','PEN',2000000,$3)",[accountId,prefix,month+'-01']);
 const payment={action:'payment',charge_id:charges[0].id,account_id:accountId,amount:100000,credit:0,credit_kind:'none',date:today(),requestId:randomUUID()};
 const paid=await Promise.all([post(pedro,payment),post(pedro,payment)]);const movementId=ok(paid[0]);assert.equal(ok(paid[1]),movementId);
 state=await read(nayeli);assert.equal(state.debts.find(d=>d.id===onceId).settled,100000);assert.equal(state.accounts.find(a=>a.id===accountId).movements,-100000);
 assert.equal((await post(pedro,{...payment,amount:1700000,requestId:randomUUID()})).status,400);
 assert.equal((await post(pedro,{action:'debt',id:onceId,revision:1,data:{...once,total:90000}})).status,400);
 ok(await post(nayeli,{action:'debt',id:onceId,revision:1,data:{...once,note:'Nota editada'}}));
 assert.equal((await post(pedro,{action:'debt',id:onceId,revision:1,data:once})).status,400);
 assert.equal((await post(pedro,{action:'debt',id:onceId,revision:2,data:{...once,currency:'USD'}})).status,400);
 const monthly={...once,title:prefix+' crédito',owner:'nayeli',frequency:'monthly',total:500000,installment:null,first_due:null};
 const monthlyId=ok(await post(pedro,{action:'debt',data:monthly}));
 state=await read(pedro);assert.equal(state.debtCharges.filter(c=>c.debt_id===monthlyId).length,0);
 const configured={...monthly,installment:50000,first_due:month+'-30'};
 ok(await post(pedro,{action:'debt',id:monthlyId,revision:1,data:configured}));
 state=await read(pedro);let installments=state.debtCharges.filter(c=>c.debt_id===monthlyId);assert.equal(installments.length,1);const chargeId=installments[0].id;assert.equal(installments[0].base,50000);
 ok(await post(pedro,{action:'debt',id:monthlyId,revision:2,data:{...configured,installment:60000}}));
 state=await read(pedro);installments=state.debtCharges.filter(c=>c.debt_id===monthlyId);assert.equal(installments.length,1);assert.equal(installments[0].id,chargeId);assert.equal(installments[0].base,60000);
 ok(await post(pedro,{...payment,charge_id:chargeId,amount:25000,requestId:randomUUID()}));
 ok(await post(pedro,{action:'debt',id:monthlyId,revision:3,data:{...configured,installment:70000,active:false}}));
 state=await read(nayeli);assert.equal(state.debtCharges.find(c=>c.id===chargeId).base,60000);assert.equal(state.debtCharges.find(c=>c.id===chargeId).settled,25000);assert.equal(state.debts.find(d=>d.id===monthlyId).active,false);
 const auna=ok(await post(pedro,{action:'debt',data:{...monthly,title:prefix+' mensual',total:null,installment:86000,estimated:true}}));
 state=await read(pedro);assert.equal(state.debtCharges.filter(c=>c.debt_id===auna).length,0);
 ok(await post(pedro,{action:'voidMovement',id:movementId,reason:'Reversión de abono QA'}));
 state=await read(pedro);assert.equal(state.debts.find(d=>d.id===onceId).settled,0);assert.equal(state.accounts.find(a=>a.id===accountId).movements,-25000);
 console.log('PASS deudas: Pedro/Nayeli, Ailyn/Origin bloqueados, creación y pagos idempotentes, saldo/abonos, reversión, cuota sin total duplicado, fechas pendientes, edición y conflicto, cuotas con abonos conservadas');
}finally{
 await pool.query('DELETE FROM finance_movements WHERE account_id=$1',[accountId]);
 await pool.query('DELETE FROM finance_accounts WHERE id=$1',[accountId]);
 await pool.query('DELETE FROM finance_charges WHERE debt_id IN (SELECT id FROM finance_debts WHERE title LIKE $1)',[prefix+'%']);
 await pool.query('DELETE FROM finance_debts WHERE title LIKE $1',[prefix+'%']);
 await pool.query("DELETE FROM finance_audit WHERE detail->>'requestId'=ANY($1::text[])",[requests]);
 await pool.query('DELETE FROM finance_requests WHERE id=ANY($1::uuid[])',[requests]);
 await Promise.all(sessions.map(a=>a.auth.signOut({scope:'local'})));await pool.end();
 console.log('PASS solo fixtures QA retirados; ninguna cuenta real recibió pagos de prueba');
}
