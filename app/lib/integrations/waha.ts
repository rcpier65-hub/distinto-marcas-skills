// app/lib/integrations/waha.ts
/**
 * Cliente HTTP nativo para WAHA (https://distinto-waha-littlejoe.fly.dev).
 *
 * REEMPLAZO del path App → MCP → WAHA por App → WAHA directo.
 * El MCP `distinto-mcp` se sigue usando desde Claude Desktop, pero la app
 * de Vercel ya no depende de él: con WAHA arriba, el sistema funciona
 * incluso sin la laptop de Pedro encendida.
 *
 * Env vars requeridas en Vercel:
 *   - WAHA_URL        (ej. https://distinto-waha-littlejoe.fly.dev)
 *   - WAHA_API_KEY    (X-Api-Key)
 *   - WAHA_SESSION    (default: "default")
 *
 * Endpoints WAHA utilizados:
 *   - POST /api/sendText          → texto plano + mentions opcionales
 *   - POST /api/sendImage         → imagen por URL + caption
 *   - GET  /api/{session}/groups  → listar grupos del bot
 *   - GET  /api/sessions/{session}→ estado de la sesión
 */

const WAHA_URL = process.env.WAHA_URL ?? ''
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = process.env.WAHA_SESSION ?? 'default'

export type WahaResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function ensureConfigured(): { ok: true } | { ok: false; error: string } {
  if (!WAHA_URL) return { ok: false, error: 'WAHA_URL no configurada' }
  if (!WAHA_API_KEY) return { ok: false, error: 'WAHA_API_KEY no configurada' }
  return { ok: true }
}

async function wahaFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<WahaResult<T>> {
  const cfg = ensureConfigured()
  if (!cfg.ok) return cfg
  try {
    const res = await fetch(`${WAHA_URL}${path}`, {
      ...init,
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
    const text = await res.text()
    if (!res.ok) {
      return {
        ok: false,
        error: `WAHA HTTP ${res.status}: ${text.slice(0, 300)}`,
      }
    }
    if (!text) return { ok: true, data: null as unknown as T }
    try {
      return { ok: true, data: JSON.parse(text) as T }
    } catch {
      return { ok: true, data: text as unknown as T }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch failed',
    }
  }
}

/**
 * Resuelve un destino a `chatId` (formato `...@g.us` o `...@c.us`).
 *
 * Acepta:
 *   - chatId directo (preferido — más confiable)
 *   - group_name (nombre exacto del grupo, case-insensitive, fallback a substring)
 *   - alias (legacy del wrapper MCP — se trata igual que group_name aquí porque
 *            WAHA puro no tiene aliases. Si Pedro guardó aliases en la BD de Rubi,
 *            esos no aplican acá; se debe usar chatId guardado en `marcas`.)
 *   - phone (número con o sin sufijo @c.us)
 */
async function resolveChatId(args: {
  chatId?: string
  group_name?: string
  alias?: string
  phone?: string
}): Promise<WahaResult<string>> {
  if (args.chatId) return { ok: true, data: args.chatId }
  if (args.phone) {
    const p = args.phone.includes('@') ? args.phone : `${args.phone}@c.us`
    return { ok: true, data: p }
  }
  const needle = (args.group_name || args.alias || '').trim().toLowerCase()
  if (!needle) {
    return { ok: false, error: 'destino requerido (chatId | group_name | alias | phone)' }
  }
  const groupsRes = await wahaFetch<Record<string, { id: string; subject?: string }>>(
    `/api/${WAHA_SESSION}/groups`,
  )
  if (!groupsRes.ok) return groupsRes
  const groups = Object.values(groupsRes.data)
  const exact = groups.find(g => (g.subject ?? '').toLowerCase() === needle)
  if (exact) return { ok: true, data: exact.id }
  const partial = groups.find(g => (g.subject ?? '').toLowerCase().includes(needle))
  if (partial) return { ok: true, data: partial.id }
  return { ok: false, error: `grupo '${needle}' no encontrado en WAHA` }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Send text                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/sendText
 *
 * Envía texto plano. Si `mentions` viene, los números se renderizan como
 * @clickeables (formato exigido por WhatsApp: `<numero>@c.us`).
 */
export async function wahaSendText(args: {
  chatId?: string
  group_name?: string
  alias?: string
  phone?: string
  text: string
  mentions?: string[]
}): Promise<WahaResult> {
  const r = await resolveChatId(args)
  if (!r.ok) return r
  const body: Record<string, unknown> = {
    chatId: r.data,
    text: args.text,
    session: WAHA_SESSION,
  }
  if (args.mentions && args.mentions.length > 0) {
    body.mentions = args.mentions.map(m => {
      if (m.endsWith('@c.us') || m.endsWith('@s.whatsapp.net')) return m
      // Aceptamos "51983852191" o "+51 983 852 191" — normalizamos a dígitos
      const digits = m.replace(/[^\d]/g, '')
      return `${digits}@c.us`
    })
  }
  return wahaFetch('/api/sendText', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Send image                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/sendImage
 *
 * `imageUrl` debe ser una URL pública accesible desde WAHA. Cualquier
 * mención @<numero> en el caption se renderiza como link clickeable
 * cuando el número pertenece al grupo destino.
 */
export async function wahaSendImage(args: {
  chatId?: string
  group_name?: string
  alias?: string
  phone?: string
  imageUrl: string
  caption: string
}): Promise<WahaResult> {
  const r = await resolveChatId(args)
  if (!r.ok) return r
  const body = {
    chatId: r.data,
    file: { url: args.imageUrl },
    caption: args.caption,
    session: WAHA_SESSION,
  }
  return wahaFetch('/api/sendImage', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  List groups                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

export type WahaGroup = {
  nombre: string
  chatId: string
  alias: string | null // siempre null desde WAHA puro
  miembros: number | null
}

export async function wahaListGroups(): Promise<
  { ok: true; groups: WahaGroup[] } | { ok: false; error: string }
> {
  const res = await wahaFetch<
    Record<string, { id: string; subject?: string; size?: number }>
  >(`/api/${WAHA_SESSION}/groups`)
  if (!res.ok) return { ok: false, error: res.error }
  const groups: WahaGroup[] = Object.values(res.data).map(g => ({
    nombre: g.subject ?? '',
    chatId: g.id,
    alias: null,
    miembros: typeof g.size === 'number' ? g.size : null,
  }))
  return { ok: true, groups }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Session status (diagnóstico)                                             */
/* ──────────────────────────────────────────────────────────────────────── */

export type WahaSessionStatus = {
  name: string
  status: 'WORKING' | 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | string
  me?: { id: string; pushName?: string } | null
}

export async function wahaGetSessionStatus(): Promise<WahaResult<WahaSessionStatus>> {
  return wahaFetch<WahaSessionStatus>(`/api/sessions/${WAHA_SESSION}`)
}
