import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {today} from '../lib/finanzas/model.ts';
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.TEST_BASE_URL;assert(base);
const u=new URL(process.env.SUPABASE_DB_URL);
const pool=new pg.Pool({connectionString:u.href,ssl:['localhost','127.0.0.1'].includes(u.hostname)?false:{rejectUnauthorized:false}});
const svc=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const id=randomUUID(),prefix='QA-COST-'+id,requests=[],sessions=[];
const draft={id,title:prefix,scope:'agency',currency:'PEN',amount:1234,starts_month:today().slice(0,7),note:'Costo aislado de prueba'};
async function login(name){
 const jar=new Map(),auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});sessions.push(auth);
 const {data,error}=await svc.auth.admin.generateLink({type:'magiclink',email:name+'@agenciadistinto.com'});assert.ifError(error);
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);
 return {cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:base,'content-type':'application/json'};
}
async function post(headers,body){const requestId=body.requestId||randomUUID();requests.push(requestId);const r=await fetch(base+'/api/finanzas',{method:'POST',headers,body:JSON.stringify({...body,requestId})});return {status:r.status,body:await r.json()};}
async function read(h,status=200){const r=await fetch(base+'/api/finanzas?mes='+draft.starts_month,{headers:h});assert.equal(r.status,status);return r.json();}
try{
 await pool.query("INSERT INTO finance_settings(key,value) VALUES('monthly-cost-drafts',jsonb_build_object('items',jsonb_build_array($1::jsonb))) ON CONFLICT(key) DO UPDATE SET value=jsonb_set(finance_settings.value,'{items}',COALESCE(finance_settings.value->'items','[]')||jsonb_build_array($1::jsonb))",[JSON.stringify(draft)]);
 const pedro=await login('pedro'),nayeli=await login('nayeli'),ailyn=await login('ailyn');
 const before=await read(pedro);assert(before.monthlyCosts.some(c=>c.id===id));
 assert((await read(nayeli)).monthlyCosts.some(c=>c.id===id));await read(ailyn,403);
 const data={title:prefix,kind:'expense',scope:'agency',owner:'agency',currency:'PEN',base:1234,tax:0,frequency:'monthly',day:Number(today().slice(8)),starts:draft.starts_month+'-01',ends:null,period_mode:'other',note:'QA isolated',member_id:null,brand_id:null};
 assert.equal((await post(ailyn,{action:'rule',data,cost_draft_id:id})).status,403);
 assert.equal((await post(pedro,{action:'rule',data:{...data,scope:'personal'},cost_draft_id:id})).status,400);
 assert.equal((await post(pedro,{action:'rule',data:{...data,starts:'2099-01-01'},cost_draft_id:id})).status,400);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM finance_rules WHERE title=$1',[prefix])).rows[0].n,0);
 const requestId=randomUUID(),body={action:'rule',data,cost_draft_id:id,requestId};
 const results=await Promise.all([post(pedro,body),post(pedro,body)]);
 assert(results.every(r=>r.status===200),JSON.stringify(results));assert.equal(results[0].body.id,results[1].body.id);
 assert.equal((await post(pedro,{...body,requestId:randomUUID()})).status,400);
 const after=await read(pedro),rules=after.rules.filter(r=>r.title===prefix),charges=after.charges.filter(c=>c.title===prefix);
 assert.equal(rules.length,1);assert.equal(charges.length,1);assert.equal(charges[0].base,1234);assert.equal(charges[0].state,'review');assert.equal(charges[0].settled,0);
 assert(!after.monthlyCosts.some(c=>c.id===id));assert(!after.movements.some(m=>m.charge_id===charges[0].id));
 assert.deepEqual(before.monthlyCosts.filter(c=>c.id!==id),after.monthlyCosts);
 console.log('PASS Pedro/Nayeli, aislamiento Ailyn, conversión transaccional/idempotente, restricciones, un solo costo y cero pagos automáticos');
}finally{
 await pool.query("UPDATE finance_settings SET value=jsonb_set(value,'{items}',COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(value->'items') x WHERE x->>'id'<>$1),'[]'::jsonb)) WHERE key='monthly-cost-drafts'",[id]);
 await pool.query('DELETE FROM finance_charges WHERE title=$1',[prefix]);
 await pool.query('DELETE FROM finance_rules WHERE title=$1',[prefix]);
 await pool.query("DELETE FROM finance_audit WHERE detail->>'requestId'=ANY($1::text[])",[requests]);
 await pool.query('DELETE FROM finance_requests WHERE id=ANY($1::uuid[])',[requests]);
 await Promise.all(sessions.map(a=>a.auth.signOut({scope:'local'})));await pool.end();
 console.log('PASS solo datos temporales retirados; costos, cuentas y movimientos reales conservados');
}
