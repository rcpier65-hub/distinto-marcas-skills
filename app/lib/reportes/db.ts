// app/lib/reportes/db.ts
// Persistencia de los meses del reporte en la tabla `reportes_mensuales`
// (marca_slug + mes únicos, data cruda en jsonb). La tabla se AUTO-CREA en el
// primer guardado vía conexión pg directa (mismo patrón que Settings →
// writeAnthropicKeyViaPg), así no depende de que se corra una migración.
// Lectura: PostgREST primero; si su schema cache aún no ve la tabla
// (PGRST205/42P01), fallback por pg directa.
import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import type { MesRaw } from './typhouse'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PgClient = any

async function pgConnect(): Promise<PgClient | null> {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
  if (!dbUrl) return null
  const { Client } = await import('pg')
  const u = new URL(dbUrl)
  const client = new Client({
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
    /* Nunca colgar una página por la BD: si no conecta en 5s, falla y el
       caller cae a su fallback (seed / vacío). */
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
  })
  await client.connect()
  return client
}

const DDL = `CREATE TABLE IF NOT EXISTS reportes_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_slug text NOT NULL,
  mes text NOT NULL,
  datos jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marca_slug, mes)
)`

/** Guarda (upsert) un mes de reporte para una marca. Lanza si falla. */
export async function guardarMesDb(marcaSlug: string, raw: MesRaw): Promise<void> {
  const client = await pgConnect()
  if (!client) throw new Error('SUPABASE_DB_URL no disponible en el runtime')
  try {
    await client.query(DDL)
    await client.query(
      `INSERT INTO reportes_mensuales (marca_slug, mes, datos) VALUES ($1, $2, $3)
       ON CONFLICT (marca_slug, mes) DO UPDATE SET datos = $3, updated_at = now()`,
      [marcaSlug, raw.mes, JSON.stringify(raw)],
    )
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}

/** Elimina un mes guardado (no afecta la data seed del código). */
export async function eliminarMesDb(marcaSlug: string, mes: string): Promise<void> {
  const client = await pgConnect()
  if (!client) throw new Error('SUPABASE_DB_URL no disponible en el runtime')
  try {
    await client.query(DDL)
    await client.query('DELETE FROM reportes_mensuales WHERE marca_slug = $1 AND mes = $2', [marcaSlug, mes])
  } finally {
    await client.end()
  }
}

/** Lee TODOS los meses guardados, agrupados por marca_slug. Nunca lanza. */
export async function leerMesesDb(): Promise<Record<string, MesRaw[]>> {
  // 1) PostgREST (rápido)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data, error } = await service.from('reportes_mensuales').select('marca_slug, datos')
    if (!error && Array.isArray(data)) return agrupar(data)
  } catch { /* fallback */ }
  // 2) pg directa (tabla nueva que PostgREST aún no ve)
  try {
    const client = await pgConnect()
    if (!client) return {}
    try {
      const r = await client.query('SELECT marca_slug, datos FROM reportes_mensuales')
      return agrupar(r.rows)
    } finally {
      await client.end()
    }
  } catch { return {} }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function agrupar(rows: any[]): Record<string, MesRaw[]> {
  const out: Record<string, MesRaw[]> = {}
  for (const r of rows ?? []) {
    const slug = String(r.marca_slug)
    const d = typeof r.datos === 'string' ? JSON.parse(r.datos) : r.datos
    if (!d?.mes) continue
    ;(out[slug] ??= []).push(d as MesRaw)
  }
  return out
}
