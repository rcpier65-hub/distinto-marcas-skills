/* Migration: agrega 'pausada' al enum estado_tarea + columna
   motivo_pausa en publicaciones. Pedro pidió poder pausar tareas
   indicando el motivo. */
import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

try {
  await c.query("ALTER TYPE estado_tarea ADD VALUE IF NOT EXISTS 'pausada'")
  console.log('+ valor pausada agregado al enum estado_tarea')
} catch (e) { console.log('? pausada:', e.message) }

await c.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS motivo_pausa text')
console.log('+ columna motivo_pausa creada')

const r = await c.query(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'estado_tarea' ORDER BY enumsortorder`)
console.log('\nenum final:', r.rows.map((x) => x.enumlabel).join(', '))
await c.end()
