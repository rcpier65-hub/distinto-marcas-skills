// Test de conexión via Supabase Pooler (Supavisor) — IPv4 compatible
// Uso: node scripts/test-pg-pooler.mjs <region>
import pg from 'pg'
const { Client } = pg

const PROJECT_REF = 'exhmimlehdisonjvedvx'
const PASSWORD = 'Z-S,JHFbB46mUuC'
const region = process.argv[2] || 'us-east-1'

const client = new Client({
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 5432,  // session mode (DDL ok). 6543 sería transaction mode
  database: 'postgres',
  user: `postgres.${PROJECT_REF}`,
  password: PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

try {
  console.log(`Probando pooler en región ${region}...`)
  await client.connect()
  console.log('✅ Conectado')
  const res = await client.query('SELECT version() as ver, current_database() as db')
  console.log('PG:', res.rows[0].ver.split(',')[0])
  console.log('DB:', res.rows[0].db)
  await client.end()
  console.log('✅ Test OK')
} catch (e) {
  console.error('❌ Error:', e.message)
  console.error('   Code:', e.code)
  process.exit(1)
}
