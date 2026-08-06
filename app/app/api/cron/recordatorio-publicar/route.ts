// app/app/api/cron/recordatorio-publicar/route.ts
//
// Recordatorio de PUBLICAR al cliente: a las 5pm (hora Lima) revisa si las marcas
// que publican ellas mismas (Retoz y Praktico) tienen algún video programado para
// HOY que todavía no marcaron como publicado, y les manda un push al portal:
// "no te olvides de publicar tu video". Pedro 27-jul-2026.
//
// Vercel cron corre en UTC: 5pm Lima (UTC-5, sin horario de verano) = 22:00 UTC.
// Auth: Vercel cron manda Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Marcas que publican ellas mismas (el cliente sube el video, no la agencia).
// Se agregan por nombre/slug; si mañana hay más, se suman acá.
const MARCAS_AUTOPUBLICAN = ['retoz', 'praktico']

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // HOY en zona Lima (no UTC) — si no, después de las 7pm el día "se corre".
  const hoyLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

  // Ubicamos las marcas objetivo por slug o nombre (case-insensitive).
  const { data: marcasData } = await service.from('marcas').select('id, nombre, slug')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasData ?? []) as any[]).filter((m) => {
    const slug = (m.slug ?? '').toLowerCase()
    const nom = (m.nombre ?? '').toLowerCase()
    return MARCAS_AUTOPUBLICAN.includes(slug) || MARCAS_AUTOPUBLICAN.includes(nom)
  })

  const resultado: Array<{ marca: string; pendientes: number; enviados: number }> = []

  for (const m of marcas) {
    // Videos de ESTA marca programados para hoy que aún NO se publicaron.
    // "No publicado" se detecta por publicado_at (señal robusta, igual que en la
    // app); la fecha programada vive en fecha_publicacion (YYYY-MM-DD).
    const { data: pubs } = await service
      .from('publicaciones')
      .select('id, nombre')
      .eq('marca_id', m.id)
      .eq('fecha_publicacion', hoyLima)
      .is('publicado_at', null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendientes = (pubs ?? []) as any[]
    if (pendientes.length === 0) continue

    const body = pendientes.length === 1
      ? `Tienes "${pendientes[0].nombre ?? 'tu video'}" programado para hoy y aún no lo publicas. ¡No lo dejes pendiente! 🎬`
      : `Tienes ${pendientes.length} videos programados para hoy que todavía no publicas. ¡No los dejes pendientes! 🎬`

    const enviados = await enviarPushAClientesDeMarca(m.id, {
      title: '📲 No olvides publicar tu video',
      body,
      url: '/cliente',
      tag: `recordatorio-publicar-${hoyLima}`,
    })
    resultado.push({ marca: m.nombre ?? m.slug ?? m.id, pendientes: pendientes.length, enviados })
  }

  return NextResponse.json({ ok: true, hoy: hoyLima, marcas: marcas.length, resultado })
}
