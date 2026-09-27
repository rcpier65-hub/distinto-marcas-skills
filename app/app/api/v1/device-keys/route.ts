// GET  /api/v1/device-keys     lista metadata (sin hash ni plaintext)
// POST /api/v1/device-keys     crea { name } y devuelve el token dst_live_ una sola vez
//
// Auth: cookie de sesión de Distinto o Bearer JWT de Supabase.
// No acepta la clave de dispositivo ni CRON_SECRET.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveDeviceKeyOwner } from '@/lib/api/auth'
import { generateDeviceApiKey } from '@/lib/api/device-key-token'
import { TAREAS_READ_SCOPE, listDeviceKeys, loadOwnerTeamMember, toPublicKey } from '@/lib/api/device-keys'

export const dynamic = 'force-dynamic'

const NAME_MAX = 80

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseName(body: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body JSON inválido' }
  const raw = (body as { name?: unknown }).name
  if (typeof raw !== 'string') return { ok: false, error: 'El nombre es obligatorio' }
  const name = raw.trim()
  if (name.length < 1) return { ok: false, error: 'El nombre es obligatorio' }
  if (name.length > NAME_MAX) return { ok: false, error: `El nombre puede tener hasta ${NAME_MAX} caracteres` }
  return { ok: true, name }
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  return error.code === 'PGRST205' || error.code === '42P01' || msg.includes('api_device_keys')
}

export async function GET(request: Request) {
  const auth = await resolveDeviceKeyOwner(request)
  if ('response' in auth) return auth.response

  const listed = await listDeviceKeys(auth.userId)
  if (!listed.ok) return jsonError(listed.error, listed.status)
  return NextResponse.json({ ok: true, keys: listed.keys })
}

export async function POST(request: Request) {
  const auth = await resolveDeviceKeyOwner(request)
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Body JSON inválido', 400)
  }
  const parsed = parseName(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const member = await loadOwnerTeamMember(auth.userId)
  if (!member.ok) return jsonError(member.error, member.status)

  const generated = generateDeviceApiKey()

  let service: ReturnType<typeof createServiceClient>
  try {
    service = createServiceClient()
  } catch {
    return jsonError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from('api_device_keys')
    .insert({
      user_id: auth.userId,
      team_member_id: member.teamMemberId,
      name: parsed.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      scopes: [TAREAS_READ_SCOPE],
    })
    .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .single()

  if (error) {
    if (missingTable(error)) return jsonError('Falta la tabla api_device_keys. Aplicá la migration en Supabase.', 500)
    return jsonError(error.message, 500)
  }

  const key = toPublicKey(data)
  return NextResponse.json({
    ok: true,
    key: {
      ...key,
      token: generated.token,
    },
  })
}
