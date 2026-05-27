// scripts/apply-migrations.mjs
//
// Aplica migrations Postgres directo via conexión psql al proyecto productivo.
// Usa SUPABASE_DB_URL_DIRECT del .env.local.backup.
//
// Uso:
//   node scripts/apply-migrations.mjs <migration-file.sql> [<migration-file2.sql>]
//
// Idempotente: las migrations usan IF NOT EXISTS / OR REPLACE en su mayoría.

import { readFileSync } from 'node:fs'
import { Client } from 'pg'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lee .env.local.backup. Prefiere SUPABASE_DB_URL (pooler, single transaction
// mode en port 5432) que es la URL que Supabase mantiene activa hoy. Cae a
// SUPABASE_DB_URL_DIRECT solo si la primera no existe.
function readDbUrl() {
  const envPath = resolve(__dirname, '..', '.env.local.backup')
  const content = readFileSync(envPath, 'utf8')

  // Prioridad: SUPABASE_DB_URL (pooler) → SUPABASE_DB_URL_DIRECT (legacy)
  const tryKeys = ['SUPABASE_DB_URL', 'SUPABASE_DB_URL_DIRECT']
  for (const key of tryKeys) {
    // Regex permite líneas comentadas con # también, por si Pedro las dejó así
    const re = new RegExp(`^\\s*#?\\s*${key}=(.+)$`, 'm')
    const match = content.match(re)
    if (match) {
      const url = match[1].trim().replace(/^["']|["']$/g, '')
      console.log(`  usando ${key}`)
      return url
    }
  }
  throw new Error('No se encontró SUPABASE_DB_URL ni SUPABASE_DB_URL_DIRECT en .env.local.backup')
}

async function applyMigration(client, filePath) {
  const sql = readFileSync(filePath, 'utf8')
  const fileName = filePath.split('/').pop()
  console.log(`\n→ Aplicando ${fileName} (${sql.length} bytes)…`)
  try {
    await client.query(sql)
    console.log(`  ✅ OK: ${fileName} aplicada`)
    return { ok: true, file: fileName }
  } catch (err) {
    console.error(`  ❌ ERROR aplicando ${fileName}:`, err.message)
    return { ok: false, file: fileName, error: err.message }
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Uso: node scripts/apply-migrations.mjs <file.sql> [<file2.sql>...]')
    process.exit(1)
  }

  const dbUrl = readDbUrl()
  console.log(`Conectando a Postgres…`)

  // Parseamos el URL a mano porque `pg` rompe usernames con punto
  // (ej "postgres.<project_ref>" del pooler de Supabase). El URL parser de
  // pg corta en el primer ".", terminando con user="postgres" y rompiendo
  // la auth.
  const parsed = new URL(dbUrl)
  const config = {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
    // Supabase requiere SSL siempre. rejectUnauthorized=false porque el cert
    // del pooler puede no pasar la validación estricta (Supabase usa CA propia).
    ssl: { rejectUnauthorized: false },
  }
  console.log(`  host: ${config.host}`)
  console.log(`  user: ${config.user}`)
  console.log(`  database: ${config.database}`)

  const client = new Client(config)
  await client.connect()
  console.log(`  ✅ Conectado`)

  const migrationsDir = resolve(__dirname, '..', 'supabase', 'migrations')
  const results = []
  for (const arg of args) {
    const fullPath = arg.includes('/') ? arg : join(migrationsDir, arg)
    const r = await applyMigration(client, fullPath)
    results.push(r)
    if (!r.ok) break // si una falla, no seguimos con la siguiente
  }

  await client.end()

  // Resumen
  console.log('\n── RESUMEN ──')
  for (const r of results) {
    console.log(r.ok ? `  ✅ ${r.file}` : `  ❌ ${r.file}: ${r.error}`)
  }

  const allOk = results.every(r => r.ok)
  process.exit(allOk ? 0 : 1)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
