// DELETE /api/v1/device-keys/:id
// Revoca la clave del usuario logueado (setea revoked_at). No borra la fila.
//
// Auth: cookie de sesión de Distinto o Bearer JWT de Supabase.
// No acepta la clave de dispositivo ni CRON_SECRET.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveDeviceKeyOwner } from '@/lib/api/auth'

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
