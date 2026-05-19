// Test de conexión directa a Supabase Postgres
// Uso: node scripts/test-pg-connection.mjs
import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'db.exhmimlehdisonjvedvx.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

try {
  console.log('Conectando a Supabase Postgres...')
  await client.connect()
  console.log('✅ Conectado')
  const res = await client.query('SELECT version() as ver, current_database() as db, current_user as user')
  console.log('PG version:', res.rows[0].ver.split(',')[0])
  console.log('DB:', res.rows[0].db)
  console.log('User:', res.rows[0].user)
  await client.end()
  console.log('✅ Test OK')
} catch (e) {
  console.error('❌ Error:', e.message)
  console.error('   Code:', e.code)
  process.exit(1)
}
