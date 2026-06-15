// Inspect the exact structure of the 23 pending threads for La Victoria.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local.backup', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: marca } = await db.from('marcas').select('id, metricool_blog_id').eq('slug', 'la-victoria').maybeSingle()
const { data: integ } = await db.from('integraciones').select('metricool_user_id, metricool_user_token').eq('id', 1).maybeSingle()
const USER_ID = integ.metricool_user_id, TOKEN = integ.metricool_user_token

async function fetchRaw(provider) {
  const url = `https://app.metricool.com/api/v2/inbox/post-comments?blogId=${marca.metricool_blog_id}&provider=${provider}&limit=100&userId=${USER_ID}`
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', 'X-Mc-Auth': TOKEN }, cache: 'no-store' })
  if (!res.ok) return []
  const json = JSON.parse(await res.text() || '{}')
  return Array.isArray(json) ? json : (json?.data ?? [])
}

const mc = new Map()
for (const [net, prov] of [['facebook','FACEBOOK'],['instagram','INSTAGRAM']]) {
  for (const t of await fetchRaw(prov)) mc.set(`${net}|${t.id}`, t)
}

// Classify the whole window: brand-authored vs customer, hasReply
let brandAuthored = 0, customerNoReply = 0, customerWithReply = 0
for (const [, t] of mc) {
  const self = String(t?.self)
  const rootOwner = String(t?.root?.owner)
  const comments = t?.root?.comments ?? []
  const hasReply = comments.some((c) => String(c?.owner) === self)
  if (rootOwner === self) brandAuthored++
  else if (hasReply) customerWithReply++
  else customerNoReply++
}
console.log(`VENTANA Metricool (FB+IG): ${mc.size} threads`)
console.log(`  root.owner === self (comentario de la MARCA): ${brandAuthored}`)
console.log(`  cliente CON respuesta nuestra: ${customerWithReply}`)
console.log(`  cliente SIN respuesta (pendiente real): ${customerNoReply}`)

// Dump the 23 pending
const { data: pend } = await db.from('comentarios_inbox')
  .select('id, network, metricool_comment_id, comment_text, author_username')
  .eq('marca_id', marca.id).eq('status', 'pending').limit(50)
console.log(`\n>>> PENDING en BD: ${pend?.length}`)
let pendBrand = 0
for (const r of (pend ?? []).slice(0, 8)) {
  const t = mc.get(`${r.network}|${r.metricool_comment_id}`)
  const self = t ? String(t?.self) : '?'
  const rootOwner = t ? String(t?.root?.owner) : '(no en ventana)'
  const isBrand = rootOwner === self
  const comments = t?.root?.comments ?? []
  console.log(`\n  [${r.network}] author_username=${r.author_username}`)
  console.log(`    comment_text (BD): "${(r.comment_text ?? '').slice(0, 70)}"`)
  console.log(`    self=${self} root.owner=${rootOwner} → ${isBrand ? '⚠️ COMENTARIO DE LA MARCA' : 'cliente'}`)
  console.log(`    comments[]: ${comments.map((c) => `${String(c?.owner)===self?'NOS':'cliente'}:"${(c?.text??'').slice(0,30)}"`).join(' | ') || '(vacío)'}`)
}
for (const r of pend ?? []) {
  const t = mc.get(`${r.network}|${r.metricool_comment_id}`)
  if (t && String(t?.root?.owner) === String(t?.self)) pendBrand++
}
console.log(`\n>>> De ${pend?.length} pending: ${pendBrand} son comentarios de la MARCA (no de clientes)`)
