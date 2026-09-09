// app/lib/inicio/load-reporte-del-dia.impl.ts
// Main loader — helpers/types in load-reporte-del-dia.shared.ts (Ailyn 493525fb)

import {
  type Service,
  type ReporteTareaCompletada,
  type ReporteHabitoCumplido,
  type ReporteDelegacion,
  type ReporteDelDiaData,
  fechaLimaIso,
  formatFechaLargo,
  horaLimaHM,
  durMin,
} from './load-reporte-del-dia.shared'

export async function loadReporteDelDia(
  service: Service,
  opts: {
    teamMemberId: string | null
    usuarioNombre: string
    usuarioNombreCompleto: string
    usuarioAvatarUrl: string | null
    usuarioRol: string
    esCEO: boolean
    /* rol_base del miembro. Lo usamos para decidir qué tareas trae el
       reporte: un diseñador ve TODAS las tareas de diseño terminadas
       (el módulo /diseno no asigna diseñador — Ailyn es la única, así
       que todas las de diseño son suyas). */
    rolBase?: string
    /* Día a reportar (YYYY-MM-DD, Lima). Default: hoy. Lo usa el reporte
       SEMANAL para pedir cada día por separado. Pedro/Erick 26-ago-2026. */
    fechaObjetivo?: string
  },
): Promise<ReporteDelDiaData> {
  const hoy = (opts.fechaObjetivo && /^\d{4}-\d{2}-\d{2}$/.test(opts.fechaObjetivo))
    ? opts.fechaObjetivo
    : fechaLimaIso(new Date())
  const inicioDiaIso = `${hoy}T00:00:00.000-05:00`
  const finDiaIso = `${hoy}T23:59:59.999-05:00`

  const SEL_PUB = 'id, nombre, editor_nombre, iniciado_edicion_at, editado_at, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)'

  // Queries en paralelo — la idea es que el reporte cargue rápido.
  const [
    pubsEditadasRes, pubsDisenoRes, habitosRes, habitosCompletadosRes, grabacionesRes, comentariosRes,
    tareasHechasRes, tareasAsignadasRes, tareasDelegadasRes, disenoPendienteRes, miembrosRes,
  ] =
    await Promise.all([
      // 1. Pubs editadas hoy por el usuario (editor_nombre match + editado_at).
      opts.esCEO
        ? service
            .from('publicaciones')
            .select(SEL_PUB)
            .gte('editado_at', inicioDiaIso)
            .lte('editado_at', finDiaIso)
            .limit(20)
        : service
            .from('publicaciones')
            .select(SEL_PUB)
            .ilike('editor_nombre', opts.usuarioNombre)
            .gte('editado_at', inicioDiaIso)
            .lte('editado_at', finDiaIso)
            .limit(20),

      /* Diseños terminados HOY: por diseno_terminado_at (no updated_at +
         estado_tarea=listo). Ailyn 493525fb: posts de grilla que Lorena
         marcaba listo al avanzar el pipeline inundaban "Diseños terminados"
         sin que Ailyn los hubiera trabajado (diseno_terminado_at/disenador
         quedaban null). */
      (opts.esCEO || opts.rolBase === 'disenador')
        ? service
            .from('publicaciones')
            .select('id, nombre, es_tarea_diseno, estado, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .gte('diseno_terminado_at', inicioDiaIso)
            .lte('diseno_terminado_at', finDiaIso)
            .limit(30)
            .then((r: { data: unknown; error?: { message?: string } | null }) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),

      opts.teamMemberId
        ? service
            .from('habitos')
            .select('id, nombre, icono, color, dias_activos')
            .eq('team_member_id', opts.teamMemberId)
            .eq('activo', true)
        : service
            .from('habitos')
            .select('id, nombre, icono, color, dias_activos')
            .eq('activo', true),

      opts.teamMemberId
        ? service
            .from('habitos_completados')
            .select('habito_id, completado_at, habitos!inner(id, nombre, icono, color, team_member_id)')
            .eq('fecha', hoy)
            .eq('habitos.team_member_id', opts.teamMemberId)
        : service
            .from('habitos_completados')
            .select('habito_id, completado_at, habitos(id, nombre, icono, color)')
            .eq('fecha', hoy),

      service
        .from('grabaciones')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'cumplida')
        .eq('fecha_real', hoy),

      service
        .from('comentarios_inbox')
        .select('id', { count: 'exact', head: true })
        .gte('responded_at', inicioDiaIso)
        .lte('responded_at', finDiaIso),

      opts.teamMemberId
        ? service
            .from('tareas')
            .select('id, texto, categoria, color, completada_at, created_by')
            .eq('team_member_id', opts.teamMemberId)
            .eq('completada', true)
            .gte('completada_at', inicioDiaIso)
            .lte('completada_at', finDiaIso)
            .limit(30)
        : Promise.resolve({ data: [] }),

      opts.teamMemberId
        ? service
            .from('tareas')
            .select('id, texto, categoria, color, created_by, team_member_id')
            .eq('team_member_id', opts.teamMemberId)
            .eq('completada', false)
            .limit(30)
        : Promise.resolve({ data: [] }),

      opts.teamMemberId
        ? service
            .from('tareas')
            .select('id, texto, team_member_id, completada')
            .eq('created_by', opts.teamMemberId)
            .neq('team_member_id', opts.teamMemberId)
            .gte('created_at', inicioDiaIso)
            .lte('created_at', finDiaIso)
            .limit(30)
        : Promise.resolve({ data: [] }),

      (opts.esCEO || opts.rolBase === 'disenador')
        ? service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .eq('es_tarea_diseno', true)
            .neq('estado_tarea', 'listo')
            .is('archived_at', null)
            .limit(20)
        : Promise.resolve({ data: [] }),

      service.from('team_members').select('id, nombre'),
    ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nombrePorId = new Map<string, string>(((miembrosRes?.data ?? []) as any[]).map((m) => [m.id as string, m.nombre as string]))

  const tareasMap = new Map<string, ReporteTareaCompletada>()

  type PubRow = {
    id: string
    nombre: string | null
    iniciado_edicion_at?: string | null
    editado_at?: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marca: any
  }

  const mapearPub = (r: PubRow, tipo: ReporteTareaCompletada['tipo']): ReporteTareaCompletada => {
    const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
    return {
      id: r.id,
      titulo: r.nombre ?? '(sin título)',
      marca: m?.nombre ?? m?.slug ?? 'Marca',
      marcaColor: m?.color_primario_hex ?? '#737373',
      marcaEmoji: m?.emoji_marca ?? null,
      tipo,
      duracionMin: tipo === 'editada' ? durMin(r.iniciado_edicion_at, r.editado_at) : null,
    }
  }

  for (const r of (pubsEditadasRes?.data ?? []) as PubRow[]) {
    tareasMap.set(r.id, mapearPub(r, 'editada'))
  }
  for (const r of (pubsDisenoRes?.data ?? []) as PubRow[]) {
    if (!tareasMap.has(r.id)) {
      tareasMap.set(r.id, mapearPub(r, 'disenada'))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (tareasHechasRes?.data ?? []) as any[]) {
    if (tareasMap.has(t.id)) continue
    const delegadaPor = t.created_by && t.created_by !== opts.teamMemberId
      ? (nombrePorId.get(t.created_by) ?? null) : null
    tareasMap.set(t.id, {
      id: t.id,
      titulo: t.texto ?? '(sin título)',
      marca: t.categoria ?? 'General',
      marcaColor: t.color ?? '#737373',
      marcaEmoji: null,
      tipo: 'tarea',
      duracionMin: null,
      delegadaPor,
    })
  }

  const tareasAsignadas: ReporteTareaCompletada[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (tareasAsignadasRes?.data ?? []) as any[]) {
    if (!t.created_by || t.created_by === opts.teamMemberId) continue
    tareasAsignadas.push({
      id: t.id,
      titulo: t.texto ?? '(sin título)',
      marca: t.categoria ?? 'General',
      marcaColor: t.color ?? '#737373',
      marcaEmoji: null,
      tipo: 'asignada',
      duracionMin: null,
      delegadaPor: nombrePorId.get(t.created_by) ?? null,
    })
  }
  for (const r of (disenoPendienteRes?.data ?? []) as PubRow[]) {
    if (tareasMap.has(r.id)) continue
    tareasAsignadas.push(mapearPub(r, 'asignada'))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareasDelegadas: ReporteDelegacion[] = ((tareasDelegadasRes?.data ?? []) as any[]).map((t) => ({
    id: t.id as string,
    titulo: (t.texto ?? '(sin título)') as string,
    asignadoA: nombrePorId.get(t.team_member_id) ?? '—',
    completada: !!t.completada,
  }))

  const diaSemana = (() => {
    const [y, m, d] = hoy.split('-').map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    return dow === 0 ? 7 : dow
  })()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosDia = ((habitosRes?.data ?? []) as any[])
    .filter((h) => Array.isArray(h.dias_activos) && h.dias_activos.includes(diaSemana))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosCumplidos: ReporteHabitoCumplido[] = ((habitosCompletadosRes?.data ?? []) as any[])
    .map((r): ReporteHabitoCumplido | null => {
      const h = Array.isArray(r.habitos) ? r.habitos[0] : r.habitos
      if (!h) return null
      return {
        id: h.id as string,
        nombre: h.nombre as string,
        icono: (h.icono ?? '✅') as string,
        color: (h.color ?? '#6366F1') as string,
        hora: horaLimaHM(r.completado_at),
      }
    })
    .filter((x): x is ReporteHabitoCumplido => x !== null)
    .sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'))

  const tareasCompletadas = Array.from(tareasMap.values())
  const pubsEditadasCount = tareasCompletadas.filter((t) => t.tipo === 'editada').length

  return {
    fechaIso: hoy,
    fechaLabel: formatFechaLargo(hoy),
    usuarioNombre: opts.usuarioNombre,
    usuarioNombreCompleto: opts.usuarioNombreCompleto,
    usuarioAvatarUrl: opts.usuarioAvatarUrl,
    usuarioRol: opts.usuarioRol,
    rolBase: opts.rolBase ?? '',
    tareasCompletadas,
    tareasAsignadas,
    tareasDelegadas,
    habitosCumplidos,
    habitosTotal: habitosDia.length,
    pubsEditadasCount,
    grabacionesHechasCount: grabacionesRes?.count ?? 0,
    comentariosRespondidosCount: comentariosRes?.count ?? 0,
  }
}

export type {
  ReporteTareaCompletada,
  ReporteHabitoCumplido,
  ReporteDelegacion,
  ReporteDelDiaData,
} from './load-reporte-del-dia.shared'
