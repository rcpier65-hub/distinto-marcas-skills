// app/lib/integrations/rubi.ts
/**
 * Cliente HTTP para Rubi MCP (JSON-RPC 2.0 + MCP session protocol).
 *
 * El MCP de Rubi (`https://distinto-mcp.fly.dev/mcp/<token>`) requiere session init:
 *   1. POST initialize → recibe Mcp-Session-Id en headers
 *   2. POST notifications/initialized (notification, sin id)
 *   3. POST tools/call con Mcp-Session-Id header → ejecuta tool
 *
 * Cada llamada de alto nivel hace el handshake completo (sin reutilizar sessions
 * entre invocaciones de cron porque cada request serverless es nuevo).
 */

const RUBI_URL =
  'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

export type RubiToolCallResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

function parseSSEorJSON(text: string): unknown {
  const dataLine = text.split('\n').find((l) => l.startsWith('data: '))
  if (dataLine) {
    return JSON.parse(dataLine.slice(6))
  }
  return JSON.parse(text)
}

type RubiFetchResult = {
  response: Response
  payload: { error?: { message?: string }; result?: unknown } | null
}

async function rubiFetch(
  body: object,
  sessionId: string | null
): Promise<RubiFetchResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const response = await fetch(RUBI_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (response.status === 202) {
    return { response, payload: null }
  }
  const text = await response.text()
  if (!text) return { response, payload: null }
  let payload: RubiFetchResult['payload'] = null
  try {
    payload = parseSSEorJSON(text) as RubiFetchResult['payload']
  } catch {
    payload = null
  }
  return { response, payload }
}

async function callRubiTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<RubiToolCallResult> {
  try {
    // 1. Initialize
    const initRes = await rubiFetch(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'distinto-app', version: '1.0.0' },
        },
      },
      null
    )
    if (!initRes.response.ok) {
      return { ok: false, error: `Init failed: HTTP ${initRes.response.status}` }
    }
    const sessionId =
      initRes.response.headers.get('mcp-session-id') ??
      initRes.response.headers.get('Mcp-Session-Id')
    if (!sessionId) {
      return { ok: false, error: 'No Mcp-Session-Id returned by server' }
    }

    // 2. Send initialized notification (no id, no response expected)
    await rubiFetch(
      { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
      sessionId
    )

    // 3. Call the tool
    const toolRes = await rubiFetch(
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      },
      sessionId
    )

    if (!toolRes.response.ok) {
      return {
        ok: false,
        error: `Tool call failed: HTTP ${toolRes.response.status}`,
      }
    }

    if (toolRes.payload?.error) {
      return { ok: false, error: toolRes.payload.error.message ?? 'Unknown JSON-RPC error' }
    }

    return { ok: true, data: toolRes.payload?.result ?? null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Envía un mensaje de texto a un número WhatsApp individual.
 */
export async function sendWhatsAppToPhone(
  phone: string,
  text: string
): Promise<RubiToolCallResult> {
  return callRubiTool('whatsapp_send_to_phone', { phone, text })
}

/**
 * Envía un mensaje a un grupo WhatsApp por alias o nombre.
 */
export async function sendWhatsAppToGroup(
  groupName: string,
  text: string,
  byAlias = false
): Promise<RubiToolCallResult> {
  const args = byAlias ? { alias: groupName, text } : { group_name: groupName, text }
  return callRubiTool('whatsapp_send_message', args)
}

/**
 * Envía una IMAGEN a un grupo WhatsApp por alias o nombre, con caption opcional.
 * imageUrl debe ser una URL pública accesible (Supabase Storage signed URL funciona).
 *
 * NOTA: Rubi acepta alias/group_name como conveniencia (wrapper que resuelve a chatId).
 * Para máxima confiabilidad (especialmente con grupos sin alias o nombres con espacios
 * problemáticos), preferir sendWhatsAppImageToChatId.
 */
export async function sendWhatsAppImageToGroup(
  groupName: string,
  imageUrl: string,
  caption: string,
  byAlias = false
): Promise<RubiToolCallResult> {
  const base = byAlias ? { alias: groupName } : { group_name: groupName }
  return callRubiTool('whatsapp_send_image', {
    ...base,
    media: { url: imageUrl },
    caption,
  })
}

/**
 * Envía una IMAGEN a un chat WhatsApp por chatId directo (`123…@g.us`).
 *
 * Versión bullet-proof: no depende de aliases ni de resolución por nombre.
 * Si el caption contiene `@<numero>`, WhatsApp lo renderiza automáticamente
 * como mention clickeable cuando el número pertenece al grupo destino.
 */
export async function sendWhatsAppImageToChatId(
  chatId: string,
  imageUrl: string,
  caption: string,
): Promise<RubiToolCallResult> {
  return callRubiTool('whatsapp_send_image', {
    chatId,
    media: { url: imageUrl },
    caption,
  })
}

/**
 * Envía mensaje de texto a un grupo mencionando uno o varios números.
 * Usar para fallback cuando la mención en caption de imagen no se renderiza
 * como clickeable.
 */
export async function sendWhatsAppWithMentions(
  args: { chatId?: string; alias?: string; group_name?: string; text: string; mentions: string[] }
): Promise<RubiToolCallResult> {
  return callRubiTool('whatsapp_send_with_mentions', args)
}

/**
 * Lista los grupos WhatsApp disponibles donde Rubi está agregado.
 * Devuelve nombre, chatId, alias (si existe) y miembros.
 *
 * El MCP responde con texto plano formateado (lista markdown-like),
 * así que parseamos defensivamente. Si cambia el formato del servidor,
 * el caller debe manejar el caso.
 */
export type WhatsAppGroup = {
  nombre: string         // ej. "Marketing Manrique ABA"
  chatId: string         // ej. "120363339856209687@g.us"
  alias: string | null   // ej. "little-joe" o null si no tiene
  miembros: number | null
}

export async function listWhatsAppGroups(): Promise<
  { ok: true; groups: WhatsAppGroup[] } | { ok: false; error: string }
> {
  const result = await callRubiTool('whatsapp_list_groups', {})
  if (!result.ok) return { ok: false, error: result.error }

  // El MCP responde con MCP content blocks. Extraemos el text content.
  // Estructura: result.data.content[0].text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any
  const text: string =
    (Array.isArray(data?.content) && data.content[0]?.text) ||
    (typeof data === 'string' ? data : '') ||
    ''
  if (!text) return { ok: false, error: 'Rubi devolvió respuesta vacía' }

  // Parseamos lineas tipo:
  //   "- New team [alias: little-joe] — 7 miembros — chatId: 120363427129444398@g.us"
  //   "- Marketing Manrique ABA  [sin alias] — 7 miembros — chatId: 120363339856209687@g.us"
  const groups: WhatsAppGroup[] = []
  const lineRegex =
    /^\s*-\s+(.+?)\s+\[(?:alias:\s*([^\]]+?)|sin alias)\]\s+—\s+(\d+)\s+miembros\s+—\s+chatId:\s+([\w.@-]+)/
  for (const line of text.split('\n')) {
    const m = line.match(lineRegex)
    if (m) {
      groups.push({
        nombre: m[1].trim(),
        alias: m[2]?.trim() ?? null,
        miembros: parseInt(m[3], 10) || null,
        chatId: m[4].trim(),
      })
    }
  }
  return { ok: true, groups }
}
