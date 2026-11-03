import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { aPropuesta, sesionVacia } from '../lib/presentacion/web'

loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const base = process.env.TEST_BASE_URL
assert(base)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

async function session(email: string) {
  const jar = new Map<string, string>()
  const auth = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => cookies.forEach(c => jar.set(c.name, c.value)) } })
  const link = await service.auth.admin.generateLink({ type: 'magiclink', email }); assert.ifError(link.error)
  const login = await auth.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' }); assert.ifError(login.error)
  return { auth, id: login.data.user!.id, headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), origin: base!, 'Content-Type': 'application/json' } }
}

async function main() {
  const members = await service.from('team_members').select('email,nombre').eq('activo', true); assert.ifError(members.error)
  const pedroMember = members.data!.find(m => m.nombre.toLowerCase().includes('pedro'))
  const lorenaMember = members.data!.find(m => m.nombre.toLowerCase().includes('lorena'))
  assert(pedroMember); assert(lorenaMember)
  const pedro = await session(pedroMember.email)
  const lorena = await session(lorenaMember.email)
  const ids = [randomUUID(), randomUUID()]
  let presentationId: string | null = null
  let keep = false
  const s = sesionVacia({ empresa: 'QA correo · Distinto', nombre: 'Prueba sin envío', rubro: 'Servicios', contacto: 'qa@example.invalid' })
  s.servicios = ['social']; s.social.plan = 'sm-integration-pro'
  s.notas = 'QA: nota interna que no debe aparecer en el correo ni en el PDF.'
  const data = aPropuesta(s, '2026-11-03', randomUUID)
  data.client.email = 'qa@example.invalid'
  try {
    const insert = await service.from('propuestas_comerciales').insert(ids.map((id, i) => ({ id, created_by: i === 0 ? pedro.id : lorena.id, data }))).select('id,revision'); assert.ifError(insert.error)
    const row = insert.data!.find(p => p.id === ids[0])!
    const endpoint = `/api/propuestas/correo?id=${row.id}`
    const get = await fetch(base + endpoint, { headers: pedro.headers }); assert.equal(get.status, 200)
    const prepared = await get.json()
    assert.equal(prepared.proposal.id, row.id); assert.equal(prepared.proposal.data.client.email, 'qa@example.invalid')
    assert.equal(prepared.sender, 'team@distintostudio.com'); assert.equal(prepared.configured, true)
    assert.deepEqual(prepared.history, [])
    assert(!JSON.stringify(prepared).includes(s.notas))
    const anon = await fetch(base + endpoint, { redirect: 'manual' }); assert([401, 303, 307].includes(anon.status))
    assert.equal((await fetch(base + endpoint, { headers: lorena.headers })).status, 403)
    assert.equal((await fetch(base + `/api/propuestas/correo?id=${ids[1]}`, { headers: pedro.headers })).status, 404)
    const input = { id: row.id, revision: row.revision, to: 'qa@example.invalid', subject: 'QA', message: 'No enviar', confirmed: false }
    const post = (body: unknown, headers = pedro.headers) => fetch(base + '/api/propuestas/correo', { method: 'POST', headers, body: JSON.stringify(body) })
    assert.equal((await post(input)).status, 400)
    assert.equal((await post({ ...input, confirmed: true, revision: row.revision + 1 })).status, 409)
    assert.equal((await post(input, { ...pedro.headers, origin: 'https://example.invalid' })).status, 403)
    const count = await service.from('proposal_email_deliveries').select('id', { count: 'exact', head: true }).eq('proposal_id', row.id); assert.ifError(count.error); assert.equal(count.count, 0)
    const pdf = await fetch(base + '/api/propuestas/pdf', { method: 'POST', headers: pedro.headers, body: JSON.stringify({ id: row.id, revision: row.revision }) })
    assert.equal(pdf.status, 200); assert(pdf.headers.get('content-type')?.includes('application/pdf'))
    const bytes = Buffer.from(await pdf.arrayBuffer()); assert(bytes.subarray(0, 5).toString() === '%PDF-')
    if (process.env.QA_FIXTURE_FILE) {
      const p = await service.from('presentacion_sesiones').insert({ created_by: pedro.id, data: s }).select('id').single(); assert.ifError(p.error); presentationId = p.data!.id
      writeFileSync(process.env.QA_FIXTURE_FILE, JSON.stringify({ proposalId: row.id, presentationId }, null, 2))
      writeFileSync(process.env.QA_FIXTURE_FILE + '.pdf', bytes)
      keep = true
    }
    console.log(`PASS ${base}: remitente, correo registrado, permisos, aislamiento, origen, versión, confirmación y PDF (${bytes.length} bytes). Cero correos enviados.`)
  } finally {
    const removed = await service.from('propuestas_comerciales').delete().in('id', keep ? [ids[1]] : ids); assert.ifError(removed.error)
    if (!keep && presentationId) assert.ifError((await service.from('presentacion_sesiones').delete().eq('id', presentationId)).error)
    await pedro.auth.auth.signOut({ scope: 'local' }); await lorena.auth.auth.signOut({ scope: 'local' })
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
