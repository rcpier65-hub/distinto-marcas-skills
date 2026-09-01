// app/lib/oficina/db.ts
//
// Persistencia de la oficina virtual: el AVATAR de cada persona y el
// ESCRITORIO que reclamó. Antes el avatar vivía en localStorage, así que se
// perdía al cambiar de computadora o de navegador.
//
// La tabla se AUTO-CREA en la primera escritura vía pg directa (mismo patrón
// que influencers / reportes_mensuales) — no hay que correr migraciones.
import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

export type PerfilOficina = {
  user_id: string
  nombre: string | null
  avatar: Record<string, string> | null
  escritorio: string | null      // etiqueta del escritorio reclamado
  ultima_visita: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PgClient = any

async function pgConnect(): Promise<PgClient> {
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
  return client
}

const DDL = `CREATE TABLE IF NOT EXISTS oficina_perfiles (
  user_id uuid PRIMARY KEY,
  nombre text,
  avatar jsonb,
  escritorio text,
  ultima_visita timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`

async function conTabla<T>(fn: (c: PgClient) => Promise<T>): Promise<T> {
  const client = await pgConnect()
  try {
    await client.query(DDL)
    const out = await fn(client)
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
    return out
  } finally {
    await client.end()
  }
}

/** Guarda el avatar de una persona (y refresca su última visita). */
export async function guardarAvatarDb(userId: string, nombre: string, avatar: Record<string, string>): Promise<void> {
  await conTabla(async (c) => {
    await c.query(
      `INSERT INTO oficina_perfiles (user_id, nombre, avatar, ultima_visita, updated_at)
       VALUES ($1,$2,$3,now(),now())
       ON CONFLICT (user_id) DO UPDATE SET nombre = $2, avatar = $3, ultima_visita = now(), updated_at = now()`,
      [userId, nombre, JSON.stringify(avatar)],
    )
  })
}

/**
 * Reclama un escritorio. Un escritorio es de una sola persona: si alguien más
 * lo tenía, se le quita (el último que lo reclama se queda con él).
 * `escritorio = null` lo libera.
 */
export async function reclamarEscritorioDb(userId: string, nombre: string, escritorio: string | null): Promise<void> {
  await conTabla(async (c) => {
    if (escritorio) {
      await c.query('UPDATE oficina_perfiles SET escritorio = NULL WHERE escritorio = $1 AND user_id <> $2', [escritorio, userId])
    }
    await c.query(
      `INSERT INTO oficina_perfiles (user_id, nombre, escritorio, ultima_visita, updated_at)
       VALUES ($1,$2,$3,now(),now())
       ON CONFLICT (user_id) DO UPDATE SET nombre = $2, escritorio = $3, ultima_visita = now(), updated_at = now()`,
      [userId, nombre, escritorio],
    )
  })
}

/** Perfiles de todo el equipo (para pintar los nombres en los escritorios). */
export async function leerPerfilesDb(): Promise<PerfilOficina[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  try {
    const { data, error } = await service
      .from('oficina_perfiles')
      .select('user_id, nombre, avatar, escritorio, ultima_visita')
    if (!error && data) return data as PerfilOficina[]
  } catch { /* cae al fallback */ }
  try {
    return await conTabla(async (c) => {
      const r = await c.query('SELECT user_id, nombre, avatar, escritorio, ultima_visita FROM oficina_perfiles')
      return r.rows as PerfilOficina[]
    })
  } catch {
    return []
  }
}
