// Read-only check: no events, invitations or notifications are created.
import assert from 'node:assert/strict'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { crucesAgenda } from '../lib/calendario/intervalos.ts'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3116'
const svc=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const jar=new Map()
const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}})
const {data,error}=await svc.auth.admin.generateLink({type:'magiclink',email:'pedro@agenciadistinto.com'});assert.ifError(error)
try{
 assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error)
 const headers={cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
 const r=await fetch(base+'/api/v1/grabaciones/calendario?desde=2026-10-16&hasta=2026-10-16',{headers});assert.equal(r.status,200)
 const b=await r.json();assert(b.ok)
 const praktico=b.eventos.find(e=>e.id==='f26c52ac-1822-4402-b2b2-311e20b74b27')
 const vozchler=b.eventos.find(e=>e.id==='0f8b9ed8-92b1-429a-9002-0f5f8a78ac4b')
 assert(praktico&&vozchler,'Both original events must reach the general calendar')
 assert.equal(praktico.hora,'15:00');assert.equal(praktico.duracion_min,300)
 assert.equal(vozchler.hora,'17:00');assert.equal(vozchler.duracion_min,45)
 assert.equal(new Set(b.eventos.map(e=>`${e.tipo}-${e.id}`)).size,b.eventos.length)
 const cruces=crucesAgenda(b.eventos.map(e=>({...e,duracionMin:e.duracion_min})))
 assert(cruces.some(g=>g.eventos.some(e=>e.id===praktico.id)&&g.eventos.some(e=>e.id===vozchler.id)))
 const html=await fetch(base+'/grabaciones/calendario?vista=semana&desde=2026-10-12&hasta=2026-10-18',{headers}).then(r=>r.text())
 assert(html.includes('Actualizar calendario'));assert(html.includes('Ver eventos simultáneos'))
 assert(html.includes('Reunion inicial Vozchler'));assert(html.includes('3pm – 8pm'));assert(html.includes('5pm – 5:45pm'))
 assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'))
 console.log('PASS real saved events, exact 15–20/17–17:45 schedules, no duplicates, overlap details and refresh control')
 const anon=await fetch(base+'/api/v1/grabaciones/calendario?desde=2026-10-16&hasta=2026-10-16',{redirect:'manual'})
 assert([401,307].includes(anon.status));console.log('PASS anonymous calendar access rejected')
}finally{await auth.auth.signOut({scope:'local'})}
