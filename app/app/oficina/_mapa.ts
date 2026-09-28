// Geometría, zonas y asientos compartidos por la escena 3D, navegación y API.
export const MAPA_W = 40   // tiles → 1280 px
export const MAPA_H = 26   // tiles →  832 px

export type Rect = { x: number; y: number; w: number; h: number }

export type Zona = Rect & {
  id: string
  nombre: string
  color: string
  emoji: string
}

export type MuebleTipo =
  | 'escritorio' | 'mesa' | 'silla' | 'sofa' | 'planta' | 'pizarra' | 'tv'
  | 'cocina' | 'estante' | 'alfombra' | 'recepcion' | 'camara' | 'luz' | 'fondo'

export type Mueble = Rect & {
  tipo: MuebleTipo
  dir?: 'n' | 's' | 'e' | 'o'   // hacia dónde mira (sillas, cámaras)
  label?: string                 // nombre del puesto (escritorios)
  /* Objeto interactivo: al acercarse aparece "Presiona X". */
  accion?: { titulo: string; href: string; icono: string }
  color?: string
  compartido?: boolean // monitor de un puesto sobre una mesa compartida
  puesto?: string // vínculo explícito entre asiento y escritorio
}

/* ===================== PAREDES ===================== */
export const PAREDES: Rect[] = [
  // Perímetro
  { x: 0, y: 0, w: MAPA_W, h: 1 },
  { x: 0, y: MAPA_H - 1, w: MAPA_W, h: 1 },
  { x: 0, y: 0, w: 1, h: MAPA_H },
  { x: MAPA_W - 1, y: 0, w: 1, h: MAPA_H },
  // Sala de juntas (arriba-izquierda)
  { x: 12, y: 1, w: 1, h: 9 },
  { x: 1, y: 9, w: 12, h: 1 },
  // Estudio de grabación (arriba-derecha)
  { x: 27, y: 1, w: 1, h: 9 },
  { x: 27, y: 9, w: 12, h: 1 },
  // Diseño (derecha-abajo)
  { x: 27, y: 12, w: 1, h: 6 },
  { x: 27, y: 17, w: 12, h: 1 },
  // Gerencia
  { x: 27, y: 18, w: 12, h: 1 },
  { x: 27, y: 18, w: 1, h: 7 },
  // Lounge / cocina (abajo-izquierda)
  { x: 1, y: 15, w: 12, h: 1 },
  { x: 12, y: 15, w: 1, h: 10 },
]

/* Huecos de puerta: se restan de las paredes. */
export const PUERTAS: Rect[] = [
  { x: 6, y: 9, w: 2, h: 1 },    // juntas
  { x: 32, y: 9, w: 2, h: 1 },   // estudio
  { x: 27, y: 13, w: 1, h: 2 },  // diseño
  { x: 6, y: 15, w: 2, h: 1 },
  { x: 27, y: 21, w: 1, h: 2 },   // lounge
]

/* ===================== ZONAS PRIVADAS ===================== */
export const ZONAS: Zona[] = [
  { id: 'gerencia', nombre: 'Gerencia', x: 28, y: 19, w: 11, h: 6, color: '#728fae', emoji: '💼' },
  { id: 'juntas',  nombre: 'Sala de Juntas',        x: 1,  y: 1,  w: 11, h: 8, color: '#a99bef', emoji: '🤝' },
  { id: 'estudio', nombre: 'Estudio de Grabación',  x: 28, y: 1,  w: 11, h: 8, color: '#7eafd0', emoji: '🎥' },
  { id: 'diseno',  nombre: 'Ideas & diseño',                x: 28, y: 12, w: 11, h: 5, color: '#d5aa84', emoji: '🎨' },
  { id: 'lounge',  nombre: 'Lounge & Cocina',       x: 1,  y: 16, w: 11, h: 8, color: '#80aea2', emoji: '☕' },
]

/* ===================== MUEBLES ===================== */
/** Dos islas compartidas conservan los siete puestos del equipo. */
const islas: Mueble[] = [4, 9].flatMap((y, fila) => {
  const nombres = fila === 0 ? ['Erick', 'Lorena', 'Pieer'] : ['Feling', 'Paolo', 'Ailyn']
  return [
    { tipo: 'mesa', x: 15, y, w: 9, h: 1, color: '#e4d0b0' } as Mueble,
    ...nombres.flatMap((label, i): Mueble[] => [
      { tipo: 'escritorio', x: 15 + i * 3, y, w: 3, h: 1, label, compartido: true },
      { tipo: 'silla', x: 16 + i * 3, y: y + 1, w: 1, h: 1, dir: 'n', puesto: label },
    ]),
  ]
})
export const MUEBLES: Mueble[] = [
  ...islas,
  { tipo: 'planta', x: 14, y: 2, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 2, w: 1, h: 1 },
  { tipo: 'planta', x: 14, y: 11, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 11, w: 1, h: 1 },
  // Juntas: seis sillas orientadas al centro de una mesa ovalada.
  { tipo: 'mesa', x: 4, y: 3, w: 5, h: 3, color: '#e4d0b0' },
  ...[5, 7].flatMap((x): Mueble[] => [
    { tipo: 'silla', x, y: 2, w: 1, h: 1, dir: 's' },
    { tipo: 'silla', x, y: 6, w: 1, h: 1, dir: 'n' },
  ]),
  { tipo: 'silla', x: 3, y: 4, w: 1, h: 1, dir: 'e' },
  { tipo: 'silla', x: 9, y: 4, w: 1, h: 1, dir: 'o' },
  { tipo: 'tv', x: 4, y: 1, w: 5, h: 1, accion: { titulo: 'Abrir sala de video', href: '/reunion', icono: '📹' } },
  { tipo: 'planta', x: 10, y: 7, w: 1, h: 1 },
  // Estudio despejado, con iluminación y fondo curvo.
  { tipo: 'fondo', x: 30, y: 1, w: 7, h: 1 },
  { tipo: 'camara', x: 33, y: 5, w: 1, h: 1, dir: 'n' },
  { tipo: 'luz', x: 30, y: 4, w: 1, h: 1 },
  { tipo: 'luz', x: 36, y: 4, w: 1, h: 1 },
  { tipo: 'tv', x: 37, y: 7, w: 1, h: 1, accion: { titulo: 'Ver grabaciones', href: '/grabaciones', icono: '🎬' } },
  // Salón creativo y lounge: asientos utilizables, no obstáculos sólidos.
  { tipo: 'sofa', x: 30, y: 14, w: 6, h: 2, dir: 'n', color: '#ad9cc4' },
  { tipo: 'pizarra', x: 31, y: 12, w: 4, h: 1, accion: { titulo: 'Ver tareas de diseño', href: '/diseno', icono: '🎨' } },
  { tipo: 'planta', x: 37, y: 15, w: 1, h: 1 },
  { tipo: 'cocina', x: 2, y: 16, w: 3, h: 1 },
  { tipo: 'estante', x: 9, y: 16, w: 3, h: 1 },
  { tipo: 'sofa', x: 3, y: 19, w: 7, h: 2, dir: 's', color: '#83a99c' },
  { tipo: 'mesa', x: 5, y: 22, w: 3, h: 1, color: '#e3d4bd' },
  { tipo: 'planta', x: 10, y: 23, w: 1, h: 1 },
  // Gerencia: mesa propia, silla centrada y orientada al monitor.
  { tipo: 'escritorio', x: 30, y: 20, w: 7, h: 1, label: 'Pedro', color: '#d5ba92' },
  { tipo: 'silla', x: 33, y: 21, w: 1, h: 1, dir: 'n', puesto: 'Pedro', color: '#334b56' },
  { tipo: 'planta', x: 37, y: 23, w: 1, h: 1 },
  // Atrio: recepción ligera y una zona de espera curvada.
  { tipo: 'recepcion', x: 17, y: 17, w: 5, h: 1 },
  { tipo: 'silla', x: 19, y: 16, w: 1, h: 1, dir: 's' },
  { tipo: 'sofa', x: 16, y: 22, w: 7, h: 2, dir: 'n', color: '#849db9' },
  { tipo: 'planta', x: 14, y: 17, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 22, w: 1, h: 1 },
]

/** Un asiento define a la vez su posición visible y el destino de navegación. */
export type Asiento = { x: number; y: number; dir: 'n' | 's' | 'e' | 'o'; puesto?: string }
export function asientosDe(m: Mueble): Asiento[] {
  if (m.tipo === 'silla') return [{ x: m.x + m.w / 2, y: m.y + m.h / 2, dir: m.dir ?? 's', puesto: m.puesto }]
  if (m.tipo !== 'sofa') return []
  const dir = m.dir ?? 's'
  if (dir === 'n' || dir === 's') return Array.from({ length: m.w - 2 }, (_, i) => ({ x: m.x + i + 1.5, y: m.y + (dir === 'n' ? .5 : m.h - .5), dir }))
  return Array.from({ length: m.h - 2 }, (_, i) => ({ x: m.x + (dir === 'o' ? .5 : m.w - .5), y: m.y + i + 1.5, dir }))
}
export const ASIENTOS = MUEBLES.flatMap(asientosDe)

/* Punto de aparición: la recepción. */
export const SPAWN = { x: 20, y: 20 }

/* ===================== COLISIONES ===================== */
/* Muebles que NO bloquean el paso (se puede caminar encima). */
const PASABLES = new Set<MuebleTipo>(['alfombra', 'silla'])

export function construirColisiones(): Uint8Array {
  const grid = new Uint8Array(MAPA_W * MAPA_H)
  const marcar = (r: Rect, v: number) => {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x >= 0 && x < MAPA_W && y >= 0 && y < MAPA_H) grid[y * MAPA_W + x] = v
      }
    }
  }
  for (const p of PAREDES) marcar(p, 1)
  for (const p of PUERTAS) marcar(p, 0)   // los huecos de puerta se abren
  for (const m of MUEBLES) if (!PASABLES.has(m.tipo)) marcar(m, 1)
  for (const asiento of ASIENTOS) marcar({ x: Math.floor(asiento.x), y: Math.floor(asiento.y), w: 1, h: 1 }, 0)
  return grid
}

export function esSolido(grid: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAPA_W || y >= MAPA_H) return true
  return grid[Math.floor(y) * MAPA_W + Math.floor(x)] === 1
}

/** Zona privada que contiene ese punto (o null si es área común). */
export function zonaDe(x: number, y: number): Zona | null {
  for (const z of ZONAS) {
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z
  }
  return null
}

/** Objeto interactivo a ≤1 tile (distancia Chebyshev, como Gather). */
export function objetoCerca(x: number, y: number): Mueble | null {
  for (const m of MUEBLES) {
    if (!m.accion) continue
    const dx = Math.max(m.x - x, 0, x - (m.x + m.w - 1))
    const dy = Math.max(m.y - y, 0, y - (m.y + m.h - 1))
    if (Math.max(dx, dy) <= 1.4) return m
  }
  return null
}
