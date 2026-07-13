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

/* Envía push a TODAS las suscripciones de un miembro (por su team_member_id).
   Devuelve cuántas se enviaron OK. Usado por la prueba "Probar notificación". */
export async function enviarPushAMiembroId(teamMemberId: string | null, payload: PushPayload): Promise<number> {
  if (!teamMemberId || !ensureVapid()) return 0
  const service = createServiceClient() as Service
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('team_member_id', teamMemberId)
  return await enviarASubs(service, subs, payload)
}

/* Notifica a los CLIENTES de una marca (portal de cliente). Se usa al confirmar
   una publicación → al cliente le llega "tu video ya está publicado". */
export async function enviarPushAClientesDeMarca(marcaId: string | null, payload: PushPayload): Promise<number> {
  if (!marcaId || !ensureVapid()) return 0
  const service = createServiceClient() as Service
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('marca_id', marcaId)
  return await enviarASubs(service, subs, payload)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enviarASubs(service: Service, subs: any[] | null, payload: PushPayload): Promise<number> {
  if (!subs || subs.length === 0) return 0
  const data = JSON.stringify(payload)
  let ok = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data)
      ok++
    } catch (e: unknown) {
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) await service.from('push_subscriptions').delete().eq('id', s.id)
    }
  }))
  return ok
}
