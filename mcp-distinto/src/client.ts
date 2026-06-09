// mcp-distinto/src/client.ts
//
// Helper fetch que apunta a la API REST de Distinto con Bearer auth.
// Todas las tools delegan en esto para no duplicar lógica de URL y
// errores.

const BASE_URL = process.env.DISTINTO_BASE_URL ?? 'https://distinto-app.vercel.app'
const API_TOKEN = process.env.DISTINTO_API_TOKEN ?? ''

if (!API_TOKEN) {
  /* No tirar al cargar — el server MCP se levanta igual y devuelve
     error en cada tool call. Esto es mejor UX que crashear stdio. */
  process.stderr.write(
    '[distinto-mcp] WARN: DISTINTO_API_TOKEN no configurado. ' +
    'Las tools fallarán con 401 hasta que lo configures.\n',
  )
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function apiGet<T = unknown>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<ApiResult<T>> {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, BASE_URL)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status} en ${path}: ${body.slice(0, 300)}` }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Network/timeout en ${path}: ${msg}` }
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, BASE_URL)
  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status} en POST ${path}: ${errText.slice(0, 300)}` }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Network/timeout en POST ${path}: ${msg}` }
  }
}

/* Helper para devolver el resultado al MCP como tool response.
   El MCP SDK espera content array de { type: 'text', text } */
export function asToolResult(result: ApiResult<unknown> | unknown): {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
} {
  if (typeof result === 'object' && result !== null && 'ok' in result) {
    const r = result as ApiResult<unknown>
    if (!r.ok) {
      return {
        content: [{ type: 'text', text: `❌ ${r.error}` }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(r.data, null, 2) }],
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  }
}
