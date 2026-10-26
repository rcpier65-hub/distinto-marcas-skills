// Read-only authorization checks. Invalid mutation payloads never create events/invitations.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
env.loadEnvConfig(process.cwd(), false, { info(){}, error(){} })
const base = process.env.TEST_BASE_URL || 'http://localhost:3126'
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}})
const manifest = JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json','utf8'))
const actions = Object.fromEntries(Object.entries(manifest.node).map(([id,v])=>[v.exportedName,id]))
const names = (process.env.TEST_MEMBERS || 'pedro,lorena,pieer,ailyn,paolo,ruth,nayeli').split(',')
let expectedIds
for (const name of names) {
  const jar = new Map()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))} })
  try {
    const {data,error} = await svc.auth.admin.generateLink({type:'magiclink',email:`${name}@agenciadistinto.com`}); assert.ifError(error)
    assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error)
    const headers = {cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '), origin:base}
    const full = !['ruth','nayeli'].includes(name)
    const get = await fetch(base+'/api/v1/grabaciones/calendario?desde=2026-10-26&hasta=2026-11-01',{headers});assert.equal(get.status,200,name)
    const agenda = await get.json();assert(agenda.ok)
    const ids = agenda.eventos.map(e=>`${e.tipo}:${e.id}`).sort()
    assert.equal(new Set(ids).size,ids.length)
    if (!expectedIds) expectedIds=ids
    assert.deepEqual(ids,expectedIds,name+' sees the same calendar')
    const html = await fetch(base+'/grabaciones/calendario',{headers}).then(r=>r.text())
    assert.equal(html.includes('Agendar reunión o grabación'),full,name+' scheduler')
    assert.equal(html.includes('Reservas de la web'),full,name+' reservations')
    assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'))
    const reservations = await fetch(base+'/grabaciones/calendario/reservas',{headers,redirect:'manual'})
    const reservationHtml = await reservations.text()
    if (full) { assert.equal(reservations.status,200); assert(!reservationHtml.includes('NEXT_REDIRECT')) }
    else { assert(reservations.status===307 || reservationHtml.includes('NEXT_REDIRECT'),name+' reservations guard') }
    const denied = await fetch(base+'/api/v1/grabaciones/calendario',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({tipo:'reunion',fecha:'invalid'})})
    assert.equal(denied.status,full?400:403,name+' API write permission')
    for (const [action,args,message] of [
      ['interpretarAgenda',[''],'Escribe qué agendar'],
      ['agendarReunion',[{fecha:'invalid',hora:'00:00',correos:[]}],'Fecha inválida'],
      ['agendarGrabacion',[{fecha:'invalid',hora:'00:00',invitados:[]}],'Fecha inválida'],
      ['editarReunionCal',['invalid',{fecha:'invalid',hora:'00:00'}],'Fecha inválida'],
      ['editarEventoGoogle',['!',{fecha:'invalid',titulo:'QA'}],'Evento inválido'],
      ['eliminarEventoGoogle',['!'],'Evento inválido'],
      ['vincularEventoGcal',[{}],'Faltan datos'],
      ['moverPublicacion',['invalid','invalid'],'Datos inválidos'],
      ['moverFechaImportante',['invalid','invalid'],'Datos inválidos'],
    ]) {
      assert(actions[action],action+' must be exported')
      const response = await fetch(base+'/grabaciones/calendario',{method:'POST',headers:{...headers,'Next-Action':actions[action],'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify(args)})
      const text = await response.text()
      assert.equal(response.status,200,`${name} ${action}`)
      assert(text.includes(full?message:'No tienes permiso'),`${name} ${action} returned unexpected validation`)
    }
    console.log('PASS',name,full?'full calendar + scheduler + server actions':'unchanged read-only calendar',ids.length,'events')
  } finally {await auth.auth.signOut({scope:'local'})}
}
const anon=await fetch(base+'/api/v1/grabaciones/calendario',{redirect:'manual'})
assert([401,307].includes(anon.status))
console.log('PASS anonymous denied; no events or invitations created')
