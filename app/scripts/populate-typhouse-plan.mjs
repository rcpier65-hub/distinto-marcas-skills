// One-time, idempotent population requested by Pedro. Uses existing authorized
// APIs; no tasks, meetings, assignments, notifications or client sharing created.
// Preview: node scripts/populate-typhouse-plan.mjs ; apply: add --apply
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.PLAN_BASE_URL || 'https://app.distintostudio.com'
const slug='little-joe',brandId='23d586df-2392-4a22-a750-8ad09862f80e'
const title='Plan de trabajo · TypHouse · octubre 2026'
const objective='Ordenar el contenido ya producido, cerrar las piezas de diseño pendientes y conectar la medición de la marca.'
const description=`BORRADOR PARA REVISIÓN DE PEDRO · 15–31 de octubre de 2026.

1. CONTENIDO Y PUBLICACIÓN
Revisar las piezas existentes del 15 al 24 de octubre: historias, TE HE PERDIDO, DEBES TENER, CARRO DE UN AMIGO, NO DEBERÍAS HACER y ANTES DE VIAJAR. Revisar aprobación, copy, portada y material final en la grilla antes de programar. La edición ya marcada como terminada se conserva; no se vuelve a asignar.

2. DISEÑO Y MATERIAL COMERCIAL
Dar seguimiento al blister Sport Boys y al BANNER EQUIPOS MERCADO LIBRE. Usar los banners y ajustes del catálogo terminados como material disponible. La tarea existente de 3 historias semanales organiza ese frente; falta confirmar fechas de las tareas que siguen sin fecha.

3. WEB Y OPERACIÓN
Revisar con Pedro las tareas existentes de hosting/correo, libro de reclamaciones, checkout y almacenes. Confirmar su vigencia antes de fijar una fecha. Este plan no cambia responsables ni fechas.

4. MEDICIÓN
Autorizar Facebook e Instagram de TypHouse mediante la API oficial de Meta. Verificar el acceso a las cuentas y consultar seguidores, alcance e interacciones disponibles. TikTok requiere una conexión independiente. El VPS puede alojar un MCP que use esta misma integración para consultas desde chats. Separar estas métricas de los resultados de Ads, consultas y ventas. No hay una meta numérica aprobada ni cifras cargadas manualmente.

CÓMO TRABAJAR
Abrir una actividad vinculada → actualizarla en su módulo original → volver al plan para ver su estado. Usar el lienzo para revisar prioridades y la pestaña Reunión para recoger decisiones reales. Solo crear tareas nuevas si aparece trabajo nuevo.

POR CONFIRMAR
Responsable y fecha de cada pendiente sin programar; stock y oferta de productos; fecha de la siguiente grabación; alcance comercial del mes. La marca tiene 2 sesiones como objetivo configurado, pero no hay grabaciones de octubre registradas. No se presupone una reunión realizada ni aprobación del cliente.`
const profile={
 positioning:'TypHouse reúne marcas y soluciones para el auto, el hogar y la vida cotidiana. Su catálogo incluye Little Joe, Dr. Marcus, TyP Tech, CarAudio, CarCare y Mil Ideas. La web presenta productos individuales, packs, regalos y opciones para empresas. Little Joe es una línea dentro de TypHouse; no representa todo el negocio.',
 audience:'Públicos de trabajo propuestos: personas que buscan aromatizar, equipar o cuidar su auto; compradores de regalos y accesorios; empresas interesadas en regalos corporativos; comercios y distribuidores. Validar prioridades, ubicaciones y peso de cada segmento con el cliente antes de fijar campañas.',
 tone:'Guía editorial propuesta: cercano, claro y útil. Mostrar beneficios mediante situaciones cotidianas. En Little Joe, mantener el humor, el juego y la personalidad de Joe y Joya que ya aparecen en los guiones. Adaptar el lenguaje a cada línea; evitar atribuir a toda TypHouse el origen italiano o el tono de una sola marca.',
 mandatory:'Identificar TypHouse y la marca del producto. Mostrar el producto real, su uso y la variante correcta. Utilizar logos y artes aprobados. Añadir una llamada a la acción coherente con la pieza: consultar, visitar la tienda o conocer el producto. Confirmar stock, precio, condiciones y aprobación antes de publicar una oferta.',
 say:'Ejes editoriales propuestos: utilidad y cuidado del auto; aromas y personalidad de Little Joe; regalos y ocasiones de uso; novedades y familias de producto; contenido comercial para distribuidores. Partir de las publicaciones, guiones y diseños existentes.',
 avoid:'No inventar disponibilidad, descuentos, resultados, certificaciones ni duración de aromas. No mezclar las condiciones de compra minorista con las de mayoristas. No presentar una propuesta como acuerdo aprobado. No duplicar tareas ni reiniciar piezas terminadas.',
 brandFormat:'Trabajar con la grilla y sus formatos registrados: reels, historias y piezas comerciales. La tarea activa de historias indica 3 por semana; esto es una instrucción operativa existente, no un alcance comercial nuevo. Reutilizar el material final validado desde los módulos originales.',
 character:'Los guiones existentes de Little Joe utilizan Joe y Joya en situaciones de humor y conversación. Usarlos cuando la pieza corresponda a esa línea; no forzar esos personajes en el resto del catálogo.',
 offer:'Catálogo de aromatizantes, accesorios y cuidado del auto, tecnología, productos para el hogar y regalos. Tienda oficial: https://typhouse.pe/. Hay frentes comerciales para packs, personalización corporativa y distribución. Precios, stock, promociones y condiciones deben verificarse en la oferta vigente; no se fija ningún descuento en este contexto.',
 sources:[
 {id:randomUUID(),name:'Catálogo y presentación oficial de TypHouse · revisado 15/10/2026',kind:'web',url:'https://typhouse.pe/',content:'Fuente para las familias del catálogo, compra minorista y canales corporativo/mayorista. Las condiciones comerciales son variables y deben confirmarse antes de publicar.',verified:true},
 {id:randomUUID(),name:'Trabajo existente en Distinto · 15/10/2026',kind:'nota',url:'',content:'Tareas de historias, blister Sport Boys y operación web; diseños de Mercado Libre y catálogo; publicaciones programadas del 15 al 24 de octubre. La guía editorial y los segmentos anteriores son una propuesta editable para revisión de Pedro, no acuerdos nuevos del cliente.',verified:true}
 ]
}
console.log(JSON.stringify({brand:'TypHouse',title,objective,createsTasks:false,sharesWithClient:false,apply:process.argv.includes('--apply')}))
if(!process.argv.includes('--apply'))process.exit(0)
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const jar=new Map(),auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(r=>jar.set(r.name,r.value))}})
async function api(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:base,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}); const j=await r.json();assert(r.ok,`${path}: ${j.error || r.status}`);return j}
const before=await service.from('tareas').select('id',{count:'exact',head:true}).eq('marca_slug',slug);assert.ifError(before.error)
try {
 const {data:link,error}=await service.auth.admin.generateLink({type:'magiclink',email:'pedro@agenciadistinto.com'});assert.ifError(error)
 assert.ifError((await auth.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'})).error)
 let brand=await api(`/api/estrategia?marca=${slug}`); assert.equal(brand.brand.id,brandId)
 if(!brand.profile)await api('/api/creative-studio',{action:'profile',brandId,revision:0,data:profile})
 else console.log('Existing profile preserved')
 const save=(kind,title,data)=>api('/api/estrategia',{action:'save',slug,record:{id:randomUUID(),kind,title,revision:0,archived:false,data}})
 let sheet=brand.records.find(r=>r.kind==='sheet' && r.title===title)
 if(!sheet)sheet=await save('sheet',title,{state:'Borrador',ownerId:brand.me.id,workType:'Recurrente',start:'2026-10-15',end:'2026-10-31',objective,description,template:'En blanco',sharedWithClient:false})
 if(sheet.data.description?.includes('Reconectar Metricool'))sheet=await api('/api/estrategia',{action:'save',slug,record:{...sheet,data:{...sheet.data,description}}})
 if(!brand.records.some(r=>r.kind==='settings'&&r.data.month==='2026-10'))await save('settings','Objetivo de octubre · propuesta',{month:'2026-10',objective,confirmed:false,sessions:2,scopeSource:'Objetivo de grabación ya configurado en la marca: 2 sesiones/mes. Alcance comercial pendiente de validar; no hay sesiones de octubre registradas.'})
 const targets=brand.activities.filter(a=>a.source==='task' && !a.done || a.source==='publication' && (a.date>='2026-10-12' && a.date<='2026-10-24'))
 const unique=[...new Map(targets.map(a=>[`${a.source}:${a.sourceId}`,a])).values()]
 for(const a of unique)if(!brand.links.some(l=>l.sheet_id===sheet.id&&l.target_type===a.source&&l.target_id===a.sourceId))await api('/api/estrategia',{action:'link',slug,sheetId:sheet.id,targetType:a.source,targetId:a.sourceId})
 const detail=await api(`/api/estrategia/hojas/${sheet.id}`)
 const oldMeta=detail.scene.elements.filter(e=>typeof e.text==='string' && e.text.startsWith('Reconectar Metricool.'))
 if(oldMeta.length)await api(`/api/estrategia/hojas/${sheet.id}`,{action:'scene',elements:oldMeta.map(e=>({...e,text:'API oficial de Meta.\nFacebook e Instagram.\n\nAutorizar cuentas y métricas.\nTikTok: conexión aparte.\nMCP propio posible en el VPS.',originalText:'API oficial de Meta.\nFacebook e Instagram.\n\nAutorizar cuentas y métricas.\nTikTok: conexión aparte.\nMCP propio posible en el VPS.',version:e.version+1,versionNonce:Math.floor(Math.random()*2000000000),updated:Date.now()})),files:{},checkpoint:true})
 if(!detail.scene.elements.length){
 let index=0;const elements=[];const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
 const common=(type,x,y,width,height,strokeColor,backgroundColor)=>({id:randomUUID(),type,x,y,width,height,angle:0,strokeColor,backgroundColor,fillStyle:'solid',strokeWidth:1,strokeStyle:'solid',roughness:0,opacity:100,groupIds:[],frameId:null,roundness:type==='rectangle'?{type:3}:null,seed:100+index,version:1,versionNonce:1000+index,index:'a'+chars[index++],isDeleted:false,boundElements:null,updated:Date.now(),link:null,locked:false})
 const text=(x,y,value,size=18,color='#443555',width=310)=>elements.push({...common('text',x,y,width,value.split('\n').length*size*1.35,color,'transparent'),text:value,originalText:value,fontSize:size,fontFamily:2,textAlign:'left',verticalAlign:'top',containerId:null,autoResize:false,lineHeight:1.35})
 const card=(x,y,title,body,color,link)=>{const rect=common('rectangle',x,y,355,260,'#ddd4ea',color);if(link)rect.link='https://app.distintostudio.com'+link;elements.push(rect);text(x+22,y+22,title,21,'#443555',310);text(x+22,y+66,body,17,'#655970',310)}
 text(50,35,'TypHouse · Plan de trabajo',34,'#302044',1000)
 text(50,88,'OCTUBRE 2026  /  BORRADOR PARA REVISIÓN',15,'#8055e8',1000)
 elements.push(common('rectangle',50,138,1115,100,'#d9c3f8','#efe6ff'))
 text(73,157,'Dar salida al contenido existente y ordenar los siguientes pasos.',25,'#493365',1050)
 text(73,200,'Priorizar → revisar en el módulo original → actualizar → medir.',17,'#705c8b',1050)
 card(50,280,'01 · Contenido','15–24 oct: historias y videos\nya registrados en la grilla.\n\nRevisar copy, portada y\naprobación antes de publicar.\n\nConservar la edición terminada.','#fff6dd','/grilla/little-joe')
 card(430,280,'02 · Diseño','Blister Sport Boys.\nBanner equipos Mercado Libre.\n\nCatálogo y otros banners:\nconsultar material terminado.\n\nHistorias: tarea existente.','#e8f3ff','/tareas?marca=little-joe')
 card(810,280,'03 · Web y operación','Hosting y correo.\nCheckout y reclamaciones.\nAlmacenes y derivación.\n\nPedro valida vigencia y fechas.\nNo cambiar dueños ni plazos.','#e6f5ec','/tareas?marca=little-joe')
 card(50,565,'04 · Medición','API oficial de Meta.\nFacebook e Instagram.\n\nAutorizar cuentas y métricas.\nTikTok: conexión aparte.\nMCP propio posible en el VPS.','#f3eaff','/settings')
 card(430,565,'Por confirmar','Próxima grabación.\nStock y oferta vigente.\nAlcance del mes.\nFechas de pendientes.\n\nNo son acuerdos aprobados.','#fff0eb',null)
 card(810,565,'Cómo usar este plan','Abrir tarjetas del panel Plan.\nActualizar el trabajo original.\nUsar este lienzo en reunión.\nRevisar acuerdos antes de crear.\n\nSin duplicar tareas existentes.','#f1f1f6',null)
 text(50,868,'Fuentes: trabajo real de Distinto y catálogo oficial typhouse.pe · 15/10/2026',16,'#817a91',1115)
 await api(`/api/estrategia/hojas/${sheet.id}`,{action:'scene',elements,files:{},checkpoint:true})
 }
 brand=await api(`/api/estrategia?marca=${slug}`)
 const after=await service.from('tareas').select('id',{count:'exact',head:true}).eq('marca_slug',slug);assert.ifError(after.error);assert.equal(after.count,before.count,'No se crearon tareas')
 const result={sheetId:sheet.id,url:`https://app.distintostudio.com/marca/${slug}/estrategia/hoja/${sheet.id}`,linkedRecords:brand.links.filter(l=>l.sheet_id===sheet.id).length,taskCountBefore:before.count,taskCountAfter:after.count,profileSaved:!!brand.profile}
 fs.writeFileSync('/tmp/typhouse-plan-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
} finally {await auth.auth.signOut({scope:'local'})}
