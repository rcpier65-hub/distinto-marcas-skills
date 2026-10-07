// Prueba HTTP del build local. Crea solo fixtures temporales y las elimina.
// No envía correos, push ni mensajes; las credenciales quedan en memoria.
// Uso: node --env-file=.env.local scripts/test-soporte-octubre.mjs
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
const base = 'http://localhost:3105'
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const manifest = JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json'))
const cookies = new Map()
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...cookies].map(([name,value]) => ({name,value})), setAll: cs => cs.forEach(c => cookies.set(c.name,c.value)) } })
const { data: member, error: memberError } = await service.from('team_members').select('id, email').eq('email','pedro@agenciadistinto.com').single()
assert.ifError(memberError)
const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: 'magiclink', email: member.email })
assert.ifError(linkError)
const { error: loginError } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
assert.ifError(loginError)
const cookieHeader = () => [...cookies].map(([k,v]) => `${k}=${v}`).join('; ')
async function action(path, name, args, file) {
  const entry = Object.entries(manifest.node).find(([,v]) => v.exportedName === name && (!file || v.filename === file))
  assert(entry, `Acción ${name} en manifest`)
  const r = await fetch(base+path, { method: 'POST', headers: { cookie: cookieHeader(), 'next-action': entry[0], 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component', origin: base }, body: JSON.stringify(args) })
  const body = await r.text()
  assert.equal(r.status,200,`HTTP acción ${name}`)
  assert(!/"ok":false|"digest":/.test(body),`Acción ${name} sin error`)
  const line = body.split('\n').find(l => l.startsWith('1:'))
  assert(line,`Resultado ${name}`)
  return JSON.parse(line.slice(2))
}
async function page(path) {
  const r = await fetch(base+path, { headers: { cookie: cookieHeader() } }); assert.equal(r.status,200); const html=await r.text();assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'));return html
}
async function insert(table, row) { const {error}=await service.from(table).insert(row);assert.ifError(error) }
const pubId=randomUUID(), tareaId=randomUUID(), entId=randomUUID(), madreId=randomUUID(), extraId=randomUUID(), tag=`PRUEBA SOPORTE ${randomUUID()}`
const {data:marca,error:marcaError}=await service.from('marcas').select('id,slug').eq('slug','lozano').single();assert.ifError(marcaError)
let reminderId
try {
  await insert('publicaciones',{id:madreId,marca_id:marca.id,nombre:tag+' madre',es_tarea_diseno:true,estado:'disenar',tipo_contenido:['HISTORIA'],created_by:link.user.id})
  await insert('publicaciones',{id:pubId,marca_id:marca.id,nombre:tag+' historia',fecha_publicacion:'2099-10-05',estado:'programar',tipo_contenido:['HISTORIA'],created_by:link.user.id})
  await insert('diseno_entregables',{id:entId,tarea_id:madreId,publicacion_id:pubId,orden:1,titulo:tag,fecha:'2099-10-05'})
  await insert('publicaciones',{id:extraId,marca_id:marca.id,nombre:tag+' carrusel',fecha_publicacion:'2099-10-05',estado:'programar',tipo_contenido:['CARRUSEL'],enlace_tomas:'https://drive.google.com/drive/folders/test-material',drive_resultado_url:'https://drive.google.com/file/d/test-result/view',carrusel_slides:['https://example.com/slide1.png','https://example.com/slide2.png'],created_by:link.user.id})
  await action(`/diseno/${madreId}`,'guardarEntregable',[entId,{hora:'18:30'}])
  const {data:pub,error:pubError}=await service.from('publicaciones').select('hora_publicacion').eq('id',pubId).single();assert.ifError(pubError);assert.equal(pub.hora_publicacion,'18:30:00')
  const cal=await action('/diseno','calendarioMarcaParaDiseno',[marca.slug,'2099-10-01','2099-10-14'])
  assert(cal.ok && cal.pubs.some(p=>p.id===pubId&&p.hora==='18:30') && cal.pubs.some(p=>p.id===extraId))
  const detail=await page(`/diseno/${madreId}`);assert(detail.includes('Hora de publicación (Lima)')&&detail.includes('18:30'))
  const hoy=await page('/publicaciones/publicar-hoy?fecha=2099-10-05');assert(hoy.includes('Carrusel')&&hoy.includes('Slide 2')&&hoy.includes('Abrir material para editar (Drive)')&&hoy.includes('18:30'));assert(!hoy.includes('Descargar video'))
  await action(`/publicaciones/${pubId}`,'updatePublicacion',[pubId,{indicaciones_edicion:'PRUEBA: cortes y subtítulos',opcion_2:'https://example.com/referencia'}])
  const editor=await page(`/publicaciones/${pubId}`);assert(editor.includes('Espacio del editor')&&editor.includes('PRUEBA: cortes y subtítulos')&&editor.includes('referencias-editor'))
  console.log('PASS: hora en entregable y publicación, calendario de marca, carrusel y Drive, espacio del editor.')
  await insert('tareas',{id:tareaId,team_member_id:member.id,created_by:member.id,texto:tag,categoria:'PRUEBA',color:'#7170ff',completada:false,estado:'sin_empezar'})
  await action('/tareas','iniciarTarea',[tareaId])
  const timers=await action('/recordatorios','listarTareasFlotantes',[]);assert(timers.some(t=>t.id===tareaId&&t.en_proceso_desde))
  await action('/recordatorios','pausarTarea',[tareaId])
  const paused=await action('/recordatorios','listarTareasFlotantes',[]);assert(paused.some(t=>t.id===tareaId&&!t.en_proceso_desde))
  await action('/recordatorios','iniciarTarea',[tareaId]);await action('/recordatorios','pausarTarea',[tareaId])
  console.log('PASS: iniciar, pausar y reanudar cronómetro desde otro módulo.')
  await action('/recordatorios','crearRecordatorio',[tag])
  const rs=await action('/recordatorios','listarRecordatorios',[]);reminderId=rs.find(r=>r.texto===tag)?.id;assert(reminderId)
  assert((await page('/recordatorios')).includes(tag))
  await action('/recordatorios','marcarRecordatorio',[reminderId,true])
  const listo=await action('/recordatorios','listarRecordatorios',[]);assert(listo.find(r=>r.id===reminderId)?.listo)
  await action('/recordatorios','marcarRecordatorio',[reminderId,false])
  console.log('PASS: recordatorio persistente, listo y recuperación.')
} finally {
  const removals=[['actividad',pubId,'entidad_id'],['recordatorios',reminderId],['tareas_tiempos',tareaId,'tarea_id'],['tareas',tareaId],['diseno_entregables',entId],... [madreId,pubId,extraId].map(id=>['publicaciones',id])]
  for(const [table,id,column='id'] of removals) if(id){const {error}=await service.from(table).delete().eq(column,id);assert.ifError(error)}
  await auth.auth.signOut({scope:'local'})
  console.log('CLEAN: fixtures y sesión de prueba eliminados.')
}
