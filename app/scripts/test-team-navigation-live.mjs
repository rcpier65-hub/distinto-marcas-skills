import assert from 'node:assert/strict';import env from '@next/env';import {createClient} from '@supabase/supabase-js';import {createServerClient} from '@supabase/ssr';
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.TEST_BASE_URL;assert(base);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const r=await service.from('team_members').select('nombre,email').eq('activo',true);assert.ifError(r.error);
for(const name of ['lorena','pieer','ailyn']){
 const m=r.data.find(m=>m.nombre.toLowerCase().includes(name));assert(m,name);
 const jar=new Map(),auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
 try{
 const link=await service.auth.admin.generateLink({type:'magiclink',email:m.email});assert.ifError(link.error);assert.ifError((await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'})).error);
 for(const path of ['/inicio',name==='ailyn'?'/diseno':'/editor','/soporte']){
 const t=performance.now(),res=await fetch(base+path,{headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},signal:AbortSignal.timeout(45000)});const first=performance.now()-t;const text=await res.text();
 assert.equal(res.status,200);assert.equal(new URL(res.url).pathname,path);assert(text.includes('Distinto'));assert(!text.includes('NEXT_REDIRECT;replace;/login'));
 console.log(JSON.stringify({name,path,status:res.status,firstMs:Math.round(first),totalMs:Math.round(performance.now()-t),bytes:text.length}));
 }
 }finally{await auth.auth.signOut({scope:'local'})}
}
console.log('PASS acceso a Inicio, Editor/Diseño y Soporte sin redirigir a Inicio/login');
