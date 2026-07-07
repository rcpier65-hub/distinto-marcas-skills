// app/lib/diseno/types.ts
//
// Tipos compartidos entre /diseno (server) y DisenoView (client).
// Patrón espejo de lib/editor/types.ts — los nombres y semántica son
// equivalentes pero apuntan al flujo del diseñador (Ailyn et al.),
// no del editor de video.

export type EstadoPub =
  | 'disenar' | 'editar' | 'aprobar' | 'programar' | 'publicar' | 'publicado' | 'borrador'

/* Sub-estados del workflow de diseño.
   'archivado': la tarea ya no se muestra en lista normal. Pedro pidió
   este estado para sacar cosas del kanban sin borrarlas. */
export type SubEstadoDiseno = 'sin_empezar' | 'en_progreso' | 'listo' | 'archivado'

export type DisenoEntry = {
  id: string
  marcaSlug: string
  marcaNombre: string             // para el chip del kanban sin lookup
  marcaColor: string              // ditto
  marcaEmoji: string | null
  /* Todas las marcas etiquetadas (principal + extras de marcas_extra), para
     mostrar varios chips por tarjeta y filtrar por cualquiera. La 1ra = principal. */
  marcasTags: { slug: string; nombre: string; color: string; emoji: string | null }[]
  esInterno: boolean              // marca='interno' = tarea standalone
                                  // (Manual de marca, Banner web, etc.)
  nombreTarea: string
  descripcion: string | null      // brief largo
  fechaPublicacion: string | null // null si es tarea standalone
  fechaDiseno: string | null      // día específico para diseñar
  fechaEntrega: string | null     // deadline del rango
  estado: EstadoPub
  subEstado: SubEstadoDiseno
  plataformas: string[]
  tipoContenido: string[]
  fechaMarcadaParaDisenar: string | null  // YYYY-MM-DD del "hoy"
  /* Timeline tracking — para que Pedro vea cuánto duró la tarea
     "en progreso" antes de archivarse o completarse.
     - startedAt: cuándo pasó a 'en_progreso' (la primera vez).
       Si vuelve a 'sin_empezar' y luego a 'en_progreso' otra vez,
       NO lo reseteamos — el primer arranque es el que cuenta.
     - archivedAt: cuándo pasó a 'archivado'. Se limpia (null) si
       se reactiva la tarea. */
  startedAt: string | null    // ISO timestamp
  archivedAt: string | null   // ISO timestamp
}

export type DisenadorOption = {
  id: string
  nombre: string
  color: string  // hex para el chip; auto-asignado si la BD no trae
}

/**
 * Calcula urgencia comparando fecha_diseno vs fecha_publicacion.
 * Misma escala que el módulo de Editor:
 *   - <=1 día de margen   → 'rojo'   (urgente)
 *   - 2-3 días de margen  → 'amarillo' (atención)
 *   - >=4 días de margen  → 'verde'  (hay tiempo)
 *
 * Si falta una fecha o son inválidas:
 *   - sin fecha_publicacion → 'verde' (no hay deadline definido)
 *   - fecha inválida        → 'rojo' (mejor pecar de urgente)
 */
export type AlertaFecha = 'rojo' | 'amarillo' | 'verde'

export function calcularAlertaFecha(
  fechaDiseno: string | null,
  fechaPublicacion: string | null,
): AlertaFecha {
  if (!fechaDiseno || !fechaPublicacion) return 'verde'
  const d = new Date(fechaDiseno + 'T00:00:00')
  const p = new Date(fechaPublicacion + 'T00:00:00')
  if (isNaN(d.getTime()) || isNaN(p.getTime())) return 'rojo'
  const dias = Math.floor((p.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (dias <= 1) return 'rojo'
  if (dias <= 3) return 'amarillo'
  return 'verde'
}

/**
 * Mapea el ENUM estado_tarea de Postgres al sub-estado de diseño.
 * Si el estado_tarea no calza con el ciclo de diseño, default a
 * 'sin_empezar' para no romper la UI.
 */
export function normalizeSubEstado(estadoTarea: string | null | undefined): SubEstadoDiseno {
  const s = (estadoTarea ?? '').toLowerCase().trim()
  if (s === 'archivado' || s === 'archivada') return 'archivado'
  if (s === 'listo' || s === 'completado') return 'listo'
  if (s === 'en_progreso' || s === 'en progreso' || s.includes('progreso')) return 'en_progreso'
  return 'sin_empezar'
}

/**
 * Formatea fecha+hora ISO como "5 jun · 14:32" — usado en la card del
 * Kanban para mostrar cuándo se archivó la tarea.
 */
export function formatDateTimeES(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dd = d.getDate()
  const mes = meses[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dd} ${mes} · ${hh}:${mm}`
}

/**
 * Devuelve duración legible entre 2 timestamps ("3 días 2h", "4h 30min",
 * "12 min"). Si falta alguno, devuelve null.
 */
export function formatDuracion(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (isNaN(start) || isNaN(end) || end < start) return null
  const ms = end - start
  const minutos = Math.floor(ms / 60_000)
  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    const m = minutos % 60
    return m === 0 ? `${horas}h` : `${horas}h ${m}min`
  }
  const dias = Math.floor(horas / 24)
  const h = horas % 24
  return h === 0 ? `${dias} día${dias === 1 ? '' : 's'}` : `${dias} día${dias === 1 ? '' : 's'} ${h}h`
}
