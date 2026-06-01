// Borra grillas activas de una marca para forzar regeneración fresh.
// Uso: node scripts/reset-grilla.mjs <slug>
import pg from 'pg'
const { Client } = pg

const slug = process.argv[2]
if (!slug) {
  console.error('Uso: node scripts/reset-grilla.mjs <slug>')
  process.exit(1)
}

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

const del = await client.query(
  `DELETE FROM grillas_pendientes
   WHERE marca_id = (SELECT id FROM marcas WHERE slug = $1)
     AND estado IN ('pendiente', 'procesando', 'esperando_aprobacion', 'enviada')
   RETURNING id, estado`,
  [slug],
)
console.log(`Borradas ${del.rows.length} grillas activas de ${slug}`)
del.rows.forEach((r) => console.log(`  • ${r.id.slice(0, 8)}... era ${r.estado}`))

await client.end()
