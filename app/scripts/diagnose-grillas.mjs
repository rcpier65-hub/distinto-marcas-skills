// Diagnóstico: estado actual de grillas + marcas + posibles errores
import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

console.log('═══════════════════════════════════════════════════════════')
console.log('📊 Estado de grillas por marca (mes actual)')
console.log('═══════════════════════════════════════════════════════════')
const r = await c.query(`
  SELECT m.slug, m.nombre, m.logo_url, m.notion_proyecto_id,
         gp.id as grilla_id, gp.estado, gp.semana_inicio, gp.semana_fin,
         gp.png_url IS NOT NULL as tiene_png,
         gp.publicaciones_count, gp.error, gp.updated_at
  FROM marcas m
  LEFT JOIN grillas_pendientes gp ON gp.marca_id = m.id
    AND gp.semana_inicio >= '2026-05-01' AND gp.semana_inicio <= '2026-05-31'
    AND gp.estado != 'cancelada'
  WHERE m.activa = true
  ORDER BY m.slug, gp.updated_at DESC NULLS LAST
`)

const byMarca = new Map()
for (const row of r.rows) {
  if (!byMarca.has(row.slug)) byMarca.set(row.slug, [])
  byMarca.get(row.slug).push(row)
}

for (const [slug, rows] of byMarca) {
  const m = rows[0]
  console.log(`\n━━━ ${slug} ━━━`)
  console.log(`  Nombre: ${m.nombre}`)
  console.log(`  Logo URL: ${m.logo_url ? '✅ ' + m.logo_url.slice(0, 60) : '❌ vacío (usa placeholder)'}`)
  console.log(`  Notion proyecto: ${m.notion_proyecto_id ? '✅' : '❌'}`)
  if (rows[0]?.grilla_id) {
    console.log(`  Grillas activas:`)
    for (const g of rows) {
      if (!g.grilla_id) continue
      console.log(`    • ${g.grilla_id.slice(0,8)} | ${g.semana_inicio} | estado=${g.estado} | png=${g.tiene_png ? '✅' : '❌'} | pubs=${g.publicaciones_count ?? '?'} | error=${g.error?.slice(0,60) ?? '-'}`)
    }
  } else {
    console.log(`  Grillas activas: ninguna`)
  }
}

await c.end()
