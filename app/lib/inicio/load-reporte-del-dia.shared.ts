// app/lib/inicio/load-reporte-del-dia.shared.ts
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
export type Service = any

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
export function fechaLimaIso(d: Date): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000
  const lima = new Date(utc - 5 * 60 * 60_000)
  return lima.toISOString().slice(0, 10)
}

export function formatFechaLargo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[fecha.getDay()]} ${d} de ${meses[fecha.getMonth()]}`
}

/** Hora local Lima (UTC-5) "HH:MM" a partir de un timestamptz ISO. */
export function horaLimaHM(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  return new Date(t - 5 * 60 * 60_000).toISOString().slice(11, 16)
}

/** Minutos entre dos timestamps (fin - inicio); null si falta alguno. */
export function durMin(inicioIso: string | null | undefined, finIso: string | null | undefined): number | null {
  if (!inicioIso || !finIso) return null
  const a = new Date(inicioIso).getTime(), b = new Date(finIso).getTime()
  if (isNaN(a) || isNaN(b) || b < a) return null
  return Math.round((b - a) / 60_000)
}
