// Fixtures temporales; sin mensajes ni cambios sobre tareas reales.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { fechaLimaIso } from '../lib/inicio/load-reporte-del-dia.shared.ts'
const base = process.env.TEST_BASE_URL || 'http://localhost:3105'
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const manifest=JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json'))
const tag=`QA OCT12 ${randomUUID()}`, taskIds=[], pubIds=[], sessions=[]
let current
async function login(member){
 const cookies=new Map()
 const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>cookies.set(c.name,c.value))}})
 const {data,error}=await service.auth.admin.generateLink({type:'magiclink',email:member.email});assert.ifError(error)
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error)
 current={cookies,auth};sessions.push(current)
}
async function action(path,name,args,allowError=false){
 const entry=Object.entries(manifest.node).find(([,v])=>v.exportedName===name);assert(entry,name)
 const res=await fetch(base+path,{method:'POST',headers:{cookie:[...current.cookies].map(([k,v])=>`${k}=${v}`).join('; '),'next-action':entry[0],'content-type':'text/plain;charset=UTF-8',accept:'text/x-component',origin:base},body:JSON.stringify(args)})
 const body=await res.text();assert.equal(res.status,200,name);const line=body.split('\n').find(l=>l.startsWith('1:'));assert(line,`${name}: no resultado`);const result=JSON.parse(line.slice(2));assert(!result.digest,`${name}: ${JSON.stringify(result)}`);if(!allowError) assert(result.ok!==false,`${name}: ${JSON.stringify(result)}`);return result
}
async function page(path){const r=await fetch(base+path,{headers:{cookie:[...current.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}});assert.equal(r.status,200);const h=await r.text();assert(!h.includes('NEXT_HTTP_ERROR_FALLBACK;500'));return h}
async function insert(table,row){assert.ifError((await service.from(table).insert(row)).error)}
const {data:members,error}=await service.from('team_members').select('id,nombre,email,auth_user_id,rol_base').eq('activo',true);assert.ifError(error)
const lorena=members.find(m=>m.nombre==='LORENA'),ailyn=members.find(m=>m.rol_base==='disenador'),pieer=members.find(m=>m.nombre==='PIEER MEDINA')
try {
 for(const tz of ['UTC','America/Lima','Asia/Tokyo']){process.env.TZ=tz;assert.equal(fechaLimaIso(new Date('2026-10-10T00:21:00Z')),'2026-10-09');assert.equal(fechaLimaIso(new Date('2026-10-10T05:00:00Z')),'2026-10-10')}
 console.log('PASS fecha Lima: reporte del viernes a las 19:21 en 3 zonas del servidor.')
 for(const m of members){const id=randomUUID();taskIds.push(id);await insert('tareas',{id,texto:tag+' '+m.nombre,categoria:'QA',color:'#7170ff',team_member_id:m.id,created_by:m.id,estado:'sin_empezar',completada:false})}
 for(let i=0;i<members.length;i++){
  const m=members[i];await login(m)
  const floating=await action('/tareas','listarTareasFlotantes',[]);assert(floating.some(t=>t.id===taskIds[i]),m.nombre+' ve pendiente sin iniciar');assert(!floating.some(t=>taskIds.includes(t.id)&&t.id!==taskIds[i]),'Solo tareas propias')
  if(m.rol_base==='editor') {const forbidden=await action('/tareas','completarTarea',[taskIds[0]],true);assert.equal(forbidden.ok,false,'No completa tareas ajenas')}
  await action('/tareas','iniciarTarea',[taskIds[i]]);await action('/tareas','pausarTarea',[taskIds[i]]);await action('/tareas','completarTarea',[taskIds[i]])
  assert(!(await action('/tareas','listarTareasFlotantes',[])).some(t=>t.id===taskIds[i]))
  const {data:t,error:e}=await service.from('tareas').select('completada,completada_at,en_proceso_desde').eq('id',taskIds[i]).single();assert.ifError(e);assert(t.completada&&t.completada_at&&!t.en_proceso_desde)
  console.log('PASS checklist personal, cronómetro y Listo:',m.nombre)
 }
 await login(lorena)
 for(const [text,slug,cat] of [['Guiones distribuidora','distribuidora-fitness','Distribuidora Fitness Marketing'],['Guiones para TOTAL SUPPS','total-sups','TOTAL SUPS'],['Guiones para Total Sups','total-sups','TOTAL SUPS']]){
  const r=await action('/tareas','crearTarea',[text+' '+tag]);taskIds.push(r.tarea.id);assert.equal(r.tarea.marcaSlug,slug);assert.equal(r.tarea.categoria,cat)
 }
 console.log('PASS marcas: Distribuidora, Total Supps y Total Sups.')
 const {data:marca}=await service.from('marcas').select('id').eq('slug','interno').single()
 const id=randomUUID();pubIds.push(id)
 await insert('publicaciones',{id,marca_id:marca.id,nombre:tag+' diseño',fecha_publicacion:'2099-10-12',estado:'disenar',estado_tarea:'listo',es_tarea_diseno:false,created_by:lorena.auth_user_id,tipo_contenido:['POST']})
 await action('/publicaciones/'+id,'updatePublicacion',[id,{copy:'Texto prueba guardado',copy_listo:true,portada_lista:true,es_tarea_diseno:true}])
 let q=await service.from('publicaciones').select('copy,copy_listo,portada_lista,estado_tarea,diseno_terminado_at').eq('id',id).single();assert.ifError(q.error);assert(q.data.copy_listo&&q.data.portada_lista&&q.data.copy==='Texto prueba guardado');assert.equal(q.data.estado_tarea,'sin_empezar');assert.equal(q.data.diseno_terminado_at,null)
 assert((await page('/publicaciones/'+id)).includes('Texto prueba guardado'))
 await login(ailyn);assert((await page('/diseno')).includes(id))
 await action('/diseno','updateDisenoEntry',[id,{subEstado:'en_progreso'}]);await action('/diseno','updateDisenoEntry',[id,{subEstado:'listo'}])
 q=await service.from('publicaciones').select('es_tarea_diseno,diseno_terminado_at,disenador_nombre').eq('id',id).single();assert(q.data.diseno_terminado_at&&q.data.disenador_nombre===ailyn.nombre&&!q.data.es_tarea_diseno)
 assert(!(await page('/diseno')).includes(id),'Diseño completado sale del pendiente')
 const week=await action('/inicio','generarReporteSemana',[]);assert(week.texto.includes(tag+' diseño'),'Diseño en reporte de Ailyn')
 console.log('PASS guardar copy/portada sin pantalla negra, diseño no se completa solo, Listo sale del pendiente y entra al reporte.')
 await login(pieer)
 const old=await action('/inicio','generarReporteSemana',['2026-10-09','2026-10-09']);assert(old.texto.includes('ALCAHOFA')&&old.texto.includes('SUPLEMENTOS CLAVE'))
 console.log('PASS reporte histórico Pieer del 9-oct contiene su trabajo de esa noche.')
}finally{
 for(const id of pubIds){await service.from('actividad').delete().eq('entidad_id',id);assert.ifError((await service.from('publicaciones').delete().eq('id',id)).error)}
 for(const id of taskIds){await service.from('tareas_tiempos').delete().eq('tarea_id',id);assert.ifError((await service.from('tareas').delete().eq('id',id)).error)}
 for(const s of sessions)await s.auth.auth.signOut({scope:'local'})
 console.log('CLEAN fixtures y sesiones eliminados')
}
