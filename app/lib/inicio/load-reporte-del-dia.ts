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
  tipo: 'editada' | 'disenada' | 'aprobada' | 'grabada' | 'comentario'
}

export type ReporteHabitoCumplido = {
  id: string
  nombre: string
  icono: string
  color: string
}

export type ReporteDelDiaData = {
  fechaIso: string                   // YYYY-MM-DD Lima
  fechaLabel: string                 // "miércoles 11 de junio"
  usuarioNombre: string              // "Pedro" (primer nombre)
  usuarioNombreCompleto: string      // "Pedro Reyes"
  usuarioAvatarUrl: string | null
  usuarioRol: string                 // "Editor de video", "CEO", etc.
  tareasCompletadas: ReporteTareaCompletada[]
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

export async function loadReporteDelDia(
  service: Service,
  opts: {
    teamMemberId: string | null
    usuarioNombre: string
    usuarioNombreCompleto: string
    usuarioAvatarUrl: string | null
    usuarioRol: string
    esCEO: boolean
  },
): Promise<ReporteDelDiaData> {
  const hoy = fechaLimaIso(new Date())
  const inicioDiaIso = `${hoy}T00:00:00.000-05:00`
  const finDiaIso = `${hoy}T23:59:59.999-05:00`

  // Seis queries en paralelo — la idea es que el reporte cargue rápido.
  const [pubsEditadasRes, pubsDisenoRes, habitosRes, habitosCompletadosRes, grabacionesRes, comentariosRes] =
    await Promise.all([
      // 1. Pubs editadas hoy por el usuario (editor_nombre match + editado_at).
      //    Para CEO traemos todas, sin filtro de editor_nombre.
      opts.esCEO
        ? service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .gte('editado_at', inicioDiaIso)
            .lte('editado_at', finDiaIso)
            .limit(20)
        : service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .ilike('editor_nombre', opts.usuarioNombre)
            .gte('editado_at', inicioDiaIso)
            .lte('editado_at', finDiaIso)
            .limit(20),

      // 2. Tareas de DISEÑO marcadas como "listo" hoy por el usuario.
      //    El módulo /diseno setea estado_tarea='listo' cuando Ailyn (o
      //    cualquier diseñador) termina una tarea — NO hay columna
      //    `listo_at` dedicada todavía, así que usamos updated_at como
      //    proxy de "cuándo se marcó como terminada". Pragmático para
      //    iter 1; iter 2 podría agregar columna terminado_at via
      //    migration. Filtro por disenador_nombre evita que un editor
      //    vea tareas de diseño en su reporte.
      opts.esCEO
        ? service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .eq('estado_tarea', 'listo')
            .gte('updated_at', inicioDiaIso)
            .lte('updated_at', finDiaIso)
            .limit(20)
        : service
            .from('publicaciones')
            .select('id, nombre, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)')
            .ilike('disenador_nombre', opts.usuarioNombre)
            .eq('estado_tarea', 'listo')
            .gte('updated_at', inicioDiaIso)
            .lte('updated_at', finDiaIso)
            .limit(20),

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

      // 4. Hábitos completados hoy del usuario.
      opts.teamMemberId
        ? service
            .from('habitos_completados')
            .select('habito_id, habitos!inner(id, nombre, icono, color, team_member_id)')
            .eq('fecha', hoy)
            .eq('habitos.team_member_id', opts.teamMemberId)
        : service
            .from('habitos_completados')
            .select('habito_id, habitos(id, nombre, icono, color)')
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
    ])

  // Construir tareasCompletadas (mezcla editadas + diseñadas, dedup por id).
  const tareasMap = new Map<string, ReporteTareaCompletada>()

  type PubRow = {
    id: string
    nombre: string | null
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
    .map((r) => {
      const h = Array.isArray(r.habitos) ? r.habitos[0] : r.habitos
      if (!h) return null
      return {
        id: h.id as string,
        nombre: h.nombre as string,
        icono: (h.icono ?? '✅') as string,
        color: (h.color ?? '#6366F1') as string,
      }
    })
    .filter((x): x is ReporteHabitoCumplido => x !== null)

  const tareasCompletadas = Array.from(tareasMap.values())
  const pubsEditadasCount = tareasCompletadas.filter((t) => t.tipo === 'editada').length

  return {
    fechaIso: hoy,
    fechaLabel: formatFechaLargo(hoy),
    usuarioNombre: opts.usuarioNombre,
    usuarioNombreCompleto: opts.usuarioNombreCompleto,
    usuarioAvatarUrl: opts.usuarioAvatarUrl,
    usuarioRol: opts.usuarioRol,
    tareasCompletadas,
    habitosCumplidos,
    habitosTotal: habitosDia.length,
    pubsEditadasCount,
    grabacionesHechasCount: grabacionesRes?.count ?? 0,
    comentariosRespondidosCount: comentariosRes?.count ?? 0,
  }
}
