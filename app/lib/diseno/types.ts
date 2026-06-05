// app/lib/diseno/types.ts
//
// Tipos compartidos entre /diseno (server) y DisenoView (client).
// Patrón espejo de lib/editor/types.ts — los nombres y semántica son
// equivalentes pero apuntan al flujo del diseñador (Ailyn et al.),
// no del editor de video.

export type EstadoPub =
  | 'disenar' | 'editar' | 'aprobar' | 'programar' | 'publicar' | 'publicado' | 'borrador'

/* Sub-estados específicos del workflow de diseño.
   Mapeamos al ENUM estado_tarea existente para no crear otra columna. */
export type SubEstadoDiseno = 'sin_empezar' | 'en_progreso' | 'listo'

export type DisenoEntry = {
  id: string
  marcaSlug: string
  nombreTarea: string
  disenadorId: string | null      // FK a tabla disenadores
  disenadorNombre: string | null  // denormalizado: cuando el sync de
                                  // Notion trajo un nombre que aún no
                                  // existe en `disenadores`
  fechaPublicacion: string | null // ISO YYYY-MM-DD (deadline real)
  fechaDiseno: string             // ISO YYYY-MM-DD (cuándo se diseña)
  estado: EstadoPub
  subEstado: SubEstadoDiseno
  plataformas: string[]            // ['IG', 'FB', ...]
  tipoContenido: string[]          // ['Reel', 'Post', 'Manual', ...]
  portadaCrudaUrl: string | null   // referencia para Ailyn
  portadaEditadaUrl: string | null // resultado del diseño
  portadaLista: boolean            // checkbox de listo
  disenado: boolean                // checkbox "Diseñado" del workflow
  fechaMarcadaParaDisenar: string | null  // YYYY-MM-DD del "hoy"
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
 * Si el estado_tarea no calza con el ciclo de diseño (ej. "publicado"),
 * default a 'sin_empezar' para no romper la UI.
 */
export function normalizeSubEstado(estadoTarea: string | null | undefined): SubEstadoDiseno {
  const s = (estadoTarea ?? '').toLowerCase().trim()
  if (s === 'listo' || s === 'completado') return 'listo'
  if (s === 'en_progreso' || s === 'en progreso' || s.includes('progreso')) return 'en_progreso'
  return 'sin_empezar'
}
