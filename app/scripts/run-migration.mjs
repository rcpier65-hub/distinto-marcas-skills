#!/usr/bin/env node
// Runner de migraciones SQL contra Supabase via Session Pooler.
// Uso: node scripts/run-migration.mjs <path-to-sql-file>
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
const { Client } = pg

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/run-migration.mjs <archivo.sql>')
  process.exit(1)
}

const sql = readFileSync(resolve(file), 'utf8')
const filename = file.split('/').pop()

const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx',
  password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

try {
  console.log(`▶ Ejecutando ${filename}...`)
  await client.connect()
  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')
  console.log(`✅ ${filename} aplicada`)
  await client.end()
} catch (e) {
  console.error(`❌ Error en ${filename}:`)
  console.error('   Message:', e.message)
  if (e.position) console.error('   Position:', e.position)
  if (e.hint) console.error('   Hint:', e.hint)
  try { await client.query('ROLLBACK'); await client.end() } catch {}
  process.exit(1)
}
