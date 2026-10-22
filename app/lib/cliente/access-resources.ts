// Public destinations only. Credentials never belong in this module.
export const clientResources = [
  { id: 'catalogos', label: 'Actualizar catálogos', url: 'https://typhouse.pe/pages/gestion-catalogos' },
  { id: 'reclamos', label: 'Gestionar Libro de Reclamaciones', url: 'https://typhouse.pe/pages/gestion-reclamos' },
] as const
export type ClientResource = (typeof clientResources)[number]
