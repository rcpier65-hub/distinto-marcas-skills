import 'server-only'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

let configurado = false
function ensureVapid(): boolean {
  if (configurado) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:team@agenciadistinto.com'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  configurado = true
  return true
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string }

/* Envía una notificación push a los miembros cuyo nombre coincide con
   `nombresObjetivo` (case-insensitive) O que son director (Pedro). Reusa una
   sola query y limpia las suscripciones muertas (404/410). Nunca lanza: si algo
   falla, se loguea. */
export async function enviarPushAMiembros(nombresObjetivo: string[], payload: PushPayload): Promise<void> {
  try {
    if (!ensureVapid()) { console.warn('[push] VAPID no configurado — se omite'); return }
    const service = createServiceClient() as Service
    const { data: subs } = await service
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, nombre, miembro:team_members(nombre, rol_base)')
    if (!subs || subs.length === 0) return

    const objetivos = new Set(nombresObjetivo.map((n) => n.toLowerCase()))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const destino = (subs as any[]).filter((s) => {
      const mem = Array.isArray(s.miembro) ? s.miembro[0] : s.miembro
      const nom = (mem?.nombre ?? s.nombre ?? '').toLowerCase()
      const rol = mem?.rol_base ?? ''
      if (rol === 'director') return true
      return [...objetivos].some((n) => nom.includes(n))
    })

    const data = JSON.stringify(payload)
    await Promise.all(destino.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data)
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) {
          await service.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.error('[push] error enviando:', code, (e as { body?: string })?.body)
        }
      }
    }))
  } catch (e) {
    console.error('[push] enviarPushAMiembros falló:', e)
  }
}
