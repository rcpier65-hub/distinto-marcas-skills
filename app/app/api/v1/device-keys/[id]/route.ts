// DELETE /api/v1/device-keys/:id
// Revoca la clave del usuario logueado (setea revoked_at). No borra la fila.
//
// PATCH /api/v1/device-keys/:id
//   { "scopes": ["owner"] }        amplía una clave tareas:read sin rotar el token
//   { "scopes": ["tareas:read"] }  vuelve a solo tareas
// Solo el dueño (sesión o JWT). owner exige director, admin, o usuario sin team_member.
//
// Auth: cookie de sesión de Distinto o Bearer JWT de Supabase.
// No acepta la clave de dispositivo ni CRON_SECRET.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveDeviceKeyOwner } from '@/lib/api/auth'
import { OWNER_SCOPE, loadKeyIssuer, parseReplacementScopes, toPublicKey } from '@/lib/api/device-keys'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  return error.code === 'PGRST205' || error.code === '42P01' || msg.includes('api_device_keys')
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveDeviceKeyOwner(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError('id no es un uuid', 400)

  let service: ReturnType<typeof createServiceClient>
  try {
    service = createServiceClient()
  } catch {
    return jsonError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = service as any
  const { data, error } = await svc
    .from('api_device_keys')
    .select('id, user_id, revoked_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    if (missingTable(error)) return jsonError('Falta la tabla api_device_keys. Aplicá la migration en Supabase.', 500)
    return jsonError(error.message, 500)
  }
  if (!data || data.user_id !== auth.userId) return jsonError('Clave no encontrada', 404)
  if (data.revoked_at) return NextResponse.json({ ok: true, id, revoked: true })

  const { error: updateError } = await svc
    .from('api_device_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.userId)
    .is('revoked_at', null)

  if (updateError) return jsonError(updateError.message, 500)
  return NextResponse.json({ ok: true, id, revoked: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveDeviceKeyOwner(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError('id no es un uuid', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Body JSON inválido', 400)
  }
  const scopesRaw = body && typeof body === 'object' ? (body as { scopes?: unknown }).scopes : undefined
  const parsed = parseReplacementScopes(scopesRaw)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  if (parsed.scopes[0] === OWNER_SCOPE) {
    const issuer = await loadKeyIssuer(auth.userId)
    if (!issuer.ok) return jsonError(issuer.error, issuer.status)
    if (!issuer.issuer.canIssueOwner) {
      return jsonError('Solo un director u owner puede ampliar la clave a owner', 403)
    }
  }

  let service: ReturnType<typeof createServiceClient>
  try {
    service = createServiceClient()
  } catch {
    return jsonError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = service as any
  const { data, error } = await svc
    .from('api_device_keys')
    .select('id, user_id, revoked_at, name, key_prefix, scopes, created_at, last_used_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    if (missingTable(error)) return jsonError('Falta la tabla api_device_keys. Aplicá la migration en Supabase.', 500)
    return jsonError(error.message, 500)
  }
  if (!data || data.user_id !== auth.userId) return jsonError('Clave no encontrada', 404)
  if (data.revoked_at) return jsonError('La clave está revocada. Creá una nueva.', 409)

  const { data: updated, error: updateError } = await svc
    .from('api_device_keys')
    .update({ scopes: parsed.scopes })
    .eq('id', id)
    .eq('user_id', auth.userId)
    .is('revoked_at', null)
    .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .single()

  if (updateError) return jsonError(updateError.message, 500)
  return NextResponse.json({ ok: true, key: toPublicKey(updated) })
}
