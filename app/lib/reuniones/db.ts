// app/lib/reuniones/db.ts
//
// Helpers de la tabla marca_reuniones. La columna google_event_id (mapea la
// reunión a su evento de Google Calendar, para editar/borrar/dedup) se
// AUTO-CREA vía pg directa — mismo patrón self-healing que influencers /
// reportes: sin migraciones que correr. Pedro 31-ago-2026: "100% sincronizado
// con Calendar".

import 'server-only'

/**
 * Asegura marca_reuniones.google_event_id (y estado, por si el entorno no la
 * tiene). Best-effort: los callers la invocan antes de escribir esa columna
 * y toleran el fallo (la reunión vale aunque no guarde el mapeo).
 */
export async function ensureReunionCols(): Promise<void> {
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
    await client.query('ALTER TABLE marca_reuniones ADD COLUMN IF NOT EXISTS google_event_id text')
    await client.query("ALTER TABLE marca_reuniones ADD COLUMN IF NOT EXISTS estado text DEFAULT 'agendada'")
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}
