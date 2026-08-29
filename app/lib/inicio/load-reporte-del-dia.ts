// app/lib/inicio/load-reporte-del-dia.ts
//
// Carga el "Reporte del día" del usuario logueado: lo que terminó hoy,
// hábitos cumplidos, y métricas extras (pubs editadas, grabaciones, comentarios
// respondidos). Se usa en /inicio para que cada chico al cerrar el día
// genere una imagen + texto y lo mande al grupo de WhatsApp.
//
// Iter 1 — Pragmatic:
// - tareasCompletadas: publicaciones.editado_at = hoy AND editor_nombre = self
//   (también detecta pubs en diseño que pasaron portada_lista=true hoy).
// - habitosCumplidos: habitos_completados.fecha = hoy del team_member del user.
// - grabacionesHechas: grabaciones.fecha_real = hoy AND estado = 'cumplida'
//   (workspace-wide en iter 1 — no hay columna grabador_id).
// - comentariosRespondidos: comentarios_inbox.responded_at::date = hoy
//   (workspace-wide en iter 1 — el respondedor no se trackea por user todavía).
//
// El componente cliente decide qué mostrar según el rol del usuario, así
// un editor no ve "0 hábitos" si no usa el módulo de hábitos.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type ReporteTareaCompletada = {
  id: string
  titulo: string
  marca: string
  marcaColor: string
  marcaEmoji: string | null
  tipo: 'editada' | 'disenada' | 'aprobada' | 'grabada' | 'comentario' | 'tarea' | 'asignada'
  /* Duración editando→aprobar en minutos (solo videos editados con ambos
     timestamps iniciado_edicion_at + editado_at). Pieer: "calcula el tiempo
     que pasa de editando a aprobar". */
  duracionMin?: number | null
  /* Si la tarea fue delegada por OTRA persona, su nombre. Para que en el
     reporte de Pieer salga "delegada por Lorena". */
  delegadaPor?: string | null
}

export type ReporteHabitoCumplido = {
  id: string
  nombre: string
  icono: string
  color: string
  /* Hora local Lima HH:MM en que se marcó el hábito (de completado_at).
     Pedro: "los hábitos que salgan con la hora que hicieron clic". */
  hora?: string | null
}

/* Una tarea que YO delegué a otra persona (vista del que delega, ej. Lorena). */
export type ReporteDelegacion = {
  id: string
  titulo: string
  asignadoA: string       // nombre de a quién se la delegó
  completada: boolean
}

export type ReporteDelDiaData = {
  fechaIso: string                   // YYYY-MM-DD Lima
  fechaLabel: string                 // "miércoles 11 de junio"
  usuarioNombre: string              // "Pedro" (primer nombre)
  usuarioNombreCompleto: string      // "Pedro Reyes"
  usuarioAvatarUrl: string | null
  usuarioRol: string                 // "Editor de video", "CEO", etc. (display)
  rolBase: string                    // 'disenador' | 'editor' | 'community_manager' | ... — para gatear qué métricas se muestran
  tareasCompletadas: ReporteTareaCompletada[]
  /* Trabajo delegado/asignado A MÍ que está pendiente: tareas que me asignaron
     + (para diseño) publicaciones que llegaron a diseño y aún no termino. */
  tareasAsignadas: ReporteTareaCompletada[]
  /* Lo que YO delegué a otros hoy (para el reporte de quien delega, ej. Lorena). */
  tareasDelegadas: ReporteDelegacion[]
  habitosCumplidos: ReporteHabitoCumplido[]
  habitosTotal: number               // total de hábitos activos del día
  pubsEditadasCount: number          // = tareasCompletadas.length filtrado a tipo='editada'
  grabacionesHechasCount: number
  comentariosRespondidosCount: number
}

/** Devuelve fecha YYYY-MM-DD en zona Lima (UTC-5), independiente del runtime. */
function fechaLimaIso(d: Date): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000
  const lima = new Date(utc - 5 * 60 * 60_000)
  return lima.toISOString().slice(0, 10)
}

function formatFechaLargo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[fecha.getDay()]} ${d} de ${meses[fecha.getMonth()]}`
}

/** Hora local Lima (UTC-5) "HH:MM" a partir de un timestamptz ISO. */
function horaLimaHM(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  return new Date(t - 5 * 60 * 60_000).toISOString().slice(11, 16)
}

/** Minutos entre dos timestamps (fin - inicio); null si falta alguno. */
function durMin(inicioIso: string | null | undefined, finIso: string | null | undefined): number | null {
  if (!inicioIso || !finIso) return null
  const a = new Date(inicioIso).getTime(), b = new Date(finIso).getTime()
  if (isNaN(a) || isNaN(b) || b < a) return null
  return Math.round((b - a) / 60_000)
}

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
      //    Para CEO traemos todas, sin filtro de editor_nombre.
      //    Traemos iniciado_edicion_at + editado_at para calcular la duración
      //    editando→aprobar (pedido de Pedro para Pieer).
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

      // 2. Tareas de DISEÑO marcadas como "listo" hoy.
      //    El módulo /diseno setea estado_tarea='listo' cuando se termina
      //    una tarea. NO hay columna `listo_at`, así que usamos updated_at
      //    como proxy de "cuándo se marcó terminada".
      //
      //    CLAVE (fix 2026-06-15): las tareas de diseño NO tienen
      //    disenador_id ni disenador_nombre (0 de 968 en la BD) — el
      //    módulo /diseno no asigna diseñador porque Ailyn es la única.
      //    Por eso NO filtramos por nombre: el diseñador (o el CEO) ve
      //    TODAS las tareas de diseño terminadas hoy. Los demás roles no
      //    ven tareas de diseño en su reporte.
      //
      //    Filtramos a tareas de diseño REALES (es_tarea_diseno=true O
      //    estado='disenar') para no incluir pubs de video que el editor
      //    dejó en estado_tarea='listo' (esas salen en el query #1 por
      //    editor_nombre + editado_at).
      (opts.esCEO || opts.rolBase === 'disenador')
        ? service
            .from('publicaciones')
            .select('id, nombre, es_tarea_diseno, estado, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .eq('estado_tarea', 'listo')
            .or('es_tarea_diseno.eq.true,estado.eq.disenar')
            .gte('updated_at', inicioDiaIso)
            .lte('updated_at', finDiaIso)
            .limit(30)
        : // Roles no-diseño/no-CEO: no traen tareas de diseño.
          Promise.resolve({ data: [] }),

      // 3. Hábitos activos del usuario hoy (para saber el total).
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

      // 4. Hábitos completados hoy del usuario (con completado_at para la hora).
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

      // 5. Grabaciones del día (workspace-wide en iter 1).
      service
        .from('grabaciones')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'cumplida')
        .eq('fecha_real', hoy),

      // 6. Comentarios respondidos hoy (workspace-wide en iter 1).
      service
        .from('comentarios_inbox')
        .select('id', { count: 'exact', head: true })
        .gte('responded_at', inicioDiaIso)
        .lte('responded_at', finDiaIso),

      // 7. Tareas del tablero personal COMPLETADAS hoy por el usuario.
      //    Fuente universal de "lo que terminé" — clave para Lorena (CM), cuyo
      //    trabajo NO está en publicaciones y por eso salía "0 tareas".
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

      // 8. Tareas asignadas A MÍ que siguen PENDIENTES (trabajo delegado).
      //    Pieer: "que salgan algunas tareas que se le delegan". Si Lorena le
      //    delega a Pieer (created_by=Lorena, team_member_id=Pieer), sale acá.
      opts.teamMemberId
        ? service
            .from('tareas')
            .select('id, texto, categoria, color, created_by, team_member_id')
            .eq('team_member_id', opts.teamMemberId)
            .eq('completada', false)
            .limit(30)
        : Promise.resolve({ data: [] }),

      // 9. Tareas que YO delegué a otros hoy (vista del que delega — Lorena).
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

      // 10. Cola de DISEÑO entrante/pendiente (lo que "llegó a diseño" y aún no
      //     se termina) — para Ailyn. Pedro: mostrar las tareas que se le
      //     delegaron / llegaron a diseño, no solo las terminadas.
      (opts.esCEO || opts.rolBase === 'disenador')
        ? service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .eq('es_tarea_diseno', true)
            .neq('estado_tarea', 'listo')
            .is('archived_at', null)
            .limit(20)
        : Promise.resolve({ data: [] }),

      // 11. Miembros (id→nombre) para resolver "delegada por X" / "delegué a Y".
      service.from('team_members').select('id, nombre'),
    ])

  // Mapa id→nombre de miembros para resolver delegaciones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nombrePorId = new Map<string, string>(((miembrosRes?.data ?? []) as any[]).map((m) => [m.id as string, m.nombre as string]))

  // Construir tareasCompletadas (mezcla editadas + diseñadas + tareas, dedup por id).
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
      // Duración editando→aprobar solo para videos editados.
      duracionMin: tipo === 'editada' ? durMin(r.iniciado_edicion_at, r.editado_at) : null,
    }
  }

  for (const r of (pubsEditadasRes?.data ?? []) as PubRow[]) {
    tareasMap.set(r.id, mapearPub(r, 'editada'))
  }
  // Solo agrega diseños del usuario si es CEO o diseñadora (sin team_member_id
  // de diseño tracking, asumimos que si está en estado diseñado hoy y el user
  // tiene rol 'disenador', cuenta). Para iter 1, agregamos todos los diseños
  // si el usuario es CEO; en otros casos el filtro lo hace el componente de
  // UI según el rol — acá no descartamos para no perder data.
  for (const r of (pubsDisenoRes?.data ?? []) as PubRow[]) {
    if (!tareasMap.has(r.id)) {
      tareasMap.set(r.id, mapearPub(r, 'disenada'))
    }
  }

  // Tareas del tablero personal terminadas hoy → "lo que terminé" (todos los
  // roles; clave para Lorena). Si la creó otra persona, marcamos delegadaPor.
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

  // Trabajo asignado A MÍ, pendiente: (a) tareas que me delegó OTRO + (b) cola
  // de diseño entrante (Ailyn). Dedup contra lo ya terminado.
  const tareasAsignadas: ReporteTareaCompletada[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (tareasAsignadasRes?.data ?? []) as any[]) {
    if (!t.created_by || t.created_by === opts.teamMemberId) continue  // propias, no "delegadas"
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

  // Lo que YO delegué a otros hoy (vista del delegador — Lorena).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareasDelegadas: ReporteDelegacion[] = ((tareasDelegadasRes?.data ?? []) as any[]).map((t) => ({
    id: t.id as string,
    titulo: (t.texto ?? '(sin título)') as string,
    asignadoA: nombrePorId.get(t.team_member_id) ?? '—',
    completada: !!t.completada,
  }))

  // Hábitos: total activos para hoy (filtrar por dias_activos)
  const diaSemana = (() => {
    // 1=lunes, 7=domingo (compatible con el seed de habitos)
    const [y, m, d] = hoy.split('-').map(Number)
    const dow = new Date(y, m - 1, d).getDay()  // 0=domingo, 6=sábado
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
    /* Orden cronológico por hora de completado (las sin hora al final). */
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
