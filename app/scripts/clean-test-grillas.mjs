import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
// Cancelar todas las grillas en esperando_aprobacion / pendiente / procesando creadas hoy
// para empezar limpio el test del nuevo flow
const r = await c.query(`
  UPDATE grillas_pendientes
  SET estado = 'cancelada', cancelada_at = now(), notas = 'Cancelada al pivotear al nuevo flow web-sync'
  WHERE estado IN ('pendiente', 'procesando', 'esperando_aprobacion')
  RETURNING (SELECT slug FROM marcas WHERE id = grillas_pendientes.marca_id) as slug, estado
`)
console.log(`Canceladas ${r.rowCount} grillas viejas:`)
r.rows.forEach(row => console.log(`  ❌ ${row.slug}`))
await c.end()
