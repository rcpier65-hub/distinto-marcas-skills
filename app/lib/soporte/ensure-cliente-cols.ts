// app/lib/soporte/ensure-cliente-cols.ts
//
// Self-healing: agrega a `soporte_reportes` la columna que identifica los
// reportes creados desde el PORTAL DEL CLIENTE (marca_id). Mismo patrón
// pg-directa que lib/reuniones/db.ts — sin migraciones que correr.
// Pedro 31-ago-2026: "quita observaciones y pon enviar un reporte a soporte".
import 'server-only'

export async function ensureSoporteClienteCols(): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
  if (!dbUrl) throw new Error('SUPABASE_DB_URL no disponible en el runtime')
  const { Client } = await import('pg')
  const u = new URL(dbUrl)
  const client = new Client({
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
  })
  await client.connect()
  try {
    await client.query('ALTER TABLE soporte_reportes ADD COLUMN IF NOT EXISTS marca_id uuid')
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}
