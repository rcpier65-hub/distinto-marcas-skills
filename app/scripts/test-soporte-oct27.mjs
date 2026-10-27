// node --env-file=.env.local scripts/test-soporte-oct27.mjs
// Prueba con fixtures identificadas y limpieza; no envía mensajes ni invitaciones.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { idPortadaDrive, tipoPortada } from '../lib/cliente/portada.ts'
import { estimarDesfase, segundosTranscurridos } from '../lib/tiempo/reloj.ts'

const base = process.env.TEST_BASE_URL || 'http://localhost:3124'
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const manifest = JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json'))
const sessions = []
async function login(email, password) {
  const jar = new Map()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({name, value})), setAll: cs => cs.forEach(c => jar.set(c.name, c.value)) },
  })
  const r = await auth.auth.signInWithPassword({ email, password }); assert.ifError(r.error)
  const s = { auth, headers: () => ({ cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') }) }
  sessions.push(s); return s
}
async function action(s, name, args) {
  const entry = Object.entries(manifest.node).find(([,v]) => v.exportedName === name && v.filename?.endsWith('/tareas/_plan-actions.ts'))
  assert(entry, `Manifest: ${name}`)
  const r = await fetch(base+'/tareas', { method: 'POST', headers: {...s.headers(), origin: base, 'next-action': entry[0], 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component'}, body: JSON.stringify(args) })
  assert.equal(r.status, 200)
  const text = await r.text(); const result = text.split('\n').find(l => l.startsWith('1:'))
  assert(result && !text.includes('"digest"'), `${name} devuelve resultado`)
  return JSON.parse(result.slice(2))
}
const {data: member, error: meError} = await svc.from('team_members').select('id,email,password_inicial').eq('email','lorena@agenciadistinto.com').single()
assert.ifError(meError)
const {data: client, error: clError} = await svc.from('marca_clientes').select('email,password_inicial,marca_id').eq('email','total@distintostudio.com').single()
assert.ifError(clError)
const {data: pubs, error: pubError} = await svc.from('publicaciones').select('id,nombre,marca_id,portada_editada_url').gte('fecha_publicacion','2026-10-19').lte('fecha_publicacion','2026-10-27').not('portada_editada_url','is',null)
assert.ifError(pubError)
const ownPub = pubs.find(p => p.marca_id === client.marca_id && idPortadaDrive(p.portada_editada_url))
const otherPub = pubs.find(p => p.marca_id !== client.marca_id && idPortadaDrive(p.portada_editada_url))
assert(ownPub && otherPub)
const taskId = randomUUID(), sheetId = randomUUID(), scopedMemberId = randomUUID(), scopedPassword = randomUUID()+'aA!'
let scopedUser
try {
  const team = await login(member.email, member.password_inicial)
  const customer = await login(client.email, client.password_inicial)
  const get = (s,p) => fetch(base+p, {headers:s?.headers(),redirect:'manual'})
  const path = '/api/drive/portada/'+ownPub.id
  const r = await get(team,path)
  assert.equal(r.status,200,`Equipo descarga: ${r.status}`)
  assert(r.headers.get('content-disposition')?.startsWith('attachment;'))
  const bytes = Buffer.from(await r.arrayBuffer()); assert(tipoPortada(bytes))
  const original = await fetch(`https://drive.usercontent.google.com/download?id=${idPortadaDrive(ownPub.portada_editada_url)}&export=download&confirm=t`)
  assert(original.ok)
  const sha = b => createHash('sha256').update(b).digest('hex')
  assert.equal(sha(bytes),sha(Buffer.from(await original.arrayBuffer())), 'Archivo original intacto')
  const clientDownload = await get(customer,path)
  assert.equal(clientDownload.status,200); assert.equal(sha(bytes),sha(Buffer.from(await clientDownload.arrayBuffer())))
  assert.equal((await get(customer,'/api/drive/portada/'+otherPub.id)).status,404)
  assert([307,401].includes((await get(null,path)).status))
  assert.equal((await get(team,'/api/drive/portada/no-es-uuid')).status,400)
  console.log('PASS portada: original idéntico, equipo/cliente, marca ajena, anónimo e ID inválido.')

  const email = `qa-soporte-${scopedMemberId}@example.com`
  const u = await svc.auth.admin.createUser({email,password:scopedPassword,email_confirm:true}); assert.ifError(u.error); scopedUser=u.data.user.id
  const mi = await svc.from('team_members').insert({id:scopedMemberId,auth_user_id:scopedUser,email,nombre:'QA SOPORTE TEMPORAL',rol_base:'community_manager',activo:true,marcas_acceso:[client.marca_id]});assert.ifError(mi.error)
  const scoped = await login(email,scopedPassword)
  assert.equal((await get(scoped,'/api/drive/portada/'+otherPub.id)).status,404)
  const same = await get(scoped,path);assert.equal(same.status,200);await same.body.cancel()
  const disable = await svc.from('team_members').update({activo:false}).eq('id',scopedMemberId);assert.ifError(disable.error)
  assert.equal((await get(scoped,path)).status,403)
  console.log('PASS portada: miembro limitado a su marca y cuenta inactiva bloqueada.')

  const insert = await svc.from('tareas').insert({id:taskId,team_member_id:member.id,created_by:member.id,texto:'QA SOPORTE OCT27 '+taskId,categoria:'QA temporal',completada:false,estado:'sin_empezar',tiempo_seg:37}); assert.ifError(insert.error)
  const before = Date.now();const started = await action(team,'iniciarTarea',[taskId]);assert(started.ok)
  const {data: stored,error: readError} = await svc.from('tareas').select('en_proceso_desde,tiempo_seg').eq('id',taskId).single();assert.ifError(readError)
  assert.equal(started.timer.desde,stored.en_proceso_desde);assert.equal(started.timer.acumulado,37)
  assert(Math.abs(Date.parse(started.timer.desde)-before)<10000)
  const again = await action(team,'iniciarTarea',[taskId]);assert(again.ok);assert.equal(again.timer.desde,started.timer.desde,'Iniciar dos veces conserva la sesión')
  const paused = await action(team,'pausarTarea',[taskId]);assert(paused.ok);assert.equal(paused.timer.desde,null)
  const {data: ended} = await svc.from('tareas').select('tiempo_seg').eq('id',taskId).single()
  assert.equal(paused.timer.acumulado,ended.tiempo_seg);assert(paused.timer.acumulado>=37 && paused.timer.acumulado<60)
  const pauseAgain = await action(team,'pausarTarea',[taskId]);assert(pauseAgain.ok);assert.equal(pauseAgain.timer.acumulado,paused.timer.acumulado)
  const resumed = await action(team,'iniciarTarea',[taskId]);assert(resumed.ok);assert.equal(resumed.timer.acumulado,paused.timer.acumulado)
  await action(team,'pausarTarea',[taskId])
  console.log('PASS cronómetro: inicio confirmado, pausa, reanudar y acumulado persistido sin inventar minutos.')

  const server = Date.parse('2026-10-27T15:00:00.000Z')
  for (const shift of [-120000,120000]) {
    const offset=estimarDesfase(server+shift,server+shift+100,'Tue, 27 Oct 2026 15:00:00 GMT')
    const elapsed=segundosTranscurridos(new Date(server).toISOString(),37,server+shift+10000,offset)
    assert(Math.abs(elapsed-47)<=1,'Reloj dos minutos adelantado/atrasado cuenta diez segundos reales')
  }
  console.log('PASS regresión de reloj ±2 minutos y tiempo previo conservado.')

  const {data: designer,error: designerError}=await svc.from('team_members').select('email,password_inicial').eq('email','ailyn@agenciadistinto.com').single();assert.ifError(designerError)
  const designerSession=await login(designer.email,designer.password_inicial)
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{...designerSession.headers(),origin:base,'content-type':'application/json'},body:JSON.stringify(body)})
  const created=await post('/api/estrategia',{action:'save',slug:'little-joe',record:{id:sheetId,kind:'sheet',title:'QA SOPORTE imágenes '+sheetId,revision:0,archived:false,data:{state:'Borrador',template:'En blanco',sharedWithClient:false}}})
  assert.equal(created.status,200)
  const elements=[],files={}
  for(let i=0;i<2;i++){
    const id=randomUUID();files[id]={id,mimeType:'image/png',dataURL:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1sAAAAASUVORK5CYII=',created:Date.now()}
    elements.push({id:randomUUID(),type:'image',version:1,versionNonce:i+1,isDeleted:false,fileId:id,x:50+i*400,y:50,width:200,height:200})
  }
  const endpoint='/api/estrategia/hojas/'+sheetId
  assert.equal((await post(endpoint,{action:'scene',elements,files})).status,200)
  const saved=await (await get(designerSession,endpoint)).json()
  assert.deepEqual(saved.scene.files,files);assert.equal(saved.scene.elements.length,2)
  assert.equal((await get(customer,endpoint)).status,403,'Boceto interno sigue privado')
  console.log('PASS Planificación: Ailyn guarda varias imágenes, recupera archivos intactos y mantiene privacidad.')
} finally {
  for (const s of sessions) await s.auth.auth.signOut({scope:'local'})
  for (const [table,column,id] of [['strategy_records','id',sheetId],['tareas_tiempos','tarea_id',taskId],['tareas','id',taskId],['team_members','id',scopedMemberId]]) {
    const r=await svc.from(table).delete().eq(column,id);assert.ifError(r.error)
  }
  if(scopedUser){const r=await svc.auth.admin.deleteUser(scopedUser);assert.ifError(r.error)}
  console.log('CLEAN: tareas, tiempos, cuenta y sesiones de prueba eliminados.')
}
