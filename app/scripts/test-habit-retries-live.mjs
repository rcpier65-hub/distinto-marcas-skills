import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.TEST_BASE_URL;assert(base);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const prefix='QA-HABIT-'+randomUUID(),ids=[],sessions=[];
async function login(email){
 const jar=new Map(), auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});sessions.push(auth);
 const {data,error}=await service.auth.admin.generateLink({type:'magiclink',email});assert.ifError(error);
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);
 return {cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:base,'content-type':'application/json'};
}
async function post(h,id,completado,status=200){const r=await fetch(base+'/api/v1/habitos',{method:'POST',headers:h,body:JSON.stringify({id,completado}),signal:AbortSignal.timeout(30000)});assert.equal(r.status,status);return r.json()}
async function count(id){const r=await service.from('habitos_completados').select('id',{count:'exact'}).eq('habito_id',id);assert.ifError(r.error);return r.count}
try {
 const members=await service.from('team_members').select('id,email,nombre').in('email',['pedro@agenciadistinto.com','ailyn@agenciadistinto.com']);assert.ifError(members.error);
 const pedro=members.data.find(m=>m.email.startsWith('pedro@')),ailyn=members.data.find(m=>m.email.startsWith('ailyn@'));assert(pedro&&ailyn);
 const a=await login(pedro.email),b=await login(ailyn.email);
 for(let i=0;i<2;i++){const r=await service.from('habitos').insert({nombre:prefix+'-'+i,team_member_id:pedro.id,activo:true,orden:99999,dias_activos:[1,2,3,4,5,6,7]}).select('id').single();assert.ifError(r.error);ids.push(r.data.id)}
 await Promise.all([post(a,ids[0],true),post(a,ids[0],true),post(a,ids[1],true)]);
 assert.equal(await count(ids[0]),1);assert.equal(await count(ids[1]),1);
 await post(a,ids[0],true);assert.equal(await count(ids[0]),1);
 await post(b,ids[0],false,403);assert.equal(await count(ids[0]),1);
 await Promise.all([post(a,ids[0],false),post(a,ids[0],false)]);assert.equal(await count(ids[0]),0);assert.equal(await count(ids[1]),1);
 await post(a,ids[0],'true',400);
 const r=await fetch(base+'/api/v1/habitos',{headers:a});assert.equal(r.status,200);const data=await r.json();assert(data.habitos.find(h=>h.id===ids[1]).completado_hoy);
 console.log('PASS: reintentos concurrentes y sucesivos no desmarcan; borrado idempotente; otro hábito conservado; otro miembro bloqueado; lectura persistente');
} finally {
 if(ids.length){assert.ifError((await service.from('habitos_completados').delete().in('habito_id',ids)).error);assert.ifError((await service.from('habitos').delete().in('id',ids).like('nombre',prefix+'%')).error)}
 await Promise.all(sessions.map(s=>s.auth.signOut({scope:'local'})));
 console.log('Fixtures QA retirados; hábitos reales intactos');
}
