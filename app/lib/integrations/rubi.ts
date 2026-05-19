// app/lib/integrations/rubi.ts
/**
 * Cliente HTTP para Rubi MCP (JSON-RPC 2.0).
 * Endpoint: https://distinto-mcp.fly.dev/mcp/<token>
 *
 * El MCP de Rubi es un servidor JSON-RPC accesible via HTTP/SSE.
 * Para llamar una tool: POST con body { jsonrpc, method: 'tools/call', params: { name, arguments } }
 */

const RUBI_URL = 'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

type RubiToolCallResult = {
  ok: true
  data: unknown
} | {
  ok: false
  error: string
}

let requestId = 0

async function callRubiTool(toolName: string, args: Record<string, unknown>): Promise<RubiToolCallResult> {
  requestId++
  const body = {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  }

  try {
    const response = await fetch(RUBI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2024-11-05',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${await response.text()}` }
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      // SSE response: parsear el primer chunk "data: {...}"
      const text = await response.text()
      const dataLine = text.split('\n').find(l => l.startsWith('data: '))
      if (!dataLine) {
        return { ok: false, error: 'No data line in SSE response' }
      }
      const parsed = JSON.parse(dataLine.slice(6))
      if (parsed.error) {
        return { ok: false, error: parsed.error.message ?? 'Unknown JSON-RPC error' }
      }
      return { ok: true, data: parsed.result }
    } else {
      // JSON response normal
      const parsed = await response.json()
      if (parsed.error) {
        return { ok: false, error: parsed.error.message ?? 'Unknown JSON-RPC error' }
      }
      return { ok: true, data: parsed.result }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Envía un mensaje de texto a un número WhatsApp individual.
 */
export async function sendWhatsAppToPhone(phone: string, text: string): Promise<RubiToolCallResult> {
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
