import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`SELECT proname FROM pg_proc WHERE proname ILIKE '%updated%' OR proname ILIKE '%timestamp%'`)
console.log('Funciones existentes:')
r.rows.forEach((row) => console.log(' ', row.proname))
const t = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
console.log('\nTablas:')
t.rows.forEach((row) => console.log(' ', row.tablename))
await c.end()
