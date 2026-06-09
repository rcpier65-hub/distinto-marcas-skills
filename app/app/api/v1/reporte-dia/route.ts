// app/app/api/v1/reporte-dia/route.ts
//
// GET /api/v1/reporte-dia
//
// Genera el reporte del día del admin/owner (Pedro). Útil para que
// Claude lo recupere y se lo recite al usuario.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TZ = 'America/Lima'

function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function fechaBonita(): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
}

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = todayStr()

  /* Pendientes completados hoy (del admin) */
  const { data: pendientesData } = await service
    .from('pendientes_rapidos')
    .select('titulo, categoria')
    .is('team_member_id', null)
    .eq('completado', true)
    .gte('completado_at', `${hoy}T00:00:00`)
    .lte('completado_at', `${hoy}T23:59:59`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendientes = ((pendientesData ?? []) as any[])

  /* Publicaciones avanzadas HOY */
  const { data: pubsData } = await service
    .from('publicaciones')
    .select('nombre, estado, marca:marcas(nombre, slug)')
    .in('estado', ['editar', 'aprobar', 'programar', 'enviado'])
    .gte('updated_at', `${hoy}T00:00:00`)
    .lte('updated_at', `${hoy}T23:59:59`)
    .limit(20)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avances = ((pubsData ?? []) as any[]).map((p) => {
    const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
    return { nombre: p.nombre, estado: p.estado, marca: m?.nombre ?? m?.slug }
  })

  /* Comentarios respondidos hoy */
  const { count: comentariosRespondidos } = await service
    .from('comentarios_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'responded')
    .gte('responded_at', `${hoy}T00:00:00`)
    .lte('responded_at', `${hoy}T23:59:59`)

  /* Hábitos del admin completados hoy */
  const { data: habsAdmin } = await service
    .from('habitos')
    .select('id, nombre')
    .is('team_member_id', null)
    .eq('activo', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habsArr = ((habsAdmin ?? []) as any[])
  let habitosCompletados: string[] = []
  if (habsArr.length > 0) {
    const ids = habsArr.map((h) => h.id as string)
    const { data: hc } = await service
      .from('habitos_completados')
      .select('habito_id')
      .in('habito_id', ids)
      .eq('fecha', hoy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const set = new Set(((hc ?? []) as any[]).map((c) => c.habito_id as string))
    habitosCompletados = habsArr.filter((h) => set.has(h.id as string)).map((h) => h.nombre as string)
  }

  /* Texto de copia */
  const lineas: string[] = [
    `📋 Reporte del día — ${fechaBonita()}`,
    '👤 Pedro · Distinto Agencia',
    '',
  ]
  if (avances.length > 0) {
    lineas.push(`✅ Publicaciones avanzadas (${avances.length})`)
    for (const a of avances) lineas.push(`   • ${a.nombre} → ${a.estado} (${a.marca})`)
    lineas.push('')
  }
  if (pendientes.length > 0) {
    lineas.push(`⚡ Tareas rápidas completadas (${pendientes.length})`)
    for (const t of pendientes) lineas.push(`   • ${t.titulo} [${t.categoria}]`)
    lineas.push('')
  }
  if (comentariosRespondidos && comentariosRespondidos > 0) {
    lineas.push(`💬 Comentarios respondidos: ${comentariosRespondidos}`)
    lineas.push('')
  }
  if (habitosCompletados.length > 0) {
    lineas.push(`🔥 Rutina del día (${habitosCompletados.length})`)
    for (const h of habitosCompletados) lineas.push(`   • ${h}`)
    lineas.push('')
  }
  const total = avances.length + pendientes.length + (comentariosRespondidos ?? 0) + habitosCompletados.length
  if (total === 0) lineas.push('Hoy todavía no se registró ninguna acción.')
  else lineas.push(`Total: ${total} ${total === 1 ? 'acción registrada' : 'acciones registradas'}.`)
  lineas.push('')
  lineas.push('— Generado desde Distinto MCP')

  return NextResponse.json({
    ok: true,
    fecha: hoy,
    fecha_bonita: fechaBonita(),
    resumen: {
      publicaciones_avanzadas: avances.length,
      tareas_rapidas: pendientes.length,
      comentarios_respondidos: comentariosRespondidos ?? 0,
      habitos_cumplidos: habitosCompletados.length,
      total,
    },
    detalle: { avances, pendientes, habitosCompletados },
    texto_copia: lineas.join('\n'),
  })
}
