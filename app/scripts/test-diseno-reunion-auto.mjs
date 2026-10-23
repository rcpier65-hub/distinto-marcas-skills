// Actions reales, datos descartables; no llama a Google ni envía invitaciones.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3122'
const manifest=JSON.parse(await readFile(process.env.TEST_MANIFEST||'.next/server/server-reference-manifest.json','utf8'))
const actionId=name=>Object.entries(manifest.node).find(([,v])=>v.exportedName===name)?.[0]
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const f={brand:randomUUID(),otherBrand:randomUUID(),member:randomUUID(),slug:`qa-reunion-auto-${randomUUID()}`,otherSlug:`qa-reunion-auto-${randomUUID()}`,email:`qa-reunion-auto-${randomUUID()}@example.com`,password:randomBytes(24).toString('base64url')}
const jar=new Map()
const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}})
const cookie=()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
async function ok(p){const r=await p;assert.ifError(r.error);return r.data}
async function request(path,data,headers={}){
 const r=await fetch(base+path,{method:data?'POST':'GET',redirect:'manual',headers:{cookie:cookie(),...(data?{'Content-Type':'application/json',Origin:new URL(base).origin}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})})
 const raw=await r.text();let out;try{out=JSON.parse(raw)}catch{out=raw}return {status:r.status,out}
}
async function action(name,args){
 const r=await request('/diseno',args,{'Next-Action':actionId(name),Accept:'text/x-component'})
 if(typeof r.out==='string')for(const line of r.out.split('\n')){try{const v=JSON.parse(line.slice(line.indexOf(':')+1));if(typeof v.ok==='boolean')return v}catch{}}
 throw Error(`Action ${name}: ${r.status}`)
}
const pending=async id=>await ok(service.from('reunion_temas').select('*').eq('publicacion_id',id).eq('estado','pendiente'))
const create=input=>action('crearDisenoTask',[{solicitudId:randomUUID(),nombre:'QA Presentación automática',marcaSlug:f.slug,tipoDiseno:'interno',esParaPublicar:false,...input}])
let keep=false
try{
 await ok(service.from('marcas').insert([{id:f.brand,slug:f.slug,nombre:'QA Reunión automática',activa:true},{id:f.otherBrand,slug:f.otherSlug,nombre:'QA Otra marca',activa:true}]))
 f.user=(await ok(service.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true}))).user.id
 await ok(service.from('team_members').insert({id:f.member,auth_user_id:f.user,email:f.email,nombre:'QA Diseño',rol_base:'disenador',activo:true,marcas_acceso:[f.brand],permisos_override:{diseno:{acceso:true},marcas:{acceso:true}}}))
 await ok(auth.auth.signInWithPassword({email:f.email,password:f.password}))
 const denied=await create({marcaSlug:f.otherSlug,paraReunion:true})
 assert.equal(denied.ok,false)
 assert.equal((await ok(service.from('publicaciones').select('id').eq('marca_id',f.otherBrand))).length,0,'No partially created unauthorized task')
 const plain=await create({paraReunion:false,nombre:'QA Sin reunión'})
 assert.equal(plain.ok,true,JSON.stringify(plain));assert.equal((await pending(plain.data.id)).length,0)
 const solicitudId=randomUUID()
 const copies=await Promise.all(Array.from({length:3},()=>create({solicitudId,paraReunion:true})))
 copies.forEach(r=>assert.equal(r.ok,true,JSON.stringify(r)))
 f.id=copies[0].data.id
 assert(copies.every(r=>r.data.id===f.id));assert.equal((await pending(f.id)).length,1,'Concurrent retry keeps one pending topic')
 const r=await request(`/api/estrategia/reunion-temas?marca=${f.slug}`)
 assert.equal(r.status,200);assert(r.out.temas.some(t=>t.publicacionId===f.id))
 assert((await request('/api/diseno/reunion')).out.ids.includes(f.id))
 assert.equal((await ok(service.from('marca_reuniones').select('id').eq('marca_id',f.brand))).length,0,'Selection itself must not create or invite to a Calendar meeting')
 const legacy=await create({horaReunion:'14:00',fechaEntrega:'2026-10-23',nombre:'QA Hora al crear'})
 assert.equal(legacy.ok,true,JSON.stringify(legacy));assert.equal((await pending(legacy.data.id)).length,1)
 assert.equal((await action('updateDisenoEntry',[plain.data.id,{horaReunion:'15:00',fechaEntrega:'2026-10-23'}])).ok,true)
 assert.equal((await pending(plain.data.id)).length,1,'Detail time auto-selects')
 await ok(service.from('reunion_temas').update({estado:'presentado'}).eq('publicacion_id',plain.data.id))
 await action('updateDisenoEntry',[plain.data.id,{nombre:'QA Reunión ya presentada'}])
 assert.equal((await pending(plain.data.id)).length,0,'Unrelated saves do not reopen completed meeting topics')
 assert.equal((await action('updateDisenoEntry',[plain.data.id,{fechaEntrega:'2026-10-24'}])).ok,true)
 assert.equal((await pending(plain.data.id)).length,1,'Reschedule reactivates selection without deleting history')
 assert.equal((await ok(service.from('reunion_temas').select('*').eq('publicacion_id',plain.data.id).eq('estado','presentado'))).length,1)
 await request('/api/diseno/reunion',{publicacionId:f.id,activa:false})
 assert.equal((await pending(f.id)).length,0,'Manual deselection still works')
 await request('/api/diseno/reunion',{publicacionId:f.id,activa:true})
 const html=await request(`/diseno/${f.id}`)
 assert(String(html.out).includes('Para presentar en reunión'))
 console.log('PASS: crear Sí/No, action real, botón/API y panel sincronizados, concurrencia, permisos sin tareas parciales, hora en detalle, reprogramación, historial, selección manual y cero eventos/invitaciones.')
 if(process.env.QA_KEEP==='1'){
   await writeFile('/tmp/distinto-reunion-auto-fixture.json',JSON.stringify(f),{mode:0o600});keep=true
   console.log(JSON.stringify({id:f.id,slug:f.slug,fixture:'/tmp/distinto-reunion-auto-fixture.json'}))
 }
}finally{
 await auth.auth.signOut({scope:'local'})
 if(!keep){
   await ok(service.from('publicaciones').delete().in('marca_id',[f.brand,f.otherBrand]))
   await ok(service.from('team_members').delete().eq('id',f.member))
   if(f.user)await ok(service.auth.admin.deleteUser(f.user))
   await ok(service.from('marcas').delete().in('id',[f.brand,f.otherBrand]))
   console.log('Datos QA retirados.')
 }
}
