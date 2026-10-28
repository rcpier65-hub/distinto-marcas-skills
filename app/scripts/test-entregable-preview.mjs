// node --env-file=.env.local scripts/test-entregable-preview.mjs
// Usa archivos existentes de solo lectura y fixtures UUID que elimina al terminar.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const base = process.env.TEST_BASE_URL || 'http://localhost:3124'
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sessions = []
const fixture = { task: randomUUID(), pub: randomUUID(), delivery: randomUUID(), member: randomUUID() }
let scopedUser
const sha = b => createHash('sha256').update(b).digest('hex')
const linkA = 'https://drive.google.com/open?id=1VQUU75eL5Y1xeENbKrulPe_3zvc4P3Y0&usp=drive_fs'
const linkB = 'https://app.distintostudio.com/icons/icon-192.png'
const realId = 'aed7eb26-45b9-4178-80ed-3347e96e7730'
async function login(email, password) {
  const jar = new Map()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name,value])=>({name,value})), setAll: cs=>cs.forEach(c=>jar.set(c.name,c.value)) },
  })
  const r = await auth.auth.signInWithPassword({email,password});assert.ifError(r.error)
  const s = {auth,headers:()=>({cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')})}; sessions.push(s); return s
}
async function query(q) { const r = await q; assert.ifError(r.error); return r.data }
async function original(link) {
  const r=await fetch(new URL(link).hostname === 'drive.google.com' ? `https://drive.usercontent.google.com/download?id=${new URL(link).searchParams.get('id')}&export=download&confirm=t` : link)
  assert(r.ok);assert(r.headers.get('content-type')?.startsWith('image/'));return Buffer.from(await r.arrayBuffer())
}
const get=(s,path)=>fetch(base+path,{headers:s?.headers(),redirect:'manual'})
const path=(id=fixture.delivery,slide=0)=>`/api/diseno/entregables/${id}/preview?slide=${slide}`
async function image(s,p,expected) {
  const r=await get(s,p);assert.equal(r.status,200,`Preview HTTP ${r.status}`)
  assert.equal(r.headers.get('cache-control'),'private, no-store')
  assert(r.headers.get('content-type')?.startsWith('image/'))
  assert.equal(sha(Buffer.from(await r.arrayBuffer())),sha(expected),'El preview coincide byte por byte con el original actual')
}
async function action(s,name,args) {
  const manifestPath=process.env.TEST_MANIFEST || '.next/server/server-reference-manifest.json'
  const m=JSON.parse(fs.readFileSync(manifestPath))
  const entry=Object.entries(m.node).find(([,v])=>v.exportedName===name && v.filename?.endsWith('/diseno/_entregables-actions.ts'))
  assert(entry,`Action ${name}`)
  const r=await fetch(base+'/diseno/'+fixture.task,{method:'POST',headers:{...s.headers(),origin:base,'next-action':entry[0],'content-type':'text/plain;charset=UTF-8',accept:'text/x-component'},body:JSON.stringify(args)})
  assert.equal(r.status,200)
  const raw=await r.text(); const line=raw.split('\n').find(l=>l.startsWith('1:{'))
  assert(line && !raw.includes('"digest"'),`${name}: ${raw.slice(0,300)}`)
  const result=JSON.parse(line.slice(2));assert.equal(result.ok,true,result.error);return result
}
const realBefore=await query(svc.from('diseno_entregables').select('*').eq('id',realId).single())
const realPublication=await query(svc.from('publicaciones').select('*').eq('id',realBefore.publicacion_id).single())
const versionsBefore=await query(svc.from('creative_versions').select('*').eq('publicacion_id',realBefore.publicacion_id))
try {
  const member=await query(svc.from('team_members').select('email,password_inicial').eq('email','ailyn@agenciadistinto.com').single())
  const team=await login(member.email,member.password_inicial)
  const [a,b]=await Promise.all([original(linkA),original(linkB)])
  assert.notEqual(sha(a),sha(b))
  await image(team,path(realId),a);await image(team,path(realId)+'&v=2',a)
  console.log('PASS Vid Natur: original actual, sin caché; refrescar no crea versiones ni modifica el diseño.')

  await query(svc.from('publicaciones').insert([
    {id:fixture.task,marca_id:realPublication.marca_id,nombre:'QA PREVIEW TEMPORAL '+fixture.task,es_tarea_diseno:true},
    {id:fixture.pub,marca_id:realPublication.marca_id,nombre:'QA PREVIEW ENTREGABLE '+fixture.pub,es_tarea_diseno:false},
  ]))
  await query(svc.from('diseno_entregables').insert({id:fixture.delivery,tarea_id:fixture.task,publicacion_id:fixture.pub,titulo:'QA PREVIEW',link:linkA}))
  // Compila la página en dev para registrar las server actions; en producción es una lectura normal.
  await (await get(team,'/diseno/'+fixture.task)).text()
  await action(team,'guardarEntregable',[fixture.delivery,{link:linkA}]); await image(team,path(),a)
  await action(team,'guardarEntregable',[fixture.delivery,{link:linkB}]); await image(team,path(),b)
  const saved=await query(svc.from('diseno_entregables').select('link').eq('id',fixture.delivery).single())
  const pub=await query(svc.from('publicaciones').select('drive_resultado_url,portada_editada_url').eq('id',fixture.pub).single())
  assert.equal(saved.link,linkB);assert.equal(pub.drive_resultado_url,linkB);assert.equal(pub.portada_editada_url,linkB)
  const versions=await query(svc.from('creative_versions').select('slot,version,url').eq('publicacion_id',fixture.pub).eq('slot','diseno').order('version'))
  assert.deepEqual(versions.map(v=>[v.version,v.url]),[[1,linkA],[2,linkB]])
  await action(team,'guardarSlides',[fixture.delivery,[linkB,linkA]])
  await image(team,path(),b);await image(team,path(fixture.delivery,1),a)
  assert.equal((await get(team,path(fixture.delivery,2))).status,404)
  assert.equal((await get(team,path(fixture.delivery,-1))).status,400)
  assert.equal((await get(team,path('invalido'))).status,400)
  console.log('PASS guardado: cambiar enlace se conserva en entrega/publicación y V1/V2; carrusel devuelve cada slide correcto.')

  const client=await query(svc.from('marca_clientes').select('email,password_inicial,marca_id').eq('email','total@distintostudio.com').single())
  const customer=await login(client.email,client.password_inicial)
  const blockedClient=await get(customer,path())
  assert([307,403].includes(blockedClient.status))
  if(blockedClient.status===307) assert.equal(new URL(blockedClient.headers.get('location'),base).pathname,'/cliente')
  assert([307,401].includes((await get(null,path())).status))
  const password=randomUUID()+'aA!';const email=`qa-preview-${fixture.member}@example.com`
  const u=await svc.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);scopedUser=u.data.user.id
  await query(svc.from('team_members').insert({id:fixture.member,auth_user_id:scopedUser,email,nombre:'QA PREVIEW TEMPORAL',rol_base:'community_manager',activo:true,marcas_acceso:[client.marca_id]}))
  const scoped=await login(email,password)
  assert.equal((await get(scoped,path())).status,404)
  await query(svc.from('team_members').update({activo:false}).eq('id',fixture.member))
  assert.equal((await get(scoped,path())).status,403)
  console.log('PASS permisos: Ailyn accede; anónimo, cliente, miembro de otra marca e inactivo bloqueados.')
} finally {
  for(const s of sessions) await s.auth.auth.signOut({scope:'local'})
  await query(svc.from('publicaciones').delete().in('id',[fixture.task,fixture.pub]))
  await query(svc.from('team_members').delete().eq('id',fixture.member))
  if(scopedUser){const r=await svc.auth.admin.deleteUser(scopedUser);assert.ifError(r.error)}
  assert.deepEqual(await query(svc.from('diseno_entregables').select('*').eq('id',realId).single()),realBefore)
  assert.deepEqual(await query(svc.from('publicaciones').select('*').eq('id',realBefore.publicacion_id).single()),realPublication)
  assert.deepEqual(await query(svc.from('creative_versions').select('*').eq('publicacion_id',realBefore.publicacion_id)),versionsBefore)
  console.log('CLEAN: fixtures y sesiones eliminadas; entrega real, publicación y versiones intactas.')
}
