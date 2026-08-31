// app/lib/tareas/pro-db.ts
//
// Columnas "pro" de la tabla tareas — self-healing (sin migraciones):
//   estado        text  ('sin_empezar' | 'en_proceso' | 'archivado')
//   fecha_inicio  date  (opcional — para el rango del Gantt)
//   fecha_entrega date  (opcional — deadline; barra del Gantt y calendario)
// Pedro 31-ago-2026: estados en la card + fechas + vista Gantt/calendario
// tanto en la app del equipo como en el portal del cliente.

import 'server-only'

export { ESTADOS_TAREA, ESTADO_TAREA_LABEL, type EstadoTarea } from './pro-types'

export async function ensureTareasProCols(): Promise<void> {
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
    await client.query("ALTER TABLE tareas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'sin_empezar'")
    await client.query('ALTER TABLE tareas ADD COLUMN IF NOT EXISTS fecha_inicio date')
    await client.query('ALTER TABLE tareas ADD COLUMN IF NOT EXISTS fecha_entrega date')
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}
