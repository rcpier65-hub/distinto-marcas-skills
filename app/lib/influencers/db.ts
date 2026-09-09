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
  telefono: string | null
  productos_enviados: string[]
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
  telefono text,
  productos_enviados text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`

/** Columnas nuevas sobre tablas ya creadas (CREATE IF NOT EXISTS no las agrega). */
const DDL_COLS = `
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS productos_enviados text[] NOT NULL DEFAULT '{}'::text[];
`

const SELECT_COLS = 'id, marca_slug, usuario_ig, nombre, estado, video_url, notas, telefono, productos_enviados, created_at'

function normalizarProductos(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x ?? '').trim()).filter(Boolean)
}

function mapRow(row: Record<string, unknown>): Influencer {
  return {
    id: String(row.id),
    marca_slug: String(row.marca_slug),
    usuario_ig: String(row.usuario_ig),
    nombre: (row.nombre as string | null) ?? null,
    estado: row.estado as EstadoInfluencer,
    video_url: (row.video_url as string | null) ?? null,
    notas: (row.notas as string | null) ?? null,
    telefono: (row.telefono as string | null) ?? null,
    productos_enviados: normalizarProductos(row.productos_enviados),
    created_at: String(row.created_at),
  }
}

async function conTabla<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const client = await pgConnect()
  try {
    await client.query(DDL)
    await client.query(DDL_COLS)
    const out = await fn(client)
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
    return out
  } finally {
    await client.end()
  }
}

export async function crearInfluencerDb(input: {
  marcaSlug: string
  usuarioIg: string
  nombre: string | null
  estado: EstadoInfluencer
  notas: string | null
  telefono: string | null
  productosEnviados: string[]
}): Promise<string> {
  return conTabla(async (c) => {
    const productos = normalizarProductos(input.productosEnviados)
    const r = await c.query(
      `INSERT INTO influencers (marca_slug, usuario_ig, nombre, estado, notas, telefono, productos_enviados)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.marcaSlug, input.usuarioIg, input.nombre, input.estado, input.notas, input.telefono, productos],
    )
    return String(r.rows[0].id)
  })
}

export async function actualizarInfluencerDb(
  id: string,
  patch: Partial<Pick<Influencer, 'usuario_ig' | 'nombre' | 'estado' | 'video_url' | 'notas' | 'telefono' | 'productos_enviados'>>,
): Promise<void> {
  const keys = Object.keys(patch) as Array<keyof typeof patch>
  if (keys.length === 0) return
  await conTabla(async (c) => {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = keys.map((k) => {
      const v = patch[k]
      if (k === 'productos_enviados') return normalizarProductos(v)
      return v ?? null
    })
    await c.query(`UPDATE influencers SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...vals])
  })
}

export async function eliminarInfluencerDb(id: string): Promise<void> {
  await conTabla(async (c) => { await c.query('DELETE FROM influencers WHERE id = $1', [id]) })
}

/* ==================== Activación POR MARCA ====================
   El módulo se activa/desactiva por marca vía marcas.influencers_activo
   (columna auto-creada — sin migraciones). Default histórico: si la columna
   no existe o está NULL, solo TypHouse (little-joe) está activa. */

const DDL_FLAG = `ALTER TABLE marcas ADD COLUMN IF NOT EXISTS influencers_activo boolean`

export async function setInfluencersActivoDb(marcaSlug: string, activo: boolean): Promise<void> {
  const client = await pgConnect()
  try {
    await client.query(DDL_FLAG)
    await client.query('UPDATE marcas SET influencers_activo = $2 WHERE slug = $1', [marcaSlug, activo])
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}

/** ¿Está activo Influencers para esta marca? (aplica el default little-joe) */
export function influencersActivoDe(slug: string, flag: boolean | null | undefined): boolean {
  return flag ?? slug === 'little-joe'
}

export async function leerInfluencersDb(marcaSlug: string): Promise<Influencer[]> {
  // 1) PostgREST (rápido cuando el cache ya conoce la tabla)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data, error } = await service
      .from('influencers')
      .select(SELECT_COLS)
      .eq('marca_slug', marcaSlug)
      .order('created_at', { ascending: false })
    if (!error && Array.isArray(data)) return data.map((r: Record<string, unknown>) => mapRow(r))
  } catch { /* fallback */ }
  // 2) pg directa (o tabla aún no creada → lista vacía)
  try {
    const client = await pgConnect()
    try {
      await client.query(DDL_COLS)
      const r = await client.query(
        `SELECT ${SELECT_COLS} FROM influencers WHERE marca_slug = $1 ORDER BY created_at DESC`,
        [marcaSlug],
      )
      return (r.rows as Record<string, unknown>[]).map(mapRow)
    } finally {
      await client.end()
    }
  } catch { return [] }
}
