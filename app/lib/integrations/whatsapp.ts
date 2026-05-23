// app/lib/integrations/whatsapp.ts
//
// Cliente HTTP del SERVICE INTERNO `services/whatsapp` (Koyeb).
// Reemplaza la dependencia del MCP externo `lib/integrations/rubi.ts`.
//
// Diseño: misma interfaz pública que rubi.ts (sendWhatsAppImageToChatId,
// listWhatsAppGroups, etc.) para que el switch sea drop-in cuando
// el feature flag WHATSAPP_USE_INTERNAL=true.
//
// Auth: header X-Secret con shared secret (env WHATSAPP_SHARED_SECRET).

const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL ?? ''
const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET ?? ''

export type WhatsAppServiceResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

async function callService(
  path: string,
  init: RequestInit = {},
): Promise<WhatsAppServiceResult> {
  if (!SERVICE_URL) return { ok: false, error: 'WHATSAPP_SERVICE_URL no configurado' }
  if (!SHARED_SECRET) return { ok: false, error: 'WHATSAPP_SHARED_SECRET no configurado' }

  try {
    const res = await fetch(`${SERVICE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': SHARED_SECRET,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    })

    const text = await res.text()
    let payload: { ok?: boolean; error?: string; [k: string]: unknown } = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      return { ok: false, error: `respuesta inválida (no JSON): ${text.slice(0, 200)}` }
    }

    if (!res.ok || payload.ok === false) {
      return { ok: false, error: payload.error ?? `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    return { ok: true, data: payload }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown fetch error' }
  }
}

// ============================================================
// API pública — paridad con rubi.ts (drop-in replacement)
// ============================================================

/**
 * Status del bot — útil para pre-flight check antes de gastar Chromium + upload.
 */
export type WhatsAppServiceStatus =
  | 'connecting'
  | 'qr'
  | 'connected'
  | 'disconnected'
  | 'stopped'

export async function getWhatsAppServiceStatus(): Promise<
  { ok: true; status: WhatsAppServiceStatus; connectedAt: string | null; myJid: string | null; hasQr: boolean }
  | { ok: false; error: string }
> {
  const r = await callService('/status')
  if (!r.ok) return r
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = r.data as any
  return {
    ok: true,
    status: d.status,
    connectedAt: d.connectedAt ?? null,
    myJid: d.myJid ?? null,
    hasQr: !!d.hasQr,
  }
}

/**
 * Lista grupos disponibles. Devuelve el mismo shape que listWhatsAppGroups
 * de rubi.ts (WhatsAppGroup[]) para que la UI Settings no cambie.
 */
export type WhatsAppGroup = {
  nombre: string
  chatId: string
  alias: string | null
  miembros: number | null
}

export async function listWhatsAppGroupsInternal(): Promise<
  { ok: true; groups: WhatsAppGroup[] } | { ok: false; error: string }
> {
  const r = await callService('/groups')
  if (!r.ok) return r
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = r.data as any
  const groups: WhatsAppGroup[] = (d.groups ?? []).map((g: { chatId: string; nombre: string; miembros: number }) => ({
    chatId: g.chatId,
    nombre: g.nombre,
    alias: null,  // Baileys propio no tiene aliases (eran un concepto de Rubi MCP)
    miembros: g.miembros,
  }))
  return { ok: true, groups }
}

/**
 * Envía imagen a un chatId con caption + mentions opcionales.
 * mentions: array de números sin '@', ej. ['51983852191', '51902414745'].
 */
export async function sendWhatsAppImageInternal(args: {
  chatId: string
  imageUrl: string
  caption?: string
  mentions?: string[]
}): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }> {
  const r = await callService('/send/image', {
    method: 'POST',
    body: JSON.stringify(args),
  })
  if (!r.ok) return r
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = r.data as any
  return { ok: true, messageId: d.messageId ?? null }
}

/**
 * Envía texto a un chatId con mentions opcionales.
 */
export async function sendWhatsAppTextInternal(args: {
  chatId: string
  text: string
  mentions?: string[]
}): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }> {
  const r = await callService('/send/text', {
    method: 'POST',
    body: JSON.stringify(args),
  })
  if (!r.ok) return r
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = r.data as any
  return { ok: true, messageId: d.messageId ?? null }
}
