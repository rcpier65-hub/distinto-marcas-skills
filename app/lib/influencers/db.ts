// app/lib/influencers/db.ts
// Persistencia del módulo Influencers (tabla `influencers`, por marca_slug).
// La tabla se AUTO-CREA en la primera escritura vía pg directa (mismo patrón
// que reportes_mensuales / Settings) — no depende de correr migraciones.
// Lectura: PostgREST primero; si su schema cache aún no ve la tabla, fallback
// por pg directa. Escrituras: siempre por pg directa (volumen bajo, robusto).
import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

export type EstadoInfluencer = 'pedido_enviado' | 'pedido_entregado' | 'video_enviado'

export type Influencer = {
  id: string
  marca_slug: string
  usuario_ig: string
  nombre: string | null
  estado: EstadoInfluencer
  video_url: string | null
  notas: string | null
  created_at: string
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

const DDL = `CREATE TABLE IF NOT EXISTS influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_slug text NOT NULL,
  usuario_ig text NOT NULL,
  nombre text,
  estado text NOT NULL DEFAULT 'pedido_enviado',
  video_url text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`

async function conTabla<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
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

export async function crearInfluencerDb(input: { marcaSlug: string; usuarioIg: string; nombre: string | null; estado: EstadoInfluencer; notas: string | null }): Promise<string> {
  return conTabla(async (c) => {
    const r = await c.query(
      `INSERT INTO influencers (marca_slug, usuario_ig, nombre, estado, notas) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [input.marcaSlug, input.usuarioIg, input.nombre, input.estado, input.notas],
    )
    return String(r.rows[0].id)
  })
}

export async function actualizarInfluencerDb(id: string, patch: Partial<Pick<Influencer, 'usuario_ig' | 'nombre' | 'estado' | 'video_url' | 'notas'>>): Promise<void> {
  const keys = Object.keys(patch) as Array<keyof typeof patch>
  if (keys.length === 0) return
  await conTabla(async (c) => {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    await c.query(`UPDATE influencers SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...keys.map((k) => patch[k] ?? null)])
  })
}

export async function eliminarInfluencerDb(id: string): Promise<void> {
  await conTabla(async (c) => { await c.query('DELETE FROM influencers WHERE id = $1', [id]) })
}

export async function leerInfluencersDb(marcaSlug: string): Promise<Influencer[]> {
  // 1) PostgREST (rápido cuando el cache ya conoce la tabla)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data, error } = await service
      .from('influencers')
      .select('id, marca_slug, usuario_ig, nombre, estado, video_url, notas, created_at')
      .eq('marca_slug', marcaSlug)
      .order('created_at', { ascending: false })
    if (!error && Array.isArray(data)) return data as Influencer[]
  } catch { /* fallback */ }
  // 2) pg directa (o tabla aún no creada → lista vacía)
  try {
    const client = await pgConnect()
    try {
      const r = await client.query(
        'SELECT id, marca_slug, usuario_ig, nombre, estado, video_url, notas, created_at FROM influencers WHERE marca_slug = $1 ORDER BY created_at DESC',
        [marcaSlug],
      )
      return r.rows as Influencer[]
    } finally {
      await client.end()
    }
  } catch { return [] }
}
