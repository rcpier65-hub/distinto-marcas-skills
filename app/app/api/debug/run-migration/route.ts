// app/app/api/debug/run-migration/route.ts
//
// Endpoint debug para ejecutar SQL arbitrario (DDL incluido) contra la BD
// productiva DESDE adentro del runtime de Vercel, donde las env vars
// (SUPABASE_DB_URL) están vigentes incluso si las credenciales fueron
// rotadas localmente.
//
// USO:
//   POST /api/debug/run-migration
//   Header: Authorization: Bearer $CRON_SECRET
//   Body: { sql: "CREATE TABLE ...", label?: "022_marca_facts" }
//
// SECURITY: Locked detrás de CRON_SECRET. Pedro lo invoca con curl.
// NO exponer a usuarios finales. NO permitir desde browser.
//
// Por qué existe: aplicar migrations DDL sin tener que abrir Supabase
// Studio cada vez. Y porque el password de Postgres del backup local
// está rotado, pero las env vars de Vercel sí están al día.

import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function getDbConfig(): { user: string; password: string; host: string; port: number; database: string; ssl: { rejectUnauthorized: boolean } } | null {
  // Vercel env var. Prefiere POOLER (port 6543 = transaction) o SUPABASE_DB_URL
  // (port 5432 = session). DDL funciona con session mode mejor.
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
  if (!dbUrl) return null

  // Parseo manual porque pg parser rompe usernames con punto
  // ("postgres.<project_ref>" del pooler de Supabase).
  const parsed = new URL(dbUrl)
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
  }
}

export async function POST(request: Request) {
  // Auth
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  // Parsear body
  let body: { sql?: string; label?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'body debe ser JSON con {sql}' }, { status: 400 })
  }

  const sql = body.sql?.trim()
  const label = body.label ?? 'unnamed'
  if (!sql || sql.length < 10) {
    return NextResponse.json({ ok: false, error: 'sql requerido (min 10 chars)' }, { status: 400 })
  }

  // Validar config
  const config = getDbConfig()
  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_DB_URL no configurado en Vercel env vars' },
      { status: 500 },
    )
  }

  // Ejecutar
  const client = new Client(config)
  const start = Date.now()
  try {
    await client.connect()
    const result = await client.query(sql)
    await client.end()

    return NextResponse.json({
      ok: true,
      label,
      duration_ms: Date.now() - start,
      whoami: { host: config.host, user: config.user, database: config.database },
      result: {
        // result puede ser una array de results (si el SQL tiene múltiples statements)
        // o un solo result. Devolvemos resumen amigable.
        statements: Array.isArray(result) ? result.length : 1,
        rowCount: Array.isArray(result)
          ? result.map(r => r.rowCount ?? 0).reduce((a, b) => a + b, 0)
          : (result.rowCount ?? 0),
        command: Array.isArray(result) ? result.map(r => r.command) : result.command,
      },
    })
  } catch (err) {
    try { await client.end() } catch { /* ignore */ }
    const error = err as Error & { code?: string; detail?: string }
    return NextResponse.json(
      {
        ok: false,
        label,
        duration_ms: Date.now() - start,
        error: error.message,
        code: error.code,
        detail: error.detail,
        whoami: { host: config.host, user: config.user, database: config.database },
      },
      { status: 500 },
    )
  }
}
