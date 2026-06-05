// app/lib/editor/types.ts
//
// Tipos compartidos entre /editor (page.tsx server component) y
// EditorView (client component). Antes EditorView usaba EditorEntryMock
// y eso obligaba a re-shape el data real en page.tsx. Ahora ambos usan
// el mismo tipo y page.tsx pasa el data sin shape extra.

export type EstadoPub =
  | 'editar' | 'aprobar' | 'programar' | 'publicar' | 'publicado' | 'borrador'

export type EditorEntry = {
  id: string
  marcaSlug: string
  nombreTarea: string
  editorId: string | null      // id en tabla editores
  editorNombre: string | null  // denormalizado por si editorId es null
                               // pero hay editor_nombre del sync Notion
  grillaFit: string            // ISO YYYY-MM-DD (fecha_publicacion)
  estado: EstadoPub
  fechaEdicion: string         // ISO YYYY-MM-DD
  plataformas: string[]        // ['IG', 'FB', 'TT']
  enlaceTomas: string | null   // URL Drive de las tomas
  guion: string | null         // texto del guion técnico
  fechaMarcadaParaEditar: string | null  // YYYY-MM-DD si está en "hoy"
  /* Tracking de tiempo de edición — migration 027.
     iniciadoEdicionAt: cuando el editor hizo clic en "▶ Editando".
     editadoAt: cuando el estado pasó de 'editar' a un estado avanzado
     por primera vez. La diferencia entre ambos es el tiempo total. */
  iniciadoEdicionAt: string | null  // ISO timestamp con TZ
  editadoAt: string | null          // ISO timestamp con TZ
}

export type EditorOption = {
  id: string
  nombre: string
  color: string  // hex para el chip; auto-asignado si la BD no trae
}

/**
 * Calcula el nivel de urgencia comparando fecha de edición vs fecha
 * de publicación. Pedro pidió:
 *   - <=1 día de margen   → 'rojo'   (urgente)
 *   - 2-3 días de margen  → 'amarillo' (atención)
 *   - >=4 días de margen  → 'verde'  (hay tiempo)
 *
 * Si las fechas son inválidas o iguales, devuelve 'rojo' (mejor pecar
 * de urgente que de relajado).
 */
export type AlertaFecha = 'rojo' | 'amarillo' | 'verde'

export function calcularAlertaFecha(
  fechaEdicion: string | null,
  fechaPublicacion: string | null,
): AlertaFecha {
  if (!fechaEdicion || !fechaPublicacion) return 'verde'
  const ed = new Date(fechaEdicion + 'T00:00:00')
  const pub = new Date(fechaPublicacion + 'T00:00:00')
  if (isNaN(ed.getTime()) || isNaN(pub.getTime())) return 'rojo'
  const ms = pub.getTime() - ed.getTime()
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (dias <= 1) return 'rojo'
  if (dias <= 3) return 'amarillo'
  return 'verde'
}

/**
 * Convierte un timestamp ISO a la FECHA Lima (YYYY-MM-DD).
 * Necesario para agrupar "videos editados por día" en zona horaria
 * de Lima — si usáramos UTC, videos editados a las 7pm-12am de Lima
 * caerían al día siguiente (medianoche UTC) y la métrica diaria
 * mentiría.
 */
export function fechaLima(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}

/**
 * Formatea una duración en milisegundos a "Xh Ym" o "Xm Ys" según
 * magnitud. Para tiempo medio de edición y "tiempo en edición".
 */
export function formatDuracion(ms: number | null): string {
  if (ms === null || isNaN(ms) || ms < 0) return '—'
  const minutos = Math.floor(ms / 60_000)
  if (minutos < 60) {
    if (minutos < 1) return '<1m'
    return `${minutos}m`
  }
  const horas = Math.floor(minutos / 60)
  const minRest = minutos % 60
  if (horas < 24) return `${horas}h ${minRest}m`
  const dias = Math.floor(horas / 24)
  const horasRest = horas % 24
  return `${dias}d ${horasRest}h`
}
