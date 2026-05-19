// Test rápido: enviar un WhatsApp a Pedro via Rubi HTTP MCP con session init
const RUBI_URL = 'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

let id = 0
let sessionId = null

async function callRubi(method, params = {}, isNotification = false) {
  id++
  const body = isNotification
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id, method, params }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const response = await fetch(RUBI_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  // Capture session ID from response headers (first time only)
  const newSession = response.headers.get('mcp-session-id') || response.headers.get('Mcp-Session-Id')
  if (newSession && !sessionId) {
    sessionId = newSession
    console.log(`  ✅ Session captured: ${sessionId}`)
  }

  console.log(`[${method}] Status: ${response.status} · CT: ${response.headers.get('content-type')}`)

  if (response.status === 202) {
    console.log('  (no content — notification accepted)')
    return null
  }

  const text = await response.text()
  const dataLine = text.split('\n').find(l => l.startsWith('data: '))
  if (dataLine) {
    const parsed = JSON.parse(dataLine.slice(6))
    console.log('  Result:', JSON.stringify(parsed).slice(0, 300))
    return parsed
  }
  // try JSON directly
  try {
    const parsed = JSON.parse(text)
    console.log('  Result:', JSON.stringify(parsed).slice(0, 300))
    return parsed
  } catch {
    console.log('  Body:', text.slice(0, 300))
  }
}

console.log('=== Test 1: initialize ===')
await callRubi('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'distinto-app-test', version: '1.0.0' },
})

console.log('\n=== Test 2: notifications/initialized ===')
await callRubi('notifications/initialized', {}, true)

console.log('\n=== Test 3: send_to_phone ===')
await callRubi('tools/call', {
  name: 'whatsapp_send_to_phone',
  arguments: {
    phone: '51983852191',
    text: '🧪 Plan 3 Task 3 — Rubi HTTP MCP funciona desde Node directo. Si recibís esto, el cliente HTTP está OK. Próximo: cron Vercel cada 5 min.',
  },
})
