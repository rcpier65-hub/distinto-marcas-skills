// app/app/inicio/_reporte-semana-actions.ts
'use server'

/* Reporte SEMANAL agrupado por día: "Lunes X hizo A, B; Martes C…". Reusa el
   cargador del reporte del día (loadReporteDelDia) pidiéndolo para cada día de
   la semana (lunes → hoy). Devuelve la lista por día + un texto listo para
   WhatsApp. Erick lo pidió para mandar su semana de una. Pedro 26-ago-2026. */

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { loadReporteDelDia, type ReporteDelDiaData } from '@/lib/inicio/load-reporte-del-dia'
import { ymdLima } from '@/lib/fechas/hoy'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type DiaReporte = {
  fechaIso: string
  fechaLabel: string   // "lunes 24 de agosto"
  items: string[]
  vacio: boolean
}
export type ReporteSemana =
  | { ok: true; usuarioNombre: string; rangoLabel: string; dias: DiaReporte[]; texto: string }
  | { ok: false; error: string }

function cap(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function labelCorto(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00-05:00`).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })
  } catch { return iso }
}
/* Lunes de la semana de `hoyIso` (YYYY-MM-DD). */
function lunesDeLaSemana(hoyIso: string): string {
  const [y, m, d] = hoyIso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  const diff = (dt.getUTCDay() + 6) % 7 // días desde el lunes (dom=6)
  dt.setUTCDate(dt.getUTCDate() - diff)
  return dt.toISOString().slice(0, 10)
}
function rangoDias(desde: string, hasta: string): string[] {
  const out: string[] = []
  const [y, m, d] = desde.split('-').map(Number)
  const cur = new Date(Date.UTC(y, m - 1, d, 12))
  const [hy, hm, hd] = hasta.split('-').map(Number)
  const fin = new Date(Date.UTC(hy, hm - 1, hd, 12)).getTime()
  while (cur.getTime() <= fin) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1) }
  return out
}

/* Convierte el reporte de UN día en líneas de "lo que hizo". */
function itemsDelDia(d: ReporteDelDiaData): string[] {
  const items: string[] = []
  for (const t of d.tareasCompletadas) {
    const emoji = t.marcaEmoji ?? '•'
    items.push(`${emoji} ${t.titulo}${t.marca ? ` _(${t.marca})_` : ''}`)
  }
  if (d.pubsEditadasCount > 0) items.push(`✂️ ${d.pubsEditadasCount} pub${d.pubsEditadasCount === 1 ? '' : 's'} editada${d.pubsEditadasCount === 1 ? '' : 's'}`)
  if (d.grabacionesHechasCount > 0) items.push(`🎥 ${d.grabacionesHechasCount} grabación${d.grabacionesHechasCount === 1 ? '' : 'es'}`)
  if (d.habitosCumplidos.length > 0) items.push(`🌱 ${d.habitosCumplidos.length} hábito${d.habitosCumplidos.length === 1 ? '' : 's'} cumplido${d.habitosCumplidos.length === 1 ? '' : 's'}`)
  return items
}

export async function generarReporteSemana(desde?: string, hasta?: string): Promise<ReporteSemana> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const { data: tm } = await service
    .from('team_members')
    .select('id, nombre, rol_base, avatar_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const nombreCompleto = (tm?.nombre ?? 'Yo') as string
  const primerNombre = nombreCompleto.trim().split(/\s+/)[0] || nombreCompleto
  const esOwner = !tm || primerNombre.toLowerCase() === 'pedro'

  const hoy = ymdLima(new Date())
  const rangoDesde = (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) ? desde : lunesDeLaSemana(hoy)
  const rangoHasta = (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) ? hasta : hoy
  const fechas = rangoDias(rangoDesde, rangoHasta).slice(-14) // tope 14 días

  const reportes = await Promise.all(
    fechas.map((f) =>
      loadReporteDelDia(service, {
        teamMemberId: tm?.id ?? null,
        usuarioNombre: primerNombre,
        usuarioNombreCompleto: nombreCompleto,
        usuarioAvatarUrl: (tm?.avatar_url ?? null) as string | null,
        usuarioRol: '',
        esCEO: esOwner,
        rolBase: (tm?.rol_base ?? undefined) as string | undefined,
        fechaObjetivo: f,
      }).catch(() => null),
    ),
  )

  const dias: DiaReporte[] = reportes.map((r, i) => {
    if (!r) return { fechaIso: fechas[i], fechaLabel: fechas[i], items: [], vacio: true }
    const items = itemsDelDia(r)
    return { fechaIso: r.fechaIso, fechaLabel: r.fechaLabel, items, vacio: items.length === 0 }
  })

  const rangoLabel = `${labelCorto(rangoDesde)} – ${labelCorto(rangoHasta)}`
  const lineas: string[] = []
  lineas.push(`📊 *Reporte de la semana — ${primerNombre}*`)
  lineas.push(`🗓️ ${rangoLabel}`)
  lineas.push('')
  for (const d of dias) {
    if (d.vacio) continue
    lineas.push(`📅 *${cap(d.fechaLabel)}*`)
    for (const it of d.items) lineas.push(it)
    lineas.push('')
  }
  if (dias.every((d) => d.vacio)) lineas.push('_Sin actividad registrada en el rango._')
  lineas.push('— _vía Distinto_')

  return { ok: true, usuarioNombre: primerNombre, rangoLabel, dias, texto: lineas.join('\n') }
}
