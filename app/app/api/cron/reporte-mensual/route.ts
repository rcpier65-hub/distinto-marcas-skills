// app/app/api/cron/reporte-mensual/route.ts
//
// Rutina mensual del reporte de TypHouse / Little Joe (Pedro 02-oct-2026):
//   Día 1 (7 am Lima): trae Shopify + Facebook Ads + tipo de cambio del mes
//     anterior, deja el mes listo y le avisa al cliente que ponga sus ventas.
//   Día 2 (7 am Lima): refresca los datos y PUBLICA el reporte en su portal
//     (con lo que haya; si el cliente aún no puso sus ventas, se completa
//     solo cuando las ponga).
// Auth: Vercel cron manda Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAClientesDeMarca, enviarPushAMiembros } from '@/lib/push/send'
import { generarMesDirecto, SLUG_REPORTE_DIRECTO } from '@/lib/reportes/auto'
import { labelMes } from '@/lib/reportes/typhouse'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [y, m, d] = hoy.split('-').map(Number)
  const url = new URL(request.url)
  const dia = Number(url.searchParams.get('dia') ?? d)
  if (dia !== 1 && dia !== 2) return NextResponse.json({ ok: true, omitido: 'solo corre el 1 y el 2 de cada mes' })
  const mes = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marca } = await service.from('marcas').select('id').eq('slug', SLUG_REPORTE_DIRECTO).maybeSingle()

  try {
    const { raw, avisos } = await generarMesDirecto(SLUG_REPORTE_DIRECTO, mes, { publicar: dia === 2 })
    const nombreMes = labelMes(mes)
    if (dia === 1) {
      await enviarPushAClientesDeMarca(marca?.id ?? null, {
        title: `📊 Tu reporte de ${nombreMes} está casi listo`,
        body: 'Solo falta que pongas tus ventas totales del mes (pedidos y soles).',
        url: '/cliente?reporte=1',
        tag: `reporte-${mes}`,
      })
    } else {
      await enviarPushAClientesDeMarca(marca?.id ?? null, {
        title: `📊 Tu reporte de ${nombreMes} ya está publicado`,
        body: raw.extra?.cliente ? 'Entra a tu portal para verlo.' : 'Entra a tu portal: pon tus ventas totales y se completa solo.',
        url: '/cliente?reporte=1',
        tag: `reporte-${mes}`,
      })
    }
    if (avisos.length) {
      await enviarPushAMiembros(['pedro'], { title: `⚠️ Reporte TypHouse ${nombreMes}`, body: avisos.join(' · ').slice(0, 180), url: '/reportes', tag: `reporte-aviso-${mes}` })
    }
    return NextResponse.json({ ok: true, mes, dia, avisos })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await enviarPushAMiembros(['pedro'], { title: '❌ Falló el reporte mensual de TypHouse', body: msg.slice(0, 180), url: '/reportes', tag: `reporte-error-${mes}` })
    return NextResponse.json({ ok: false, mes, error: msg }, { status: 500 })
  }
}
