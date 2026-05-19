// Test múltiples variantes de pooler URL
import pg from 'pg'
const { Client } = pg

const PROJECT_REF = 'exhmimlehdisonjvedvx'
const PASSWORD = 'Z-S,JHFbB46mUuC'

const variants = [
  // Variant 1: aws-1 (nueva nomenclatura 2025)
  { host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${PROJECT_REF}`, label: 'aws-1 us-east-1 session 5432' },
  { host: 'aws-1-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_REF}`, label: 'aws-1 us-east-1 transaction 6543' },
  // Variant 2: aws-1 sa-east-1
  { host: 'aws-1-sa-east-1.pooler.supabase.com', port: 5432, user: `postgres.${PROJECT_REF}`, label: 'aws-1 sa-east-1 session' },
  // Variant 3: aws-1 us-east-2
  { host: 'aws-1-us-east-2.pooler.supabase.com', port: 5432, user: `postgres.${PROJECT_REF}`, label: 'aws-1 us-east-2 session' },
  // Variant 4: aws-1 us-west-1
  { host: 'aws-1-us-west-1.pooler.supabase.com', port: 5432, user: `postgres.${PROJECT_REF}`, label: 'aws-1 us-west-1 session' },
  // Variant 5: aws-0 con puerto 6543 transaction
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_REF}`, label: 'aws-0 us-east-1 transaction 6543' },
]

for (const v of variants) {
  const c = new Client({
    host: v.host,
    port: v.port,
    database: 'postgres',
    user: v.user,
    password: PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  })
  try {
    await c.connect()
    const r = await c.query('SELECT 1')
    console.log(`✅ ${v.label} → OK`)
    await c.end()
    process.exit(0)
  } catch (e) {
    console.log(`❌ ${v.label} → ${e.code || e.message.slice(0, 50)}`)
    try { await c.end() } catch {}
  }
}
console.log('Ninguna variante funcionó')
