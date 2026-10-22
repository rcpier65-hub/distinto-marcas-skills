// Real integration with disposable brands/users; no invitations or client messages.
// CLIENT_ACCESS_ENCRYPTION_KEY=<private env> TEST_BASE_URL=http://localhost:3122 node scripts/test-client-brand-space.mjs
import assert from 'node:assert/strict'
import { randomUUID, createHash, randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import env from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import pg from 'pg'
import { encryptAccess, decryptAccess, hashAccessPin, verifyAccessPin } from '../lib/cliente/access-crypto.ts'
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const base = process.env.TEST_BASE_URL || 'http://localhost:3122', id = randomUUID()
const brands = [randomUUID(), randomUUID()], slugs = [`qa-portal-a-${id}`, `qa-portal-b-${id}`]
const ids = { shared: randomUUID(), private: randomUUID(), foreign: randomUUID(), archived: randomUUID() }
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const u = new URL(process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT)
const db = new pg.Client({ user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), host: u.hostname, port: Number(u.port) || 5432, database: u.pathname.slice(1), ssl: { rejectUnauthorized: false } })
const sessions = [], users = [], passwords = { catalogos: `QA-catalog-${id}`, reclamos: `QA-claims-${id}` }
let uiUser
async function ok(p) { const r = await p; assert.ifError(r.error); return r.data }
async function session(email) {
  const jar = new Map()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cs => cs.forEach(c => jar.set(c.name, c.value)) } })
  const link = await ok(service.auth.admin.generateLink({ type: 'magiclink', email }))
  await ok(auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }))
  sessions.push(auth)
  return { auth, cookie: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }
}
async function client(brand, suffix) {
  const email = `qa-portal-${suffix}-${id}@example.com`, password = randomBytes(24).toString('base64url')
  const data = await ok(service.auth.admin.createUser({ email, password, email_confirm: true })); users.push(data.user.id)
  await ok(service.from('marca_clientes').insert({ auth_user_id: data.user.id, marca_id: brand, email, nombre: 'QA portal cliente' }))
  return { ...(await session(email)), user: data.user.id, email, password, brandId: brand }
}
async function request(path, s, body, headers = {}) {
  const r = await fetch(base + path, { redirect: 'manual', method: body ? 'POST' : 'GET', headers: { ...(s ? { cookie: s.cookie() } : {}), ...(body ? { origin: new URL(base).origin, 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const text = await r.text(); let data
  try { data = JSON.parse(text) } catch { data = null }
  return { r, text, data }
}
const payload = (resource = 'catalogos', codigo = '8990', marcaId = brands[0]) => ({ marcaId, resource, codigo })
const path = '/cliente/accesos'
try {
  await db.connect()
  assert(verifyAccessPin('8990', hashAccessPin('8990')))
  assert(!verifyAccessPin('0000', hashAccessPin('8990')))
  const cipher = encryptAccess(passwords.catalogos, brands[0], 'catalogos')
  assert.equal(decryptAccess(cipher, brands[0], 'catalogos'), passwords.catalogos)
  assert.throws(() => decryptAccess(cipher, brands[1], 'catalogos'))
  assert.throws(() => decryptAccess(cipher, brands[0], 'reclamos'))
  await ok(service.from('marcas').insert(brands.map((id, i) => ({ id, slug: slugs[i], nombre: `QA Portal ${i}`, activa: true }))))
  for (const [resource, value] of Object.entries(passwords)) await db.query('insert into client_portal_access(marca_id,resource,ciphertext,pin_hash) values($1,$2,$3,$4)', [brands[0], resource, encryptAccess(value, brands[0], resource), hashAccessPin('8990')])
  const owner = await ok(service.from('team_members').select('id').eq('email', 'pedro@agenciadistinto.com').single())
  await ok(service.from('strategy_records').insert(Object.entries(ids).map(([kind, id]) => ({ id, marca_id: kind === 'foreign' ? brands[1] : brands[0], kind: 'sheet', title: `QA ${kind} ${id}`, data: { sharedWithClient: kind !== 'private', privateNotes: `INTERNAL-${id}` }, created_by: owner.id, archived: kind === 'archived' }))))
  await ok(service.from('strategy_scenes').insert(Object.values(ids).map(sheet_id => ({ sheet_id, elements: [], files: {} }))))
  const report = published => ({ mes: published ? '2026-08' : '2026-09', leads: 25, ventasShopify: 2, ingresoShopify: 100, ventasTotales: 5, ingresoDirecto: 150, ventasOmnicanal: 150, gastoAdsUsd: 20, tipoCambio: 3.5, igv: .18, extra: { formato: 'directo', publicado: published, cliente: { pedidos: 5, soles: 150 }, topAnuncios: [{ nombre: published ? `PUBLIC-${id}` : `DRAFT-${id}`, conversaciones: 2, costoUsd: 1 }] } })
  await ok(service.from('reportes_mensuales').insert([true, false].map(p => ({ marca_slug: slugs[0], mes: report(p).mes, datos: report(p) }))))
  const a = await client(brands[0], 'a'), b = await client(brands[1], 'b'), staff = await session('pedro@agenciadistinto.com')
  assert((await a.auth.from('client_portal_access').select('*')).error, 'Client SQL must not expose encrypted credentials')
  assert([401, 307].includes((await request(path, null, payload())).r.status))
  assert.equal((await request(path, staff, payload())).r.status, 403)
  assert.equal((await request(path, b, payload())).r.status, 403)
  assert.equal((await request(path, a, payload(), { origin: 'https://untrusted.example' })).r.status, 403)
  assert.equal((await request(path, a, { ...payload(), arbitrary: true })).r.status, 400)
  assert.equal((await request(path, a, payload('catalogos', 'wrong'))).r.status, 403)
  for (const resource of Object.keys(passwords)) {
    const result = await request(path, a, payload(resource))
    assert.equal(result.r.status, 200)
    assert.equal(result.data.password, passwords[resource])
    assert.match(result.r.headers.get('cache-control'), /no-store/)
  }
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => request(path, a, payload())))
  assert.equal(concurrent.filter(r => r.r.status === 200).length, 2)
  assert.equal(concurrent.filter(r => r.r.status === 429).length, 4)
  assert(concurrent.filter(r => r.r.status !== 200).every(r => !r.text.includes(passwords.catalogos)))
  for (const s of [a, b]) {
    const index = s === a ? 0 : 1
    const portal = await request('/cliente', s)
    assert.equal(portal.r.status, 200); assert(portal.text.includes(`/marca/${slugs[index]}/estrategia`)); assert(!portal.text.includes('gestion-catalogos'))
    const result = await request(`/marca/${slugs[index]}/estrategia`, s)
    assert.equal(result.r.status, 200); assert(result.text.includes('Portal de marca'))
    assert(!result.text.includes('INTERNAL-')); assert(!result.text.includes(passwords.catalogos)); assert(!result.text.includes('ciphertext'))
  }
  const own = await request(`/marca/${slugs[0]}/estrategia`, a)
  assert(own.text.includes(ids.shared)); assert(!own.text.includes(ids.private)); assert(!own.text.includes(ids.archived)); assert(!own.text.includes(ids.foreign)); assert(!own.text.includes(`PUBLIC-${id}`))
  const unlocked = await request(`/marca/${slugs[0]}/estrategia`, a, null, { cookie: `${a.cookie()}; reportes_pin=ok` })
  assert(unlocked.text.includes(`PUBLIC-${id}`)); assert(!unlocked.text.includes(`DRAFT-${id}`))
  const foreign = await request(`/marca/${slugs[1]}/estrategia`, a)
  assert(foreign.r.status === 404 || foreign.text.includes('NEXT_HTTP_ERROR_FALLBACK;404'))
  assert(!foreign.text.includes(ids.foreign))
  const shared = await request(`/api/estrategia/hojas/${ids.shared}`, a)
  assert.equal(shared.r.status, 200); assert.equal(shared.data.sessions.length, 0); assert(!shared.text.includes('INTERNAL-'))
  for (const blocked of [ids.private, ids.foreign, ids.archived]) assert.equal((await request(`/api/estrategia/hojas/${blocked}`, a)).r.status, 403)
  for (const blocked of ['/settings/meta', '/api/estrategia?marca=' + slugs[0], '/marca/' + slugs[0] + '/metricas']) assert([403, 307].includes((await request(blocked, a)).r.status))
  const realBrand = await ok(service.from('marcas').select('id').eq('slug', 'little-joe').single())
  const real = await client(realBrand.id, 'typhouse')
  const realPage = await request('/cliente', real)
  assert.equal(realPage.r.status, 200); assert(realPage.text.includes('https://typhouse.pe/pages/gestion-catalogos')); assert(realPage.text.includes('https://typhouse.pe/pages/gestion-reclamos'))
  const stored = await db.query('select resource,ciphertext from client_portal_access where marca_id=$1', [realBrand.id])
  assert.equal(stored.rows.length, 2)
  for (const row of stored.rows) {
    const expected = decryptAccess(row.ciphertext, realBrand.id, row.resource)
    assert(!realPage.text.includes(expected), 'Private value must never be serialized in SSR')
    const response = await request(path, real, payload(row.resource, '8990', realBrand.id))
    assert.equal(response.r.status, 200)
    assert(response.data.password === expected, 'Authorized endpoint must return the configured resource, without logging it')
  }
  const realSpace = await request('/marca/little-joe/estrategia', real)
  assert.equal(realSpace.r.status, 200); assert(realSpace.text.includes('Planificación compartida')); assert(!realSpace.text.includes('Nueva hoja'))
  const total = await session('total@distintostudio.com')
  assert.equal((await request(path, total, payload('catalogos', '8990', realBrand.id))).r.status, 403)
  const totalForeign = await request('/marca/little-joe/estrategia', total)
  assert(totalForeign.r.status === 404 || totalForeign.text.includes('NEXT_HTTP_ERROR_FALLBACK;404'))
  if (process.env.TEST_KEEP_UI_FILE) {
    await writeFile(process.env.TEST_KEEP_UI_FILE, JSON.stringify({ email: real.email, password: real.password, userId: real.user, brandId: real.brandId }), { mode: 0o600 })
    uiUser = real.user
  }
  console.log('PASS: separate passwords, code verification, atomic rate limit, encrypted DB, no SSR secrets, own brand only, shared plans, published reports, existing TypHouse links and client routes.')
} finally {
  await Promise.allSettled(sessions.map(s => s.auth.signOut({ scope: 'local' })))
  await db.query('delete from client_portal_access where marca_id=any($1::uuid[])', [brands])
  await ok(service.from('strategy_records').delete().in('marca_id', brands))
  await ok(service.from('reportes_mensuales').delete().in('marca_slug', slugs))
  const remove = users.filter(id => id !== uiUser)
  if (remove.length) await ok(service.from('marca_clientes').delete().in('auth_user_id', remove))
  for (const id of remove) await ok(service.auth.admin.deleteUser(id))
  await ok(service.from('marcas').delete().in('id', brands))
  for (const brand of brands) for (const value of [`client-access:brand:${brand}`, ...users.map(id => `client-access:user:${id}:${brand}`)]) await db.query('delete from booking_rate_limits where key=$1', [createHash('sha256').update(value).digest('hex')])
  await db.end()
  console.log(uiUser ? 'Disposable data removed; one temporary UI account retained for browser verification.' : 'All disposable data and sessions removed.')
}
