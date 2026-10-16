// Read-only integration: no recordings, invitations or notifications are created.
import assert from 'node:assert/strict'
import env from '@next/env'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {periodWork} from '../lib/estrategia/activity-status.ts'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3116'
const svc=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const jar=new Map()
const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}})
const {data,error}=await svc.auth.admin.generateLink({type:'magiclink',email:'pedro@agenciadistinto.com'});assert.ifError(error)
try{
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error)
 const headers={cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
 const get=async p=>{const r=await fetch(base+p,{headers});assert.equal(r.status,200);return r.json()}
 const [brand,calendar]=await Promise.all([get('/api/estrategia?marca=little-joe'),get('/api/v1/grabaciones/calendario?desde=2026-10-01&hasta=2026-10-31')])
 assert(!calendar.google_error);assert(!brand.warnings.length,brand.warnings.join(' '))
 const original=calendar.eventos.find(e=>e.id==='7cac3oaj2rlpt5ibia3p9ah298');assert(original)
 assert.equal(original.tipo,'grabacion');assert.equal(original.duracion_min,240)
 const recordings=periodWork(brand.activities,'2026-10-16','mes').filter(a=>a.kind==='Grabación')
 assert.equal(recordings.length,1)
 const recording=recordings[0]
 assert.equal(recording.sourceId,original.id);assert.equal(recording.date,original.fecha);assert.equal(recording.time,original.hora);assert.equal(recording.title,original.titulo)
 assert.equal(recording.done,false,'Past appointment must not be reported as completed without a record')
 for(const e of calendar.eventos.filter(e=>e.origen_google&&e.marca?.slug==='little-joe'&&['grabacion','reunion'].includes(e.tipo))){assert.equal(brand.activities.filter(a=>a.source==='calendar'&&a.sourceId===e.id).length,1)}
 assert.equal(new Set(brand.activities.map(a=>a.id)).size,brand.activities.length)
 const db=await svc.from('grabaciones').select('id,fecha_real,estado').eq('marca_id',brand.brand.id);assert.ifError(db.error)
 assert.equal(brand.recordings.length,db.data.length);assert(!db.data.some(r=>r.id===original.id))
 const html=await fetch(base+recording.href,{headers}).then(r=>r.text());assert(html.includes('Grabación Typhouse'));assert(html.includes('little-joe'));assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'))
 const linked=brand.activities.find(a=>a.source==='meeting'&&a.date==='2026-10-14');assert(linked)
 assert(!brand.activities.some(a=>a.sourceId==='9o4kdhrcplememheuk6d18769c'),'App meeting must not be duplicated by Google')
 const november=await get('/api/estrategia?marca=little-joe&mes=2026-11');assert.equal(november.calendarMonth,'2026-11');assert(november.activities.some(a=>a.sourceId===original.id),'Changing calendar month retains current-month overview')
 const invalid=await fetch(base+'/api/estrategia?marca=little-joe&mes=2026-99',{headers});assert.equal(invalid.status,400)
 const other=await get('/api/estrategia?marca=praktico');assert(!other.activities.some(a=>a.sourceId===original.id),'No cross-brand calendar leakage')
 const anon=await fetch(base+'/api/estrategia?marca=little-joe',{redirect:'manual'});assert([401,307].includes(anon.status))
 console.log('PASS TypHouse Oct 2 10:00–14:00 matches general calendar once; internal data unchanged; month navigation, task/source isolation and no anonymous access')
}finally{await auth.auth.signOut({scope:'local'})}
