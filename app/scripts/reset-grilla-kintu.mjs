// One-off: verifica notion_proyecto_id y reinicia la grilla activa de Kintu.
import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx',
  password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

await client.connect()

console.log('=== Verificación notion_proyecto_id por marca ===')
const verif = await client.query(`SELECT slug, nombre, notion_proyecto_id FROM marcas ORDER BY slug`)
verif.rows.forEach(r => {
  const ok = r.notion_proyecto_id ? '✅' : '❌'
  console.log(`  ${ok} ${r.slug.padEnd(25)} ${r.notion_proyecto_id || 'NULL'}`)
})

console.log('\n=== Estado actual grilla Kintu ===')
const g = await client.query(`
  SELECT gp.id, gp.estado, gp.semana_inicio, gp.png_url, gp.error, gp.publicaciones_count
  FROM grillas_pendientes gp
  JOIN marcas m ON m.id = gp.marca_id
  WHERE m.slug = 'kintu'
  ORDER BY gp.pedida_at DESC
  LIMIT 3
`)
g.rows.forEach(r => {
  console.log(`  • ${r.id.slice(0, 8)}... estado=${r.estado} pubs=${r.publicaciones_count ?? '?'} png=${r.png_url ? 'sí' : 'no'} error=${r.error?.slice(0, 60) || '—'}`)
})

console.log('\n=== Borrando grillas activas de Kintu para regenerar limpio ===')
const del = await client.query(`
  DELETE FROM grillas_pendientes
  WHERE marca_id = (SELECT id FROM marcas WHERE slug = 'kintu')
    AND estado IN ('pendiente', 'procesando', 'esperando_aprobacion', 'enviada')
  RETURNING id, estado
`)
console.log(`  Borradas: ${del.rows.length}`)
del.rows.forEach(r => console.log(`    • ${r.id.slice(0, 8)}... era ${r.estado}`))

await client.end()
console.log('\n✅ Listo. Ahora Pedro puede hacer "Pedir grilla" de Kintu y todo será fresco.')
