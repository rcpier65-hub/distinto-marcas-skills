import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const inputSchema = z.object({
  resource: z.enum(['decision-contenido', 'madurez-digital']),
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  empresa: z.string().trim().min(2).max(160),
  telefono: z.string().trim().max(40).optional().default(''),
  consentimiento: z.literal(true),
  website: z.string().max(0),
  payload: z.unknown(),
})

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(8000) }) },
  })
}

async function limit(key: string, max: number, seconds: number) {
  const hashed = createHash('sha256').update(`resource-lead:${key}`).digest('hex')
  const { data, error } = await db().rpc('booking_rate_limit', { p_key: hashed, p_limit: max, p_seconds: seconds })
  if (error) throw new Error('rate-limit-unavailable')
  return Boolean(data)
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
    const allowedOrigins = new Set([
      request.nextUrl.origin,
      forwardedHost ? `${forwardedProto}://${forwardedHost}` : '',
      process.env.NEXT_PUBLIC_APP_URL || '',
    ].filter(Boolean))
    if (origin && !allowedOrigins.has(origin)) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })
    const raw = await request.text()
    if (raw.length > 55_000) return NextResponse.json({ error: 'El diagnóstico es demasiado extenso.' }, { status: 413 })
    let json: unknown
    try { json = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }) }
    const parsed = inputSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Revisa tu nombre, empresa, correo y consentimiento.' }, { status: 400 })

    const payloadText = JSON.stringify(parsed.data.payload)
    if (payloadText.length > 45_000) return NextResponse.json({ error: 'El diagnóstico es demasiado extenso.' }, { status: 413 })
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (!await limit(`ip:${ip}`, 12, 3600) || !await limit(`email:${parsed.data.email}`, 6, 86400)) {
      return NextResponse.json({ error: 'Ya guardaste varios diagnósticos. Intenta nuevamente más tarde.' }, { status: 429 })
    }

    const { resource, nombre, email, empresa, telefono, payload } = parsed.data
    const { error } = await db().from('public_resource_leads').insert({ resource, nombre, email, empresa, telefono: telefono || null, result: payload })
    if (error) {
      console.error('[resource-lead]', error.code)
      return NextResponse.json({ error: 'No pudimos guardar el diagnóstico. Intenta nuevamente.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar el diagnóstico. Intenta nuevamente.' }, { status: 503 })
  }
}
