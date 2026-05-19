import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
// Calcular semana actual (lunes a domingo)
const today = new Date()
const day = today.getDay()
const diffToMonday = day === 0 ? -6 : 1 - day
const monday = new Date(today)
monday.setDate(today.getDate() + diffToMonday)
monday.setHours(0,0,0,0)
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)
const inicio = monday.toISOString().slice(0,10)
const fin = sunday.toISOString().slice(0,10)
console.log(`Semana: ${inicio} → ${fin}`)
// Insertar 4 grillas
const slugs = ['lozano', 'kintu', 'novalamps', 'la-victoria']
for (const slug of slugs) {
  const mr = await c.query(`SELECT id, nombre FROM marcas WHERE slug = $1`, [slug])
  if (mr.rows.length === 0) { console.log(`  ❌ ${slug} no existe`); continue }
  const m = mr.rows[0]
  // ON CONFLICT por semana — si ya existe la misma semana, no duplicar
  const r = await c.query(`
    INSERT INTO grillas_pendientes (marca_id, semana_inicio, semana_fin, estado)
    VALUES ($1, $2, $3, 'pendiente')
    ON CONFLICT (marca_id, semana_inicio) DO UPDATE SET estado = 'pendiente', error = null
    RETURNING id, estado
  `, [m.id, inicio, fin])
  console.log(`  ✅ ${slug.padEnd(15)} (${m.nombre}) → ${r.rows[0].estado} [id ${r.rows[0].id}]`)
}
console.log('\n=== Pendientes ahora ===')
const p = await c.query(`
  SELECT m.slug, gp.estado FROM grillas_pendientes gp
  JOIN marcas m ON m.id = gp.marca_id
  WHERE gp.estado = 'pendiente' ORDER BY m.slug
`)
p.rows.forEach(r => console.log(`  🟡 ${r.slug.padEnd(15)} ${r.estado}`))
await c.end()
