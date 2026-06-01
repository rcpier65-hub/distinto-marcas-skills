import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const editores = await c.query(`SELECT id, nombre, activo FROM editores ORDER BY nombre`)
console.log(`Editores creados: ${editores.rows.length}`)
editores.rows.forEach((r) => console.log(`  • ${r.nombre} (${r.activo ? 'activo' : 'inactivo'})`))

const sample = await c.query(`
  SELECT p.nombre, p.editor_nombre, e.nombre AS editor_via_fk
  FROM publicaciones p
  LEFT JOIN editores e ON e.id = p.editor_id
  WHERE p.editor_nombre IS NOT NULL
  LIMIT 8
`)
console.log(`\nSample con FK vinculada:`)
sample.rows.forEach((r) => console.log(`  • ${r.nombre.slice(0, 40)} | editor_nombre="${r.editor_nombre}" → FK="${r.editor_via_fk ?? 'NULL'}"`))

await c.end()
