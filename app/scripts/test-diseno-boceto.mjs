// Prueba el action real y las APIs existentes con datos temporales; no envía avisos.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import env from '@next/env'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3122'
const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'))
const actionId=process.env.TEST_ACTION_ID||Object.entries(manifest.node).find(([,v])=>v.exportedName==='crearDisenoTask')[0]
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const u=new URL(process.env.SUPABASE_DB_URL||process.env.SUPABASE_DB_URL_DIRECT)
const db=new pg.Client({user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),host:u.hostname,port:Number(u.port)||5432,database:u.pathname.slice(1),ssl:{rejectUnauthorized:false}})
const uid=randomUUID(), brandA=randomUUID(),brandB=randomUUID(),member=randomUUID(),userIds=[],sessions=[]
const slugA=`qa-boceto-${uid}`,slugB=`qa-boceto-b-${uid}`
async function ok(p){const r=await p;assert.ifError(r.error);return r.data}
async function session(email){const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});const link=await ok(service.auth.admin.generateLink({type:'magiclink',email}));await ok(auth.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));sessions.push(auth);return ()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
async function request(path,cookie,data,extra={}){const r=await fetch(base+path,{method:data?'POST':'GET',redirect:'manual',headers:{...(cookie?{cookie:cookie()}:{}),...(data?{'Content-Type':'application/json',origin:new URL(base).origin}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});const raw=await r.text();let out;try{out=JSON.parse(raw)}catch{out=raw}return {status:r.status,out}}
async function create(cookie,input){const r=await request('/diseno',cookie,[input],{'Next-Action':actionId,Accept:'text/x-component'});if(typeof r.out==='string'){for(const line of r.out.split('\n')){const p=line.indexOf(':');try{const v=JSON.parse(line.slice(p+1));if(typeof v.ok==='boolean')return v}catch{}}}throw new Error(`Action response ${r.status}: ${String(r.out).slice(0,180)}`)}
const records=()=>db.query('SELECT * FROM strategy_records WHERE marca_id=ANY($1::uuid[])',[[brandA,brandB]])
try{
 await db.connect()
 await ok(service.from('marcas').insert([{id:brandA,slug:slugA,nombre:'QA Boceto A',activa:true},{id:brandB,slug:slugB,nombre:'QA Boceto B',activa:true}]))
 const owner=await session('pedro@agenciadistinto.com')
 const email=`qa-boceto-${uid}@example.com`, clientEmail=`qa-boceto-cliente-${uid}@example.com`
 for(const mail of [email,clientEmail]){const user=await ok(service.auth.admin.createUser({email:mail,email_confirm:true}));userIds.push(user.user.id)}
 await ok(service.from('team_members').insert({id:member,auth_user_id:userIds[0],email,nombre:'QA Diseño boceto',rol_base:'disenador',activo:true,marcas_acceso:[brandB],permisos_override:{diseno:{acceso:true},marcas:{acceso:true}}}))
 await ok(service.from('marca_clientes').insert({marca_id:brandA,auth_user_id:userIds[1],email:clientEmail,nombre:'QA Cliente boceto'}))
 const restricted=await session(email),client=await session(clientEmail)
 const input={solicitudId:randomUUID(),nombre:'QA Boceto original',esParaPublicar:false,tipoDiseno:'interno',marcaSlug:slugA,tieneBoceto:true}
 assert.equal((await create(restricted,input)).ok,false)
 assert.equal((await create(owner,{...input,marcaSlug:'interno'})).ok,false)
 assert.equal((await records()).rows.length,0,'Failures must not leave a half-created sketch')
 const plain=await create(owner,{...input,solicitudId:randomUUID(),tieneBoceto:false,nombre:'QA Sin boceto'})
 assert(plain.ok);assert.equal((await records()).rows.length,0)
 const results=await Promise.all(Array.from({length:3},()=>create(owner,input)))
 results.forEach(r=>assert.equal(r.ok,true,JSON.stringify(r)))
 const design=results[0].data.id;let sheets=(await records()).rows
 assert.equal(sheets.length,1);let sheet=sheets[0]
 assert.equal(sheet.boceto_publicacion_id,design);assert.equal(sheet.data.sharedWithClient,false)
 const href=`/marca/${slugA}/estrategia/hoja/${sheet.id}`
 results.forEach(r=>assert.equal(r.data.bocetoHref,href))
 const endpoint=`/api/estrategia/hojas/${sheet.id}`
 assert.equal((await request(endpoint,restricted)).status,403)
 assert([403,307].includes((await request(endpoint,client)).status))
 assert([401,307].includes((await request(endpoint,null)).status))
 const fileId=randomUUID(),image={id:fileId,mimeType:'image/png',dataURL:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1sAAAAASUVORK5CYII=',created:Date.now()}
 const drawing={id:randomUUID(),type:'rectangle',version:1,versionNonce:7,x:100,y:100,width:250,height:150,isDeleted:false,strokeColor:'#8b5cf6'}
 const patch={action:'scene',elements:[drawing,{...drawing,id:randomUUID(),type:'image',fileId}],files:{[fileId]:image}}
 assert.equal((await request(endpoint,owner,patch,{origin:'https://unrelated.example'})).status,403)
 assert.equal((await request(endpoint,owner,patch)).status,200)
 let scene=(await request(endpoint,owner)).out.scene
 assert.equal(scene.files[fileId].dataURL,image.dataURL);assert.equal(scene.elements.length,2)
 let plan=await request(`/api/estrategia?marca=${slugA}`,owner)
 assert.equal(plan.status,200);assert.equal(plan.out.records.filter(r=>r.boceto_publicacion_id===design).length,1)
 const detail=await request(`/diseno/${design}`,owner);assert(String(detail.out).includes(href));assert(String(detail.out).includes('aria-label="Boceto"'))
 const html=await request(`/marca/${slugA}/estrategia`,client);assert(!String(html.out).includes('QA Boceto original'),'Private sketch must not appear in client payload')
 await ok(service.from('publicaciones').update({nombre:'QA Renombrado',estado_tarea:'en_progreso'}).eq('id',design))
 sheet=(await records()).rows[0];assert.equal(sheet.title,'Boceto · QA Renombrado');assert.equal(sheet.id,sheets[0].id)
 assert.equal((await request(endpoint,owner)).out.scene.files[fileId].dataURL,image.dataURL)
 await ok(service.from('publicaciones').update({estado_tarea:'archivado',archived_at:new Date().toISOString()}).eq('id',design));assert.equal((await records()).rows[0].archived,true)
 await ok(service.from('publicaciones').update({estado_tarea:'sin_empezar',archived_at:null}).eq('id',design));assert.equal((await records()).rows[0].archived,false)
 await db.query("UPDATE strategy_records SET data=data||'{\"sharedWithClient\":true}' WHERE id=$1",[sheet.id])
 await ok(service.from('publicaciones').update({marca_id:brandB}).eq('id',design))
 sheet=(await records()).rows[0];assert.equal(sheet.marca_id,brandB);assert.equal(sheet.data.sharedWithClient,false)
 assert.equal((await request(endpoint,restricted)).status,200);assert([403,307].includes((await request(endpoint,client)).status))
 assert.equal((await request(endpoint,owner)).out.scene.files[fileId].dataURL,image.dataURL)
 // A contextual link must not block deletion of a sketch with its original task.
 await db.query("INSERT INTO strategy_links(id,marca_id,sheet_id,target_type,target_id) VALUES($1,$2,$3,'publication',$4)",[randomUUID(),brandB,sheet.id,design])
 await ok(service.from('publicaciones').delete().eq('id',design))
 assert.equal((await records()).rows.length,0)
 assert.equal((await db.query('SELECT 1 FROM strategy_scenes WHERE sheet_id=$1',[sheet.id])).rowCount,0)
 console.log('PASS: action real Sí/No, reintentos concurrentes, hoja única en Planificación, imágenes y trazos persistentes, permisos, privacidad, título/marca/archivado y eliminación íntegra.')
}finally{
 await Promise.allSettled(sessions.map(s=>s.auth.signOut({scope:'local'})))
 await db.query('DELETE FROM strategy_links WHERE marca_id=ANY($1::uuid[])',[[brandA,brandB]])
 await ok(service.from('publicaciones').delete().in('marca_id',[brandA,brandB]))
 await db.query('DELETE FROM strategy_records WHERE marca_id=ANY($1::uuid[])',[[brandA,brandB]])
 await ok(service.from('marca_clientes').delete().in('marca_id',[brandA,brandB]))
 await ok(service.from('team_members').delete().eq('id',member))
 for(const id of userIds) await ok(service.auth.admin.deleteUser(id))
 await ok(service.from('marcas').delete().in('id',[brandA,brandB]));await db.end()
 console.log('QA eliminado; cuentas y trabajo real conservados.')
}
