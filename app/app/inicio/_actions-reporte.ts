// app/app/inicio/_actions-reporte.ts
'use server'

/* Genera un reporte del día para el user logueado.
 * Pedro pidió: 'que salga un reporte de lo que hicieron en el día,
 * generar reporte un resumen escrito rápido día fecha y lo que se hizo
 * y el botón de generar reporte del día, opción de copiar directo'.
 *
 * Estrategia: leer la actividad del user en las tablas relevantes para
 * su rol y armar un texto plano listo para WhatsApp / email.
 *
 *   - Pendientes_rapidos completados HOY → "Tareas marcadas"
 *   - Publicaciones que avanzó (editado_at o disenado_at = hoy) →
 *     "Avances de trabajo"
 *   - Comentarios respondidos hoy → "Atención al cliente"
 *   - Hábitos completados hoy → "Rutina personal"
 *
 * El texto sale en formato copiable plano + mini-resumen para mostrar
 * en la UI antes de copiar. */

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'

const TZ_LIMA = 'America/Lima'

function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_LIMA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function fechaBonita(): string {
  /* 'lunes 9 de junio' */
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ_LIMA, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
}

export type ReporteDia = {
  fechaBonita: string
  textoCopia: string
  resumenLineas: string[]
  totalAcciones: number
}

export async function generarReporteDelDia(): Promise<
  { ok: true; reporte: ReporteDia } | { ok: false; error: string }
> {
  const user = await requireUser()
  const p = await getCurrentMemberPermisos()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const hoy = todayStr()
  const fecha = fechaBonita()
  const nombre = p?.member.nombre ?? user.email?.split('@')[0] ?? 'Equipo'
  const rolBase = p?.member.rol_base ?? 'admin'

  /* 1. Pendientes rápidos completados HOY */
  let pendientesQuery = service
    .from('pendientes_rapidos')
    .select('titulo, categoria, completado_at')
    .eq('completado', true)
    .gte('completado_at', `${hoy}T00:00:00`)
    .lte('completado_at', `${hoy}T23:59:59`)
  if (p?.member.id) {
    pendientesQuery = pendientesQuery.eq('team_member_id', p.member.id)
  } else {
    pendientesQuery = pendientesQuery.is('team_member_id', null)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendientesData } = await pendientesQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendientes = ((pendientesData ?? []) as any[])

  /* 2. Publicaciones avanzadas HOY — por rol */
  const avances: Array<{ nombre: string; marca: string; estado: string }> = []
  if (rolBase === 'editor') {
    /* Videos cuyo editado_at = hoy y editor_nombre = nombre del miembro */
    const { data } = await service
      .from('publicaciones')
      .select('nombre, estado, editado_at, marca:marcas(nombre, slug)')
      .gte('editado_at', `${hoy}T00:00:00`)
      .lte('editado_at', `${hoy}T23:59:59`)
      .ilike('editor_nombre', nombre)
      .limit(20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((data ?? []) as any[])) {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      avances.push({
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        estado: (r.estado ?? '') as string,
      })
    }
  } else if (rolBase === 'disenador') {
    /* Tareas de diseño donde el disenador_nombre coincide y se
       actualizaron HOY (updated_at). Sin tabla específica de
       'completado por día'; usamos updated_at como proxy. */
    const { data } = await service
      .from('publicaciones')
      .select('nombre, estado, updated_at, marca:marcas(nombre, slug)')
      .gte('updated_at', `${hoy}T00:00:00`)
      .lte('updated_at', `${hoy}T23:59:59`)
      .ilike('disenador_nombre', nombre)
      .eq('estado', 'disenar')
      .limit(20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((data ?? []) as any[])) {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      avances.push({
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        estado: 'diseño',
      })
    }
  }

  /* 3. Comentarios respondidos HOY — para CM principalmente */
  let comentariosRespondidos = 0
  if (rolBase === 'community_manager' || rolBase === 'social_media_manager' || rolBase === 'director' || !p) {
    const { count } = await service
      .from('comentarios_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'responded')
      .gte('responded_at', `${hoy}T00:00:00`)
      .lte('responded_at', `${hoy}T23:59:59`)
    comentariosRespondidos = (count ?? 0) as number
  }

  /* 4. Hábitos completados HOY */
  const habitosIdsResult = p?.member.id
    ? await service
        .from('habitos')
        .select('id, nombre')
        .eq('team_member_id', p.member.id)
        .eq('activo', true)
    : await service
        .from('habitos')
        .select('id, nombre')
        .is('team_member_id', null)
        .eq('activo', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosArr = (habitosIdsResult.data ?? []) as any[]
  const habitoIds = habitosArr.map((h) => h.id as string)
  let habitosCompletados: string[] = []
  if (habitoIds.length > 0) {
    const { data: hcData } = await service
      .from('habitos_completados')
      .select('habito_id')
      .in('habito_id', habitoIds)
      .eq('fecha', hoy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completSet = new Set(((hcData ?? []) as any[]).map((c) => c.habito_id as string))
    habitosCompletados = habitosArr
      .filter((h) => completSet.has(h.id as string))
      .map((h) => h.nombre as string)
  }

  /* Armar el texto */
  const lineas: string[] = []
  lineas.push(`📋 Reporte del día — ${fecha}`)
  lineas.push(`👤 ${nombre}`)
  lineas.push('')

  if (avances.length > 0) {
    lineas.push(`✅ Avances de trabajo (${avances.length})`)
    for (const a of avances) {
      lineas.push(`   • ${a.nombre} (${a.marca})`)
    }
    lineas.push('')
  }

  if (pendientes.length > 0) {
    lineas.push(`⚡ Tareas rápidas completadas (${pendientes.length})`)
    for (const t of pendientes) {
      lineas.push(`   • ${t.titulo}`)
    }
    lineas.push('')
  }

  if (comentariosRespondidos > 0) {
    lineas.push(`💬 Comentarios respondidos: ${comentariosRespondidos}`)
    lineas.push('')
  }

  if (habitosCompletados.length > 0) {
    lineas.push(`🔥 Rutina del día (${habitosCompletados.length})`)
    for (const h of habitosCompletados) {
      lineas.push(`   • ${h}`)
    }
    lineas.push('')
  }

  const totalAcciones =
    avances.length + pendientes.length + comentariosRespondidos + habitosCompletados.length

  if (totalAcciones === 0) {
    lineas.push('Hoy todavía no registré ninguna acción.')
    lineas.push('Si avancé trabajo, marquemos las tareas y los hábitos para que se vean acá.')
  } else {
    lineas.push(`Total: ${totalAcciones} ${totalAcciones === 1 ? 'acción registrada' : 'acciones registradas'}.`)
  }
  lineas.push('')
  lineas.push('— Generado desde Distinto')

  /* Resumen para mostrar en UI (sin emojis pesados, más corto) */
  const resumenLineas: string[] = []
  if (avances.length > 0) resumenLineas.push(`${avances.length} ${avances.length === 1 ? 'avance' : 'avances'} de trabajo`)
  if (pendientes.length > 0) resumenLineas.push(`${pendientes.length} ${pendientes.length === 1 ? 'tarea rápida' : 'tareas rápidas'} hechas`)
  if (comentariosRespondidos > 0) resumenLineas.push(`${comentariosRespondidos} ${comentariosRespondidos === 1 ? 'comentario' : 'comentarios'} respondidos`)
  if (habitosCompletados.length > 0) resumenLineas.push(`${habitosCompletados.length} ${habitosCompletados.length === 1 ? 'hábito' : 'hábitos'} cumplidos`)
  if (resumenLineas.length === 0) resumenLineas.push('Sin acciones registradas hoy')

  return {
    ok: true,
    reporte: {
      fechaBonita: fecha,
      textoCopia: lineas.join('\n'),
      resumenLineas,
      totalAcciones,
    },
  }
}
