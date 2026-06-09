import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()
const today = new Date().toISOString().slice(0, 10)
const next = await c.query(
  `SELECT g.id, g.fecha_planeada, g.hora_planeada, g.estado, g.notas, m.slug, m.nombre
   FROM grabaciones g
   LEFT JOIN marcas m ON m.id = g.marca_id
   WHERE g.fecha_planeada >= $1
   ORDER BY g.fecha_planeada LIMIT 10`,
  [today]
)
console.log('Próximas grabaciones:')
for (const r of next.rows) {
  console.log(' ', r.fecha_planeada, (r.hora_planeada ?? '--:--'), '|',
    (r.notas || '(sin notas)').slice(0, 40), '|', r.nombre || '(sin marca)', '|', r.estado)
}
console.log(`\nTotal: ${next.rows.length}`)
await c.end()
