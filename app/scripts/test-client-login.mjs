// Prueba real del formulario, streaming y aislamiento del portal. Solo lee
// contenido; crea una sesión temporal y cierra únicamente esa sesión al salir.
// TEST_BASE_URL=http://localhost:3115 TEST_CLIENT_EMAIL=... node scripts/test-client-login.mjs
import assert from 'node:assert/strict'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { load } from 'cheerio'

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const base = process.env.TEST_BASE_URL || 'http://localhost:3115'
const email = process.env.TEST_CLIENT_EMAIL
assert(email, 'Indicar TEST_CLIENT_EMAIL de una cuenta de cliente autorizada')
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data: access, error } = await service.from('marca_clientes')
  .select('auth_user_id,password_inicial,marca_id,marca:marcas(nombre)')
  .eq('email', email).limit(1).single()
assert.ifError(error)
assert(access.password_inicial, 'La cuenta necesita su contraseña inicial existente para esta prueba')
const brand = Array.isArray(access.marca) ? access.marca[0] : access.marca
const jar = new Map()
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (rows) => rows.forEach(({ name, value }) => jar.set(name, value)),
  },
})
const cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
const remember = (response) => {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0], i = pair.indexOf('=')
    jar.set(pair.slice(0, i), pair.slice(i + 1))
  }
}

try {
  const login = await fetch(base + '/login')
  assert.equal(login.status, 200)
  const $ = load(await login.text())
  const form = $('form').filter((_, el) => $(el).find('input[name="password"]').length).first()
  assert.equal(form.length, 1, 'Formulario presente en HTML del servidor')
  for (const el of [form[0], ...form.parents().toArray()]) {
    assert(!/opacity:\s*0(?:[;\s]|$)/.test($(el).attr('style') || ''), 'Login visible sin esperar hidratación')
  }
  const body = new FormData()
  form.find('input[type="hidden"]').each((_, el) => body.append($(el).attr('name'), $(el).attr('value') || ''))
  assert([...body.keys()].some(name => name.startsWith('$ACTION_')), 'Acción del formulario encontrada')
  body.set('email', email)
  body.set('password', access.password_inicial)
  const loginStart = performance.now()
  const signedIn = await fetch(base + '/login', { method: 'POST', body, headers: { origin: base }, redirect: 'manual' })
  remember(signedIn)
  const location = signedIn.headers.get('location')
  assert.equal(signedIn.status, 303, 'Inicio de sesión correcto')
  assert.equal(new URL(location, base).pathname, '/cliente', 'Entrada directa al portal sin /cockpit')
  await signedIn.arrayBuffer()
  const { data: identity, error: identityError } = await auth.auth.getUser()
  assert.ifError(identityError)
  assert.equal(identity.user.id, access.auth_user_id, 'Sesión de la cuenta solicitada')
  console.log('PASS formulario SSR visible y login directo:', Math.round(performance.now() - loginStart), 'ms')

  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    const response = await fetch(base + '/cliente', { headers: { cookie: cookie() } })
    remember(response)
    assert.equal(response.status, 200)
    const reader = response.body.getReader(), decoder = new TextDecoder()
    let html = '', loadingAt = null, completeAt = null
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      if (loadingAt === null && html.includes('Cargando tu espacio')) loadingAt = Math.round(performance.now() - start)
      if (completeAt === null && html.includes('Portal del cliente')) completeAt = Math.round(performance.now() - start)
    }
    const totalMs = Math.round(performance.now() - start)
    assert(loadingAt !== null, 'Estado visible durante la consulta de datos')
    assert(html.includes(brand.nombre), 'Contenido de la marca correcto')
    assert(html.includes('Portal del cliente'), 'Portal renderizado')
    assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'), 'Sin error de render')
    console.log('PASS portal:', JSON.stringify({ loadingMs: loadingAt, portalMs: completeAt, totalMs, bytes: Buffer.byteLength(html) }))
  }

  const internal = await fetch(base + '/admin/clientes', { headers: { cookie: cookie() }, redirect: 'manual' })
  assert.equal(new URL(internal.headers.get('location'), base).pathname, '/cliente', 'Cliente no entra a administración')
  await internal.arrayBuffer()
  const anon = await fetch(base + '/cliente', { redirect: 'manual' })
  assert.equal(new URL(anon.headers.get('location'), base).pathname, '/login', 'Portal exige sesión')
  await anon.arrayBuffer()
  console.log('PASS aislamiento: administración restringida y portal exige sesión')
} finally {
  if (jar.size) await auth.auth.signOut({ scope: 'local' })
}
