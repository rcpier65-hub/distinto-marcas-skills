// app/lib/mock-publicaciones.ts
//
// Mock data para /publicaciones (Calendario + Listado) mientras
// conectamos Supabase real. Estructura inspirada en el screenshot
// Metricool que Pedro pidió replicar — Pendiente/Publicado/Error
// son estados de PUBLICACIÓN (no workflow editorial).

import { EDITORES_MOCK } from '@/lib/mock-editor'

export type EstadoPubMetricool =
  | 'pendiente'   /* programado, esperando hora de publicación */
  | 'publicando'  /* en proceso de subir a la red */
  | 'publicado'   /* ya está en la red social */
  | 'error'       /* Metricool falló al publicar */
  | 'borrador'    /* sin programar todavía */

export type Red = 'instagram' | 'facebook' | 'tiktok' | 'linkedin'

export type TipoContenido = 'reel' | 'post' | 'carrusel' | 'story' | 'video'

export type PublicacionMock = {
  id: string
  marcaSlug: string
  fecha: string             /* ISO 2026-06-10 */
  hora: string              /* 20:00 */
  caption: string
  thumbnail: string | null  /* path o null si no hay */
  redes: Red[]
  tipo: TipoContenido
  estado: EstadoPubMetricool
  editorId: string | null
  editorNombre?: string | null   /* nombre real del editor desde BD (JOIN) */
  /* Indicadores de workflow (checklist del detalle). Se reflejan como
     iconos en la grilla: plomo = pendiente, verde = listo. */
  copyListo?: boolean
  portadaLista?: boolean
  editado?: boolean
}

/* Colores de estado Metricool-style (suaves para chip) */
export const ESTADO_PUB_CONFIG: Record<EstadoPubMetricool, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',  color: '#5eead4', bg: 'rgba(94, 234, 212, 0.12)' },  /* teal — igual al screenshot Metricool */
  publicando: { label: 'Publicando', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
  publicado:  { label: 'Publicado',  color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)' },
  error:      { label: 'Error',      color: '#eb5757', bg: 'rgba(235, 87, 87, 0.12)' },
  borrador:   { label: 'Borrador',   color: '#737373', bg: 'rgba(255, 255, 255, 0.04)' },
}

export const RED_CONFIG: Record<Red, { label: string; color: string; emoji: string }> = {
  instagram: { label: 'Instagram', color: '#e1306c', emoji: '📷' },
  facebook:  { label: 'Facebook',  color: '#1877f2', emoji: '👍' },
  tiktok:    { label: 'TikTok',    color: '#ff0050', emoji: '🎵' },
  linkedin:  { label: 'LinkedIn',  color: '#0a66c2', emoji: '💼' },
}

/* ============================================================
   MOCK ENTRIES — 38 publicaciones spread entre may–jul 2026
   con todas las marcas, redes, estados y editores para mostrar
   variedad visual en Listado y Calendario.
   ============================================================ */

function makeEntry(
  id: string,
  marcaSlug: string,
  fecha: string,
  hora: string,
  caption: string,
  redes: Red[],
  tipo: TipoContenido,
  estado: EstadoPubMetricool,
  editorIdx: number | null = null,
): PublicacionMock {
  return {
    id,
    marcaSlug,
    fecha,
    hora,
    caption,
    thumbnail: null,
    redes,
    tipo,
    estado,
    editorId: editorIdx !== null ? EDITORES_MOCK[editorIdx].id : null,
  }
}

export const PUBLICACIONES_MOCK: PublicacionMock[] = [
  // Mayo 26-31 (semana actual + cerca)
  makeEntry('p1',  'manrique',      '2026-05-26', '18:30', 'Detrás de tu niño TDAH hay emociones que aún no sabe gestionar',  ['instagram', 'facebook'], 'reel',     'pendiente', 0),
  makeEntry('p2',  'lozano',        '2026-05-26', '19:00', 'Closet a medida para depto pequeño en Surco',                       ['instagram'],             'carrusel', 'pendiente', 1),
  makeEntry('p3',  'distrifitness', '2026-05-27', '11:00', 'Rack squat con polea — el complemento que tu box necesita 💪',      ['instagram', 'facebook', 'tiktok'], 'reel', 'pendiente', 4),
  makeEntry('p4',  'kintu',         '2026-05-27', '09:30', 'Aceite de rosa mosqueta — ritual nocturno',                         ['instagram'],             'post',     'publicado', 3),
  makeEntry('p5',  'novalamps',     '2026-05-28', '15:00', 'Downlight slim 9W — perfecta para cocinas pequeñas',                ['instagram', 'facebook'], 'post',     'pendiente', 3),
  makeEntry('p6',  'littlejoe',     '2026-05-28', '20:00', 'Pizza margherita signature — masa madre fermentada 48h 🍕',          ['instagram', 'tiktok'],   'reel',     'publicado', 2),
  makeEntry('p7',  'lavictoria',    '2026-05-29', '10:00', 'Tablones MDF certificado para mueblerías',                          ['facebook'],              'post',     'pendiente', 0),
  makeEntry('p8',  'oralbeauty',    '2026-05-29', '17:00', 'Blanqueamiento dental en 1 sesión',                                 ['instagram'],             'reel',     'pendiente', 1),
  makeEntry('p9',  'warriorsupps',  '2026-05-30', '08:00', 'Whey isolate 5lb — el más puro del mercado',                        ['instagram', 'facebook'], 'post',     'publicando', 4),
  makeEntry('p10', 'manrique',      '2026-05-30', '18:00', 'Pruebas TDAH en 3 sesiones cortas — sin agotar al peque',           ['instagram'],             'reel',     'pendiente', 0),
  makeEntry('p11', 'lozano',        '2026-05-31', '12:00', 'Showroom San Juan de Lurigancho — agenda tu visita',                ['instagram', 'facebook'], 'carrusel', 'borrador',  null),

  // Junio
  makeEntry('p12', 'kintu',         '2026-06-01', '09:00', 'Aceite romero — caída del cabello',                                 ['instagram', 'tiktok'],   'reel',     'pendiente', 3),
  makeEntry('p13', 'distrifitness', '2026-06-02', '16:00', 'Mancuernas hexagonales — pack 2.5kg al 25kg',                       ['instagram'],             'post',     'pendiente', 4),
  makeEntry('p14', 'novalamps',     '2026-06-02', '20:00', 'Pendant industrial — bar y restaurantes',                            ['instagram', 'facebook'], 'post',     'borrador',  null),
  makeEntry('p15', 'littlejoe',     '2026-06-03', '20:30', 'Carbonara romana auténtica — guanciale + pecorino',                  ['instagram', 'tiktok'],   'video',    'pendiente', 2),
  makeEntry('p16', 'manrique',      '2026-06-03', '18:00', 'Padres preguntan: ¿es TDAH o solo es activo? La diferencia clínica', ['instagram', 'facebook'], 'reel',     'pendiente', 0),
  makeEntry('p17', 'lavictoria',    '2026-06-04', '10:00', 'Triplay marino para construcción húmeda',                            ['facebook'],              'post',     'error',     0),
  makeEntry('p18', 'warriorsupps',  '2026-06-05', '08:30', 'Creatina monohidratada — la verdad detrás del mito',                 ['instagram', 'tiktok'],   'reel',     'pendiente', 4),
  makeEntry('p19', 'oralbeauty',    '2026-06-05', '17:00', 'Carillas dentales — diseño tu sonrisa',                              ['instagram'],             'carrusel', 'pendiente', 1),
  makeEntry('p20', 'lozano',        '2026-06-06', '11:00', 'Mesa de centro estilo japandi — roble macizo',                       ['instagram', 'facebook'], 'carrusel', 'pendiente', 1),
  makeEntry('p21', 'kintu',         '2026-06-07', '09:00', 'Aceite lavanda — relax y descanso',                                  ['instagram'],             'post',     'borrador',  null),
  makeEntry('p22', 'distrifitness', '2026-06-08', '16:00', 'Banda elástica long loop — mejor compañera de viaje',                ['instagram', 'tiktok'],   'reel',     'pendiente', 4),
  makeEntry('p23', 'manrique',      '2026-06-08', '18:30', 'Evaluación neuropsicológica — qué evalúa y para qué sirve',          ['facebook'],              'video',    'pendiente', 0),
  makeEntry('p24', 'littlejoe',     '2026-06-09', '20:00', 'Tiramisú clásico con mascarpone italiano',                           ['instagram'],             'post',     'pendiente', 2),
  makeEntry('p25', 'novalamps',     '2026-06-10', '20:00', 'Lámpara colgante minimal — comedor',                                 ['instagram', 'facebook'], 'carrusel', 'pendiente', 3),
  makeEntry('p26', 'lozano',        '2026-06-10', '20:00', 'Vestidor a medida — antes y después',                                ['instagram'],             'carrusel', 'pendiente', 1),
  makeEntry('p27', 'lavictoria',    '2026-06-10', '20:00', 'Cómo elegir madera según el clima de tu zona',                       ['facebook', 'instagram'], 'post',     'pendiente', 0),
  makeEntry('p28', 'warriorsupps',  '2026-06-11', '08:00', 'BCAA 2:1:1 — recuperación post-entreno',                              ['instagram'],             'reel',     'pendiente', 4),
  makeEntry('p29', 'oralbeauty',    '2026-06-12', '17:00', 'Ortodoncia invisible — sin brackets',                                ['instagram', 'tiktok'],   'reel',     'borrador',  null),
  makeEntry('p30', 'kintu',         '2026-06-13', '09:30', 'Aceite árbol de té — acné adulto',                                   ['instagram'],             'reel',     'pendiente', 3),
  makeEntry('p31', 'distrifitness', '2026-06-15', '11:00', 'Bicicleta spinning pro — para gym o casa',                           ['instagram', 'facebook'], 'video',    'pendiente', 4),
  makeEntry('p32', 'manrique',      '2026-06-16', '18:00', 'Notas bajas no es flojera — qué puede estar pasando',                ['instagram', 'tiktok'],   'reel',     'pendiente', 0),
  makeEntry('p33', 'littlejoe',     '2026-06-17', '20:30', 'Nuevo plato: gnocchi de papa con salsa al pesto',                    ['instagram'],             'post',     'pendiente', 2),
  makeEntry('p34', 'lozano',        '2026-06-18', '12:00', 'Despacho ejecutivo — proyecto entregado',                            ['instagram', 'facebook'], 'carrusel', 'pendiente', 1),
  makeEntry('p35', 'novalamps',     '2026-06-20', '15:00', 'Spot LED empotrable — sala TV',                                      ['instagram'],             'post',     'borrador',  null),
  makeEntry('p36', 'manrique',      '2026-06-22', '18:30', '¿Tu hijo muestra interés selectivo? Señales tempranas TEA',          ['instagram', 'facebook'], 'reel',     'pendiente', 0),
  makeEntry('p37', 'lavictoria',    '2026-06-25', '10:00', 'Catálogo julio — descargá el PDF',                                   ['facebook'],              'post',     'borrador',  null),
  makeEntry('p38', 'distrifitness', '2026-06-27', '16:00', 'Vinilo olímpico — equipá tu box pro',                                ['instagram', 'tiktok'],   'reel',     'pendiente', 4),
]
