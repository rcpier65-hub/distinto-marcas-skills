'use server'

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAMiembroId } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

/* Prueba real: manda un push al propio dispositivo del usuario actual para
   confirmar que las notificaciones del sistema funcionan. */
export async function probarPush(): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const { data: me } = await service.from('team_members').select('id').eq('auth_user_id', user.id).maybeSingle()
  const n = await enviarPushAMiembroId(me?.id ?? null, {
    title: '🔔 Notificación de prueba',
    body: 'Así te avisaremos cuando se publique algo.',
    url: '/publicaciones/publicar-hoy',
    tag: 'prueba',
  })
  if (n === 0) return { ok: false, error: 'No hay una suscripción activa en este dispositivo. Activa las notificaciones primero.' }
  return { ok: true }
}

/* Guarda (o actualiza) la suscripción push de este navegador para el usuario
   actual. Upsert por endpoint (una suscripción por navegador). */
export async function guardarSubscripcionPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  userAgent?: string,
): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const { data: me } = await service.from('team_members').select('id, nombre').eq('auth_user_id', user.id).maybeSingle()
  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) return { ok: false, error: 'Suscripción inválida' }
  const { error } = await service.from('push_subscriptions').upsert(
    {
      team_member_id: me?.id ?? null,
      nombre: me?.nombre ?? null,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function eliminarSubscripcionPush(endpoint: string): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const { error } = await service.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
