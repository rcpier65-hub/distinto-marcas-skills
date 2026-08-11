// app/app/api/debug/push-check/route.ts
//
// Diagnóstico de notificaciones push. Protegido con CRON_SECRET.
//   GET /api/debug/push-check?secret=XXX        → estado de la config VAPID
//   GET /api/debug/push-check?secret=XXX&send=1 → además, ENVÍA un push de
//        prueba a Pedro/Erick y devuelve el código de respuesta del servicio
//        push (201/200 = enviado OK; 403 = llaves no coinciden; 400 = mal JWT).

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  const qs = req.nextUrl.searchParams.get('secret') || ''
  if (!secret || (auth !== `Bearer ${secret}` && qs !== secret)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  const pub = process.env.VAPID_PUBLIC_KEY || ''
  const priv = process.env.VAPID_PRIVATE_KEY || ''
  const pubCli = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:team@agenciadistinto.com'

  const diag = {
    keysPresent: { serverPublic: !!pub, serverPrivate: !!priv, clientPublic: !!pubCli },
    /* Si la pública del SERVIDOR no es idéntica a la del CLIENTE, TODO push se
       rechaza con 403 y nunca llega. Este es el sospechoso #1. */
    publicKeysMatch: pub && pubCli ? pub === pubCli : null,
    serverPublicPrefix: pub.slice(0, 12),
    clientPublicPrefix: pubCli.slice(0, 12),
    subject,
    subjectValid: /^(mailto:|https:\/\/)/.test(subject),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = { diag }

  if (req.nextUrl.searchParams.get('send') === '1' && pub && priv) {
    try { webpush.setVapidDetails(subject, pub, priv) } catch (e) { result.vapidSetupError = String((e as Error)?.message ?? e) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data: subs } = await service
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, miembro:team_members(nombre, rol_base)')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directores = ((subs ?? []) as any[]).filter((s) => {
      const m = Array.isArray(s.miembro) ? s.miembro[0] : s.miembro
      return m?.rol_base === 'director'
    })
    result.sends = []
    for (const s of directores) {
      const m = Array.isArray(s.miembro) ? s.miembro[0] : s.miembro
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: '🔔 Prueba de notificación', body: 'Si ves esto, las notificaciones funcionan ✅', url: '/soporte', tag: 'push-test' }),
        )
        result.sends.push({ miembro: m?.nombre, status: r.statusCode })
      } catch (e: unknown) {
        result.sends.push({
          miembro: m?.nombre,
          error: (e as { statusCode?: number })?.statusCode ?? (e as Error)?.message,
          body: String((e as { body?: string })?.body ?? '').slice(0, 140),
        })
      }
    }
  }

  return NextResponse.json(result)
}
