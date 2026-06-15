#!/usr/bin/env node
// Runner de migraciones que toma la conexión desde SUPABASE_DB_URL (env).
// Reemplaza a run-migration.mjs (tenía la contraseña hardcodeada vencida).
// Uso: SUPABASE_DB_URL="postgres://..." node scripts/run-migration-env.mjs <archivo.sql>
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
const { Client } = pg

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/run-migration-env.mjs <archivo.sql>')
  process.exit(1)
}
const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL en el entorno')
  process.exit(1)
}

const sql = readFileSync(resolve(file), 'utf8')
const filename = file.split('/').pop()
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })

try {
  console.log(`▶ Ejecutando ${filename}...`)
  await client.connect()
  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')
  console.log(`✅ ${filename} aplicada`)
  await client.end()
} catch (e) {
  console.error(`❌ Error en ${filename}: ${e.message}`)
  if (e.hint) console.error('   Hint:', e.hint)
  try { await client.query('ROLLBACK'); await client.end() } catch {}
  process.exit(1)
}
