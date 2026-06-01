// Simula el flow completo de pedirGrilla sin necesidad de auth de browser.
// Replica lógica de app/dashboard/_components/pedir-grilla-action.ts
//
// Uso: node scripts/test-pedir-grilla-flow.mjs <slug>
//
// Hace en orden:
//   1. Lee marca de BD
//   2. Fetcha publicaciones de Notion
//   3. Llama al endpoint render-grilla (Chromium en prod)
//   4. Sube PNG a Supabase Storage
//   5. Update BD con png_url + estado=esperando_aprobacion
//   6. Reporta cada paso con timings

import pg from 'pg'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { Client } = pg

const slug = process.argv[2]
if (!slug) {
  console.error('Uso: node scripts/test-pedir-grilla-flow.mjs <slug>')
  process.exit(1)
}

// Cargar env vars necesarios
const env = {}
try {
  const raw = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
} catch {}

const CRON_SECRET = env.CRON_SECRET
const NOTION_TOKEN = env.NOTION_TOKEN
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const NOTION_GRILLA_DB_ID = env.NOTION_GRILLA_DB_ID
const BASE_URL = 'https://distinto-app.vercel.app'

console.log('🔍 Env check:')
console.log(`  CRON_SECRET: ${CRON_SECRET ? '✅' : '❌'}`)
console.log(`  NOTION_TOKEN: ${NOTION_TOKEN ? '✅' : '❌'}`)
console.log(`  SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`)
console.log(`  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅' : '❌'}`)
console.log(`  NOTION_GRILLA_DB_ID: ${NOTION_GRILLA_DB_ID ? '✅' : '❌'}`)
console.log('')

const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// 1. Fetch marca
const startTotal = Date.now()
console.log(`━━━ Probando flow Pedir Grilla: ${slug} ━━━\n`)

console.log('1️⃣  Leer marca de BD...')
const t1 = Date.now()
const r = await c.query(
  'SELECT id, slug, nombre, emoji_marca, color_primario_hex, notion_proyecto_id, logo_url FROM marcas WHERE slug = $1 AND activa = true',
  [slug],
)
if (!r.rows[0]) {
  console.error('❌ Marca no encontrada')
  process.exit(1)
}
const marca = r.rows[0]
console.log(`   ✅ ${marca.nombre} (${Date.now()-t1}ms)`)
console.log(`   logo_url: ${marca.logo_url ?? 'null (placeholder)'}`)
console.log(`   notion_proyecto_id: ${marca.notion_proyecto_id}`)
console.log('')

// 2. Calcular semana actual
const now = new Date()
const dow = now.getDay()
const diff = dow === 0 ? -6 : 1 - dow
const monday = new Date(now)
monday.setDate(now.getDate() + diff)
monday.setHours(0,0,0,0)
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)
const semana_inicio = monday.toISOString().slice(0,10)
const semana_fin = sunday.toISOString().slice(0,10)
console.log(`📅 Semana: ${semana_inicio} → ${semana_fin}`)
console.log('')

// 3. Fetch publicaciones de Notion
console.log('2️⃣  Notion query...')
const t2 = Date.now()
const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_GRILLA_DB_ID}/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filter: {
      and: [
        { property: 'proyecto', relation: { contains: marca.notion_proyecto_id } },
        { property: 'Grilla de FIT', date: { on_or_after: semana_inicio } },
        { property: 'Grilla de FIT', date: { on_or_before: semana_fin } },
      ],
    },
    sorts: [{ property: 'Grilla de FIT', direction: 'ascending' }],
    page_size: 100,
  }),
})
const notionData = await notionRes.json()
const pubs = (notionData.results ?? []).map((page) => {
  const p = page.properties
  return {
    fecha: p['Grilla de FIT']?.date?.start?.slice(0, 10) ?? '',
    titulo: (p['Nombre de la tarea']?.title?.[0]?.plain_text ?? '').trim(),
    plataformas: (p['Plataforma']?.multi_select ?? []).map(x => x.name).join(' · '),
    tipo: (p['Tipo de contenido']?.multi_select ?? []).map(x => x.name).join(' · '),
  }
}).filter(p => p.titulo)
console.log(`   ✅ ${pubs.length} publicaciones (${Date.now()-t2}ms)`)
for (const p of pubs.slice(0, 5)) {
  console.log(`     • ${p.fecha} | ${p.titulo.slice(0, 50)}`)
}
console.log('')

// 4. Llamar al endpoint render-grilla
console.log('3️⃣  Endpoint render-grilla (Chromium en Vercel)...')
const t3 = Date.now()
const params = new URLSearchParams({
  slug,
  inicio: semana_inicio,
  fin: semana_fin,
  pubs: JSON.stringify(pubs),
})
if (marca.logo_url) params.set('logo', marca.logo_url)

const url = `${BASE_URL}/api/render-grilla?${params.toString()}`
const renderRes = await fetch(url, {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
})

if (!renderRes.ok) {
  const text = await renderRes.text()
  console.error(`   ❌ Endpoint falló: HTTP ${renderRes.status}`)
  console.error(`      ${text.slice(0, 400)}`)
  process.exit(1)
}
const pngBuffer = Buffer.from(await renderRes.arrayBuffer())
console.log(`   ✅ PNG ${pngBuffer.length} bytes (${Date.now()-t3}ms)`)
console.log('')

// 5. Upload a Supabase Storage
console.log('4️⃣  Upload a Supabase Storage...')
const t4 = Date.now()
const fileName = `${slug}/${semana_inicio}.png`
const uploadRes = await fetch(
  `${SUPABASE_URL}/storage/v1/object/grillas-png/${fileName}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: pngBuffer,
  },
)
if (!uploadRes.ok) {
  const t = await uploadRes.text()
  console.error(`   ❌ Upload fallido: HTTP ${uploadRes.status}: ${t.slice(0, 200)}`)
  process.exit(1)
}
const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/grillas-png/${fileName}`
console.log(`   ✅ Subido (${Date.now()-t4}ms)`)
console.log(`     ${publicUrl}`)

// Verificar que la URL es accesible
const headRes = await fetch(publicUrl, { method: 'HEAD' })
console.log(`   GET check: HTTP ${headRes.status}, content-length=${headRes.headers.get('content-length')}`)
console.log('')

console.log(`✨ TOTAL: ${Date.now()-startTotal}ms`)
console.log(`\n🖼️  Para verificar visualmente: open ${publicUrl}`)

await c.end()
