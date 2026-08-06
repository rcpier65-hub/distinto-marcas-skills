// Categorías de las fechas importantes (idea de Lorena — organizar por tipo).
// Pedro 24-jul-2026: cada TIPO de cosa (grabación, cena, evento…) tiene su
// propio color, para que en el calendario "cada cosa" se distinga por color y
// no todo se vea del color de la marca.
//
// Los `id` son estables: no cambiar los existentes (romperían las fechas ya
// guardadas). Se pueden AGREGAR nuevos al final. Colores bien distintos entre
// sí para leerlos de un vistazo en celdas chicas.

export type CategoriaFecha = { id: string; label: string; color: string }

export const CATEGORIAS_FECHA: CategoriaFecha[] = [
  { id: 'grabacion', label: 'Grabación', color: '#ef4444' },        // rojo
  { id: 'reunion', label: 'Reunión / cena', color: '#8b5cf6' },     // morado
  { id: 'evento', label: 'Evento / salida', color: '#16a34a' },     // verde
  { id: 'publicacion', label: 'Publicación', color: '#0ea5e9' },    // azul
  { id: 'campania', label: 'Campaña', color: '#f59e0b' },           // ámbar
  { id: 'marca', label: 'Fecha de la marca', color: '#14b8a6' },    // teal
  { id: 'nacional', label: 'Feriado / nacional', color: '#ec4899' },// rosa
  { id: 'sector', label: 'Del sector', color: '#64748b' },          // pizarra
  { id: 'otro', label: 'Otro', color: '#94a3b8' },                  // gris
]

export function categoriaInfo(id: string | null | undefined): CategoriaFecha {
  return CATEGORIAS_FECHA.find((c) => c.id === id) ?? CATEGORIAS_FECHA[CATEGORIAS_FECHA.length - 1]
}

/* Tipo de CONTENIDO que se hará en una fecha (idea de Lorena 25-jul-2026: al
   enviarle las fechas del mes al cliente, indicar qué se realizará — post/reel).
   Se guarda en fechas_importantes.contenido. `null`/'' = sin definir. */
export type ContenidoFecha = { id: string; label: string; emoji: string }

export const CONTENIDOS_FECHA: ContenidoFecha[] = [
  { id: 'post', label: 'Post', emoji: '📸' },
  { id: 'reel', label: 'Reel', emoji: '🎬' },
  { id: 'carrusel', label: 'Carrusel', emoji: '🎠' },
  { id: 'historia', label: 'Historia', emoji: '📱' },
  { id: 'video', label: 'Video', emoji: '🎥' },
  { id: 'por_definir', label: 'Por definir', emoji: '▫️' },
]

export function contenidoInfo(id: string | null | undefined): ContenidoFecha | null {
  if (!id) return null
  return CONTENIDOS_FECHA.find((c) => c.id === id) ?? null
}
