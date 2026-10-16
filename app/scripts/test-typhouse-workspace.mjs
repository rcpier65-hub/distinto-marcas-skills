// Read-only app integration checks. Creates and closes temporary auth sessions.
import assert from 'node:assert/strict'
import env from '@next/env'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3116'
const svc=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
async function session(email){const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});const {data,error}=await svc.auth.admin.generateLink({type:'magiclink',email});assert.ifError(error);assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);return{auth,cookie:()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}}
const pedro=await session('pedro@agenciadistinto.com')
let client
try{
 const headers={cookie:pedro.cookie()}
 const r=await fetch(base+'/api/estrategia?marca=little-joe',{headers});assert.equal(r.status,200)
 const b=await r.json();assert.equal(b.brand.nombre,'TypHouse');assert(b.profile.data.positioning.includes('TypHouse'))
 const sheet=b.records.find(r=>r.kind==='sheet'&&r.title==='Plan de trabajo · TypHouse · octubre 2026');assert(sheet);assert.equal(sheet.data.sharedWithClient,false)
 const done=b.activities.find(a=>a.id==='design:1eafd709-3c4b-88e9-aa97-c727b735a5f6');assert(done?.done,'Finished catalog design is not overdue')
 assert(!b.activities.some(a=>a.state==='archivado'))
 const banner=b.activities.find(a=>a.id==='design:e509c344-1fb9-88cd-84dd-a56ecfeed267');assert(banner&&!banner.done)
 const work=b.links.filter(l=>l.sheet_id===sheet.id);assert(work.length>=12)
 const s=await fetch(base+`/api/estrategia/hojas/${sheet.id}`,{headers}).then(r=>r.json());assert(s.scene.elements.length>=20);assert.equal(s.actions.length,0,'No duplicate agreements/tasks created')
 const html=await fetch(base+'/marca/little-joe/estrategia',{headers}).then(r=>r.text());assert(html.includes('Plan de trabajo · TypHouse'));assert(html.includes('Trabajo del equipo'));assert(html.includes('Métricas de redes sociales'));assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'))
 const metrics=await fetch(base+'/api/estrategia/metricas?marca=little-joe',{headers});assert.equal(metrics.status,200);const m=await metrics.json();assert(['reconnect','ready','partial','unavailable','unconfigured'].includes(m.status));assert.equal(m.networks.length,3);assert.equal(m.provider,'meta');if(['reconnect','unconfigured'].includes(m.status))assert(m.networks.every(n=>n.followers===null))
 console.log('PASS overview, completed designs, linked originals, private plan/canvas and metrics:',m.status)
 for(const [origin,status]of[[base,400],['https://invalid.example',403]]){const r=await fetch(base+'/api/creative-studio',{method:'POST',headers:{...headers,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'invalid-test-action'})});assert.equal(r.status,status,'Origin validation behind proxy');await r.arrayBuffer()}
 const anon=await fetch(base+'/api/estrategia/metricas?marca=little-joe',{redirect:'manual'});assert([401,307].includes(anon.status))
 client=await session('total@distintostudio.com')
 for(const path of ['/api/estrategia?marca=little-joe','/api/estrategia/metricas?marca=little-joe',`/api/estrategia/hojas/${sheet.id}`]){const r=await fetch(base+path,{headers:{cookie:client.cookie()},redirect:'manual'});assert([403,307].includes(r.status),`Client isolation ${path}`);if(r.status===307)assert.equal(new URL(r.headers.get('location'),base).pathname,'/cliente');await r.arrayBuffer()}
 console.log('PASS valid/invalid origins, anonymous guard, client isolation for brand, metrics and internal plan')
}finally{await pedro.auth.auth.signOut({scope:'local'});if(client)await client.auth.auth.signOut({scope:'local'})}
