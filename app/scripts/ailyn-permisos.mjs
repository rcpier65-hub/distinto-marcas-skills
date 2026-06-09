import pg from 'pg'

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

const antes = await c.query(
  "SELECT nombre, rol_base, permisos_override FROM team_members WHERE LOWER(nombre)='ailyn' OR email='ailyn@agenciadistinto.com'"
)
console.log('ANTES:')
console.log(JSON.stringify(antes.rows[0], null, 2))

// Override: apaga publicaciones (rol disenador la trae en true para subir portadas).
// Pedro quiere SOLO diseño + personal. El resto ya estaba false en el rol base.
const override = { publicaciones: { acceso: false, puede_editar: false } }
const r = await c.query(
  `UPDATE team_members
   SET permisos_override = $1::jsonb,
       updated_at = now()
   WHERE LOWER(nombre)='ailyn' OR email='ailyn@agenciadistinto.com'
   RETURNING nombre, rol_base, permisos_override`,
  [JSON.stringify(override)]
)
console.log('')
console.log('DESPUÉS:')
console.log(JSON.stringify(r.rows[0], null, 2))

await c.end()
