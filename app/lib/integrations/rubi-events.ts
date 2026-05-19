// app/lib/integrations/rubi-events.ts
// Cliente para leer eventos recientes de Rubi y parsear comandos.

const RUBI_URL =
  'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

export type RubiEvent = {
  id?: string
  from?: string
  body?: string
  timestamp?: number
  type?: string
}

async function rubiHandshakeAndCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // 1. Init
  const initRes = await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'distinto-app', version: '1.0.0' },
      },
    }),
  })
  if (!initRes.ok) throw new Error(`Init failed: ${initRes.status}`)
  const sessionId =
    initRes.headers.get('mcp-session-id') ??
    initRes.headers.get('Mcp-Session-Id')
  if (!sessionId) throw new Error('No session ID')

  // 2. Notify initialized
  await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }),
  })

  // 3. Call tool
  const toolRes = await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  })

  if (!toolRes.ok) throw new Error(`Tool call failed: ${toolRes.status}`)
  const text = await toolRes.text()
  const dataLine = text.split('\n').find((l) => l.startsWith('data: '))
  if (!dataLine) return null

  const parsed = JSON.parse(dataLine.slice(6))
  if (parsed.error) throw new Error(parsed.error.message ?? 'JSON-RPC error')
  return parsed.result
}

export async function getRecentEvents(limit = 20): Promise<RubiEvent[]> {
  const result = (await rubiHandshakeAndCall('whatsapp_get_recent_events', {
    event_type: 'message',
    limit,
  })) as { content?: Array<{ text?: string }> } | null

  const content = result?.content?.[0]?.text ?? '[]'
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.events)) {
      return parsed.events
    }
    return []
  } catch {
    return []
  }
}

const COMMAND_RE =
  /^(ok|si|sí|✅|aprobado|aprobar|no|❌|cancelar|rechazar|redo|rehacer|regenerar)\s+([a-z0-9-]+)/i

export type ParsedCommand =
  | { action: 'aprobar' | 'cancelar' | 'regenerar'; marca_slug: string }
  | null

export function parseCommand(body: string): ParsedCommand {
  const cleaned = body.trim().toLowerCase()
  const match = cleaned.match(COMMAND_RE)
  if (!match) return null
  const [, verb, slug] = match
  let action: 'aprobar' | 'cancelar' | 'regenerar'
  if (['ok', 'si', 'sí', '✅', 'aprobado', 'aprobar'].includes(verb)) action = 'aprobar'
  else if (['no', '❌', 'cancelar', 'rechazar'].includes(verb)) action = 'cancelar'
  else action = 'regenerar'
  return { action, marca_slug: slug }
}
