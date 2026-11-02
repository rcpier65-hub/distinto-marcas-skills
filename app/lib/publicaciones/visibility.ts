type PublicationContent = {
  tipo_contenido?: string[] | null
  es_tarea_diseno?: boolean | null
}

const PUBLIC_TYPES = new Set(['POST', 'CARRUSEL', 'HISTORIA', 'STORY', 'STORIES', 'REEL', 'REELS', 'VIDEO'])

/** Completing a design task does not make an internal deliverable publishable. */
export function isPublishableContent(row: PublicationContent): boolean {
  const types = (row.tipo_contenido ?? []).map((type) => type.trim().toUpperCase())
  if (types.some((type) => type === 'INTERNO' || type === 'POST INTERNO')) return false
  // Older standalone designs have no type. Keep ordinary video/publication
  // records, including those predating the content-type field, visible.
  return !row.es_tarea_diseno || types.some((type) => PUBLIC_TYPES.has(type))
}
