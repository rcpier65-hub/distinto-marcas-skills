// app/lib/mock-editor.ts
//
// Mock data para /editor mientras conectamos Supabase real.
// Estructura idéntica a las columnas del screenshot de Notion que
// Pedro pidió replicar. Cuando la app esté en Vercel con env vars
// Supabase, /editor/page.tsx prefiere data real; el mock solo se
// usa como fallback en dev local.

import { MARCAS_NAV } from '@/lib/mock-marcas'

export type EstadoPub = 'editar' | 'aprobar' | 'programar' | 'publicar' | 'publicado' | 'borrador'

export type EditorMock = {
  id: string
  nombre: string
  color: string   /* hex o var, para el chip */
}

export type EditorEntryMock = {
  id: string
  marcaSlug: string
  nombreTarea: string
  editorId: string | null
  grillaFit: string          /* ISO YYYY-MM-DD */
  estado: EstadoPub
  fechaEdicion: string       /* ISO YYYY-MM-DD */
  plataformas: string[]      /* ['IG', 'FB', 'TT'] */
}

/* Editores fijos del equipo Distinto. PIEER y Ruth son las 2 que
   aparecen en el screenshot de Pedro; agrego algunas más realistas. */
export const EDITORES_MOCK: EditorMock[] = [
  { id: 'ed1', nombre: 'PIEER',  color: '#737373' },   /* gris (default Notion) */
  { id: 'ed2', nombre: 'Ruth',   color: '#a78bfa' },   /* lavender */
  { id: 'ed3', nombre: 'Camila', color: '#fb7185' },   /* rosa */
  { id: 'ed4', nombre: 'Diego',  color: '#60a5fa' },   /* azul */
  { id: 'ed5', nombre: 'Pedro',  color: '#fbbf24' },   /* amber */
]

/* Mock entries — copiando las visibles del screenshot + extras realistas
   para llenar la tabla y mostrar variedad de estados/editores. */
export const EDITOR_ENTRIES_MOCK: EditorEntryMock[] = [
  // Las del screenshot (La Victoria + Manrique en estado Editar)
  { id: 'pub1', marcaSlug: 'lavictoria', nombreTarea: '3. UBICACIÓN',           editorId: 'ed1', grillaFit: '2026-05-29', estado: 'editar',   fechaEdicion: '2026-05-20', plataformas: ['IG', 'FB'] },
  { id: 'pub2', marcaSlug: 'lavictoria', nombreTarea: '5. DISTRIBUIDORA PINO',  editorId: 'ed1', grillaFit: '2026-05-31', estado: 'editar',   fechaEdicion: '2026-05-15', plataformas: ['IG', 'FB', 'TT'] },
  { id: 'pub3', marcaSlug: 'lavictoria', nombreTarea: 'LO QUE NECESITO',        editorId: 'ed2', grillaFit: '2026-05-26', estado: 'editar',   fechaEdicion: '2026-05-26', plataformas: ['IG'] },
  { id: 'pub4', marcaSlug: 'manrique',   nombreTarea: '13. TDAH NIÑAS',         editorId: 'ed1', grillaFit: '2026-06-26', estado: 'editar',   fechaEdicion: '2026-06-06', plataformas: ['IG', 'TT'] },
  { id: 'pub5', marcaSlug: 'manrique',   nombreTarea: '11. INTERÉS',            editorId: null,  grillaFit: '2026-06-22', estado: 'editar',   fechaEdicion: '2026-06-08', plataformas: ['IG'] },
  { id: 'pub6', marcaSlug: 'manrique',   nombreTarea: '10. PROBABILIDADES',     editorId: 'ed1', grillaFit: '2026-06-20', estado: 'editar',   fechaEdicion: '2026-06-05', plataformas: ['FB'] },
  { id: 'pub7', marcaSlug: 'manrique',   nombreTarea: '9. TERAPIAS PADRES',     editorId: 'ed1', grillaFit: '2026-06-18', estado: 'editar',   fechaEdicion: '2026-06-05', plataformas: ['IG', 'FB'] },
  { id: 'pub8', marcaSlug: 'manrique',   nombreTarea: '8. NOTAS BAJAS',         editorId: 'ed1', grillaFit: '2026-06-16', estado: 'editar',   fechaEdicion: '2026-06-04', plataformas: ['IG', 'TT'] },
  // Otros estados para mostrar variedad de chips
  { id: 'pub9',  marcaSlug: 'manrique',     nombreTarea: '7. ANSIEDAD INFANTIL',   editorId: 'ed3', grillaFit: '2026-06-14', estado: 'aprobar',   fechaEdicion: '2026-06-02', plataformas: ['IG', 'FB', 'TT'] },
  { id: 'pub10', marcaSlug: 'lozano',       nombreTarea: 'Carrusel closets premium', editorId: 'ed2', grillaFit: '2026-06-12', estado: 'aprobar',   fechaEdicion: '2026-06-01', plataformas: ['IG'] },
  { id: 'pub11', marcaSlug: 'kintu',        nombreTarea: 'Aceite romero — reel',     editorId: 'ed4', grillaFit: '2026-06-10', estado: 'programar', fechaEdicion: '2026-05-30', plataformas: ['IG', 'TT'] },
  { id: 'pub12', marcaSlug: 'distrifitness',nombreTarea: 'Rack squat con polea',     editorId: 'ed5', grillaFit: '2026-06-08', estado: 'programar', fechaEdicion: '2026-05-28', plataformas: ['IG', 'FB'] },
  { id: 'pub13', marcaSlug: 'littlejoe',    nombreTarea: 'Margherita signature',     editorId: 'ed3', grillaFit: '2026-06-06', estado: 'publicar',  fechaEdicion: '2026-05-25', plataformas: ['IG', 'TT'] },
  { id: 'pub14', marcaSlug: 'novalamps',    nombreTarea: 'Downlight slim 9W',        editorId: 'ed4', grillaFit: '2026-06-04', estado: 'publicar',  fechaEdicion: '2026-05-22', plataformas: ['IG', 'FB'] },
  { id: 'pub15', marcaSlug: 'warriorsupps', nombreTarea: 'Whey isolate 5lb',         editorId: 'ed5', grillaFit: '2026-06-02', estado: 'publicado', fechaEdicion: '2026-05-20', plataformas: ['IG'] },
  { id: 'pub16', marcaSlug: 'oralbeauty',   nombreTarea: 'Blanqueamiento dental',    editorId: 'ed2', grillaFit: '2026-05-30', estado: 'publicado', fechaEdicion: '2026-05-18', plataformas: ['IG', 'TT'] },
]

/* Helpers para la UI */
export const ESTADO_CONFIG: Record<EstadoPub, { label: string; color: string; bg: string }> = {
  editar:    { label: 'Editar',    color: '#f2c94c', bg: 'rgba(242, 201, 76, 0.12)' },
  aprobar:   { label: 'Aprobar',   color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  programar: { label: 'Programar', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  publicar:  { label: 'Publicar',  color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)' },
  publicado: { label: 'Publicado', color: '#737373', bg: 'rgba(255, 255, 255, 0.06)' },
  borrador:  { label: 'Borrador',  color: '#737373', bg: 'rgba(255, 255, 255, 0.04)' },
}

export function marcaDisplay(slug: string) {
  return MARCAS_NAV.find((m) => m.slug === slug)
}

export function formatDateES(iso: string) {
  /* "2026-05-29" → "29 may 2026" — compacto Linear-style, NO "29 de mayo de 2026" */
  const d = new Date(iso + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}
