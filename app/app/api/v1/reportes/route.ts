// GET /api/v1/reportes
//
// Marcas activas que esta sesión puede ver, con el último mes de reporte
// (seed + reportes_mensuales, la base gana). Misma data que el hub de
// /reportes. No edita meses. El detalle y el formulario siguen en la web.
// Auth: Authorization: Bearer <supabase access_token>
// Exige el módulo metricas. Respeta marcas_acceso (null = todas).

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { colorDeMarca } from '@/lib/marcas/branding'
import { getReportes } from '@/lib/reportes/registry'
import { labelMes } from '@/lib/reportes/typhouse'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function kpi(value: number): number | null {
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function texto(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedeMetricas) {
    return apiJsonError('No tienes acceso a Reportes', 403)
  }

  if (member.marcasAcceso && member.marcasAcceso.length === 0) {
    return NextResponse.json({ ok: true, total: 0, con_datos: 0, marcas: [] })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let query = service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex')
    .eq('activa', true)
    .order('nombre')
  if (member.marcasAcceso) query = query.in('id', member.marcasAcceso)

  const { data, error } = await query
  if (error) return apiJsonError(error.message, 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[]
  const nombres: Record<string, string> = {}
  for (const fila of filas) {
    const slug = texto(fila.slug)
    const nombre = texto(fila.nombre)
    if (slug && nombre) nombres[slug] = nombre
  }

  const reportes = await getReportes(nombres)
  const porSlug = new Map(reportes.map((reporte) => [reporte.slug, reporte]))
  const link = `${appBase()}/reportes`

  const marcas = filas.flatMap((fila) => {
    const slug = texto(fila.slug)
    const nombre = texto(fila.nombre)
    if (!slug || !nombre) return []
    const reporte = porSlug.get(slug) ?? null
    const ultimo = reporte?.meses.at(-1) ?? null
    return [{
      slug,
      nombre,
      emoji: texto(fila.emoji_marca),
      color: colorDeMarca(slug, texto(fila.color_primario_hex)),
      tiene_datos: !!ultimo,
      meses: reporte?.meses.length ?? 0,
      ultimo_mes: ultimo?.mes ?? null,
      ultimo_mes_label: ultimo ? labelMes(ultimo.mes) : null,
      leads: ultimo ? kpi(ultimo.leads) : null,
      ventas_totales: ultimo ? kpi(ultimo.ventasTotales) : null,
      ingreso_directo: ultimo ? kpi(ultimo.ingresoDirecto) : null,
      roas_directo: ultimo ? kpi(ultimo.roasDirecto) : null,
      link,
    }]
  })

  marcas.sort((a, b) => Number(b.tiene_datos) - Number(a.tiene_datos) || a.nombre.localeCompare(b.nombre, 'es'))

  return NextResponse.json({
    ok: true,
    total: marcas.length,
    con_datos: marcas.filter((marca) => marca.tiene_datos).length,
    marcas,
  })
}
