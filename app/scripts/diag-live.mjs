// Live diagnosis: current pending vs Metricool, + raw thread structure inspection.
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
  if (!res.ok) { console.log(`${provider} HTTP ${res.status}`); return [] }
  const json = JSON.parse(await res.text() || '{}')
  return Array.isArray(json) ? json : (json?.data ?? [])
}

// 1) Current pending
const { count: pendCount } = await db.from('comentarios_inbox').select('id', { count: 'exact', head: true }).eq('marca_id', marca.id).eq('status', 'pending')
console.log(`PENDING ahora en BD: ${pendCount}`)

// 2) Raw structure of one FB thread (verify hasReply detection)
const fbRaw = await fetchRaw('FACEBOOK')
console.log(`\nFACEBOOK threads en ventana: ${fbRaw.length}`)
if (fbRaw[0]) {
  const t = fbRaw[0]
  console.log('\n=== RAW thread[0] (campos clave) ===')
  console.log('  thread.id     :', t.id)
  console.log('  thread.self   :', JSON.stringify(t.self))
  console.log('  thread.status :', t.status)
  console.log('  root.owner    :', t?.root?.owner)
  console.log('  root.comments count:', (t?.root?.comments ?? []).length)
  console.log('  root.comments owners:', (t?.root?.comments ?? []).map((c) => c?.owner))
  console.log('  participants ids/names:', (t?.participants ?? []).map((p) => `${p?.id}=${p?.name}`).slice(0, 6))
  console.log('  thread keys:', Object.keys(t))
  console.log('  root keys  :', Object.keys(t?.root ?? {}))
}

// 3) Cross-check: current pending that Metricool says are ALREADY answered (leaking)
const igRaw = await fetchRaw('INSTAGRAM')
const mc = new Map()
for (const t of fbRaw) mc.set(`facebook|${t.id}`, t)
for (const t of igRaw) mc.set(`instagram|${t.id}`, t)
function hasReply(t) {
  const comments = t?.root?.comments ?? []
  const self = t?.self
  return Array.isArray(comments) && comments.some((c) => c?.owner === self)
}
const { data: pend } = await db.from('comentarios_inbox')
  .select('id, network, metricool_comment_id, comment_created_at')
  .eq('marca_id', marca.id).eq('status', 'pending').limit(500)
let leaking = 0, inWindow = 0, outWindow = 0
const samples = []
for (const r of pend ?? []) {
  const t = mc.get(`${r.network}|${r.metricool_comment_id}`)
  if (!t) { outWindow++; continue }
  inWindow++
  if (hasReply(t)) { leaking++; if (samples.length < 5) samples.push(r) }
}
console.log(`\n>>> De ${pend?.length} pending: en ventana=${inWindow}, fuera=${outWindow}`)
console.log(`  ⚠️ PENDING que Metricool ya marca como respondidos (fugas): ${leaking}`)
for (const s of samples) console.log(`    - ${s.network} ${s.metricool_comment_id} (${s.comment_created_at?.slice(0,10)})`)
