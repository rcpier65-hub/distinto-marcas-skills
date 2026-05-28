// app/lib/integrations/metricool.ts
//
// Cliente HTTP para Metricool API. Wrapper minimalista de los endpoints
// que la app de Distinto necesita para el sistema de respuesta de comentarios.
//
// Auth: header `X-Mc-Auth` con el token de Pedro (env METRICOOL_USER_TOKEN).
// Cada request al endpoint /api/v2/... incluye `userId` y `blogId` como
// query params (no se mete el blog_id en la URL path como otras APIs).
//
// IMPORTANTE: Metricool tiene rate limits (no documentados claramente). Si
// excedés, devuelve 429. Para la app, fetcheamos máximo 7 marcas x 3 redes
// (21 calls) cada mañana — muy por debajo de cualquier límite razonable.

import { createServiceClient } from '@/lib/supabase/service'

const METRICOOL_BASE = 'https://app.metricool.com'

// Env vars sirven como FALLBACK si la BD no está configurada todavía.
// La BD (tabla integraciones) tiene prioridad — Pedro la edita desde Settings UI.
const ENV_USER_ID = process.env.METRICOOL_USER_ID ?? ''
const ENV_TOKEN = process.env.METRICOOL_USER_TOKEN ?? ''

// Cache simple por request lifecycle (en serverless cada request es nuevo
// proceso, así que el cache muere en segundos). Evita N+1 fetches a BD.
let _cachedCreds: { userId: string; token: string; ts: number } | null = null
const CACHE_TTL_MS = 30_000  // 30s — balance entre fresh y query economy

async function getCredentials(): Promise<{ userId: string; token: string } | null> {
  // Cache hit?
  if (_cachedCreds && Date.now() - _cachedCreds.ts < CACHE_TTL_MS) {
    return _cachedCreds
  }

  // Intentar BD primero
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data } = await service
      .from('integraciones')
      .select('metricool_user_id, metricool_user_token')
      .eq('id', 1)
      .maybeSingle()
    if (data?.metricool_user_id && data?.metricool_user_token) {
      _cachedCreds = {
        userId: data.metricool_user_id,
        token: data.metricool_user_token,
        ts: Date.now(),
      }
      return _cachedCreds
    }
  } catch {
    // Tabla no existe (pre-migration 020) → cae al fallback env
  }

  // Fallback env vars
  if (ENV_USER_ID && ENV_TOKEN) {
    _cachedCreds = { userId: ENV_USER_ID, token: ENV_TOKEN, ts: Date.now() }
    return _cachedCreds
  }

  return null
}

/**
 * Invalidar cache forzosamente (llamar después de update desde UI).
 */
export function invalidateMetricoolCredsCache() {
  _cachedCreds = null
}

export type MetricoolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Comentario "raw" como lo devuelve Metricool. Aplastamos la estructura nested
 * (root.element + root.text + root.comments) a algo plano para upsert en BD.
 */
export type MetricoolComment = {
  id: string                  // thread id
  network: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK'
  status: 'READ' | 'PENDING' | 'UNREAD'
  threadId: string            // root.id (puede coincidir con id)
  postId: string | null       // root.element.id
  postLink: string | null     // root.element.link
  postText: string | null     // root.element.text (caption)
  postMediaUrl: string | null
  authorUsername: string      // root.owner
  commentText: string         // root.text
  createdAt: string           // root.creationDate
  hasReply: boolean           // si root.comments[] tiene reply nuestro
}

async function callMetricool<T>(
  path: string,
  init: RequestInit = {},
): Promise<MetricoolResult<T>> {
  const creds = await getCredentials()
  if (!creds) {
    return {
      ok: false,
      error: 'Metricool no configurado. Andá a /settings → Card "Integraciones" para agregar userId + token.',
    }
  }
  try {
    const url = `${METRICOOL_BASE}${path}${path.includes('?') ? '&' : '?'}userId=${creds.userId}`
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Mc-Auth': creds.token,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, error: `Metricool HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    const payload = text ? JSON.parse(text) : {}
    return { ok: true, data: payload as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown fetch error' }
  }
}

/**
 * Test connection — útil para botón "Probar conexión" en Settings.
 * Hace un GET a un endpoint simple (brands list) y devuelve si funcionó.
 */
export async function testMetricoolConnection(): Promise<MetricoolResult<{ brandsCount: number; sampleBrand: string }>> {
  const r = await callMetricool<{ data: Array<{ label?: string; name?: string }> }>(`/api/v2/brands`)
  if (!r.ok) return r
  const brands = r.data?.data ?? []
  return {
    ok: true,
    data: {
      brandsCount: brands.length,
      sampleBrand: brands[0]?.label ?? brands[0]?.name ?? '(sin label)',
    },
  }
}

/**
 * Lista comentarios pendientes en posts de la marca para una red social.
 * Mapea la estructura nested de Metricool a MetricoolComment plano.
 *
 * @param blogId — ID de la marca en Metricool (ej. 6206473 = Manrique)
 * @param network — 'instagram' | 'facebook' | 'tiktok'
 * @param onlyUnread — si true, solo los que están UNREAD/PENDING
 * @param limit — cantidad máxima a devolver (default 50)
 */
export async function listComentarios(args: {
  blogId: number
  network: 'instagram' | 'facebook' | 'tiktok'
  onlyUnread?: boolean
  limit?: number
}): Promise<MetricoolResult<MetricoolComment[]>> {
  // FIX 2026-05-27 — el endpoint correcto de Metricool es /post-comments
  // (no /comments), y usa `provider` como param (no `network`).
  // Confirmado vía services/metricool-pro-mcp/server.py que funciona OK.
  const params = new URLSearchParams({
    blogId: String(args.blogId),
    provider: args.network.toUpperCase(),
    limit: String(args.limit ?? 50),
  })
  if (args.onlyUnread) params.set('onlyUnread', 'true')

  const r = await callMetricool<{ data: MetricoolRawThread[] }>(
    `/api/v2/inbox/post-comments?${params.toString()}`,
  )
  if (!r.ok) return r

  // Metricool puede devolver `data` como array directo o nested en `.data`
  // dependiendo del endpoint. post-comments devuelve array directo.
  const raw = Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
  const rows = raw.map(mapRawToComment).filter(Boolean) as MetricoolComment[]
  return { ok: true, data: rows }
}

/**
 * Responde a un comentario en Metricool. Llama POST endpoint que internamente
 * usa la API de la red social (Instagram Graph, Facebook, etc.) para postear
 * la respuesta como reply al comentario.
 *
 * @returns { ok, messageId } — messageId es el ID del reply nuevo en Metricool.
 */
export async function responderComentario(args: {
  blogId: number
  network: 'instagram' | 'facebook' | 'tiktok'
  commentId: string
  text: string
}): Promise<MetricoolResult<{ messageId: string | null }>> {
  // FIX 2026-05-27 — Metricool API NO usa /comments/reply como sub-path.
  // Usa POST a /v2/inbox/post-comments con body { provider, objectId, text }.
  // Confirmado vía services/metricool-pro-mcp/server.py.
  const r = await callMetricool<{ id?: string; messageId?: string }>(
    `/api/v2/inbox/post-comments?blogId=${args.blogId}`,
    {
      method: 'POST',
      body: JSON.stringify({
        provider: args.network.toUpperCase(),
        objectId: args.commentId,
        text: args.text,
      }),
    },
  )
  if (!r.ok) return r
  return { ok: true, data: { messageId: r.data?.id ?? r.data?.messageId ?? null } }
}

// ============================================================
// Mapper: estructura nested de Metricool → MetricoolComment plano
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetricoolRawThread = any  // shape complejo, parseamos defensivamente

function mapRawToComment(thread: MetricoolRawThread): MetricoolComment | null {
  try {
    const root = thread?.root
    const element = root?.element
    const comments = root?.comments ?? []
    // Si ya respondimos (hay reply en comments[] con owner = self), skip o flag
    const selfId = thread?.self
    const hasReply = Array.isArray(comments) && comments.some((c: { owner?: string }) => c?.owner === selfId)

    return {
      id: thread.id,
      network: thread.provider,
      status: thread.status,
      threadId: root?.id ?? thread.id,
      postId: element?.id ?? null,
      postLink: element?.link ?? null,
      postText: element?.text ? String(element.text).slice(0, 300) : null,
      postMediaUrl: Array.isArray(element?.mediaUrls) ? element.mediaUrls[0] ?? null : null,
      authorUsername: root?.owner ?? '?',
      commentText: root?.text ?? '',
      createdAt: root?.creationDate ?? thread?.creationDate ?? new Date().toISOString(),
      hasReply,
    }
  } catch {
    return null
  }
}
