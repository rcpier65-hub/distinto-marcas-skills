import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`
  SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname IN ('update_updated_at_column', 'trigger_set_timestamp', 'set_updated_at')
`)
console.log('Funciones con sus schemas:')
r.rows.forEach((row) => console.log(' ', row.schema + '.' + row.name + '(' + row.args + ')'))
await c.end()
