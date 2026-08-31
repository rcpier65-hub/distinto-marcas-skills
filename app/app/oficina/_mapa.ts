// app/app/oficina/_mapa.ts
//
// MAPA de la oficina virtual de Distinto — inspirado en Gather.town.
// Grilla de tiles de 32px (misma medida que Gather), vista cenital 3/4.
//
// El mapa se define por RECTÁNGULOS (paredes, muebles, zonas) en vez de
// ASCII art: es más fácil de mantener y no se desalinea. La grilla de
// colisión se construye a partir de ellos al cargar.
//
// Zonas privadas ("private areas" de Gather): quien está dentro se conecta
// con todos los de la zona sin importar la distancia, y nadie de afuera
// escucha. Es lo que hace que una sala de juntas se sienta como una sala.

export const TILE = 32
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
}

/* ===================== PAREDES ===================== */
const PAREDES: Rect[] = [
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
  // Lounge / cocina (abajo-izquierda)
  { x: 1, y: 15, w: 12, h: 1 },
  { x: 12, y: 15, w: 1, h: 10 },
]

/* Huecos de puerta: se restan de las paredes. */
const PUERTAS: Rect[] = [
  { x: 6, y: 9, w: 2, h: 1 },    // juntas
  { x: 32, y: 9, w: 2, h: 1 },   // estudio
  { x: 27, y: 13, w: 1, h: 2 },  // diseño
  { x: 6, y: 15, w: 2, h: 1 },   // lounge
]

/* ===================== ZONAS PRIVADAS ===================== */
export const ZONAS: Zona[] = [
  { id: 'juntas',  nombre: 'Sala de Juntas',        x: 1,  y: 1,  w: 11, h: 8, color: '#7170ff', emoji: '🤝' },
  { id: 'estudio', nombre: 'Estudio de Grabación',  x: 28, y: 1,  w: 11, h: 8, color: '#ef4444', emoji: '🎥' },
  { id: 'diseno',  nombre: 'Diseño',                x: 28, y: 12, w: 11, h: 5, color: '#8b5cf6', emoji: '🎨' },
  { id: 'lounge',  nombre: 'Lounge & Cocina',       x: 1,  y: 16, w: 11, h: 8, color: '#10b981', emoji: '☕' },
]

/* ===================== MUEBLES ===================== */
export const MUEBLES: Mueble[] = [
  /* --- Sala de juntas --- */
  { tipo: 'alfombra', x: 2, y: 2, w: 9, h: 6, color: '#e9e7ff' },
  { tipo: 'mesa', x: 4, y: 3, w: 5, h: 3 },
  { tipo: 'silla', x: 4, y: 2, w: 1, h: 1, dir: 's' },
  { tipo: 'silla', x: 6, y: 2, w: 1, h: 1, dir: 's' },
  { tipo: 'silla', x: 8, y: 2, w: 1, h: 1, dir: 's' },
  { tipo: 'silla', x: 4, y: 6, w: 1, h: 1, dir: 'n' },
  { tipo: 'silla', x: 6, y: 6, w: 1, h: 1, dir: 'n' },
  { tipo: 'silla', x: 8, y: 6, w: 1, h: 1, dir: 'n' },
  { tipo: 'silla', x: 3, y: 4, w: 1, h: 1, dir: 'e' },
  { tipo: 'silla', x: 9, y: 4, w: 1, h: 1, dir: 'o' },
  {
    tipo: 'pizarra', x: 2, y: 1, w: 3, h: 1,
    accion: { titulo: 'Abrir la sala de video del equipo', href: '/reunion', icono: '📹' },
  },
  {
    tipo: 'tv', x: 9, y: 1, w: 2, h: 1,
    accion: { titulo: 'Ver el calendario de la semana', href: '/grabaciones/calendario', icono: '📅' },
  },
  { tipo: 'planta', x: 11, y: 8, w: 1, h: 1 },

  /* --- Estudio de grabación --- */
  { tipo: 'alfombra', x: 29, y: 2, w: 9, h: 6, color: '#ffe9e9' },
  { tipo: 'fondo', x: 29, y: 1, w: 5, h: 1 },
  { tipo: 'camara', x: 33, y: 5, w: 1, h: 1, dir: 'o' },
  { tipo: 'luz', x: 31, y: 6, w: 1, h: 1 },
  { tipo: 'luz', x: 35, y: 3, w: 1, h: 1 },
  { tipo: 'mesa', x: 35, y: 5, w: 3, h: 2 },
  { tipo: 'silla', x: 36, y: 7, w: 1, h: 1, dir: 'n' },
  {
    tipo: 'tv', x: 36, y: 1, w: 2, h: 1,
    accion: { titulo: 'Ver las grabaciones programadas', href: '/grabaciones', icono: '🎬' },
  },
  { tipo: 'planta', x: 29, y: 8, w: 1, h: 1 },

  /* --- Open space (escritorios del equipo) --- */
  { tipo: 'alfombra', x: 14, y: 2, w: 12, h: 9, color: '#f2f4f8' },
  { tipo: 'escritorio', x: 15, y: 3, w: 2, h: 1, label: 'Pedro',  dir: 's' },
  { tipo: 'silla', x: 15, y: 4, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 19, y: 3, w: 2, h: 1, label: 'Erick',  dir: 's' },
  { tipo: 'silla', x: 19, y: 4, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 23, y: 3, w: 2, h: 1, label: 'Lorena', dir: 's' },
  { tipo: 'silla', x: 23, y: 4, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 15, y: 8, w: 2, h: 1, label: 'Pieer',  dir: 's' },
  { tipo: 'silla', x: 15, y: 9, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 19, y: 8, w: 2, h: 1, label: 'Feling', dir: 's' },
  { tipo: 'silla', x: 19, y: 9, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 23, y: 8, w: 2, h: 1, label: 'Paolo',  dir: 's' },
  { tipo: 'silla', x: 23, y: 9, w: 1, h: 1, dir: 'n' },
  { tipo: 'planta', x: 14, y: 1, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 1, w: 1, h: 1 },

  /* --- Diseño --- */
  { tipo: 'alfombra', x: 29, y: 13, w: 9, h: 4, color: '#f3ecff' },
  { tipo: 'escritorio', x: 30, y: 14, w: 2, h: 1, label: 'Ailyn', dir: 's' },
  { tipo: 'silla', x: 30, y: 15, w: 1, h: 1, dir: 'n' },
  { tipo: 'escritorio', x: 34, y: 14, w: 2, h: 1, dir: 's' },
  { tipo: 'silla', x: 34, y: 15, w: 1, h: 1, dir: 'n' },
  {
    tipo: 'pizarra', x: 29, y: 12, w: 3, h: 1,
    accion: { titulo: 'Ver las tareas de diseño', href: '/diseno', icono: '🎨' },
  },
  { tipo: 'planta', x: 37, y: 16, w: 1, h: 1 },

  /* --- Lounge & cocina --- */
  { tipo: 'alfombra', x: 2, y: 17, w: 9, h: 6, color: '#e6f7f0' },
  { tipo: 'cocina', x: 1, y: 16, w: 4, h: 1 },
  { tipo: 'sofa', x: 3, y: 19, w: 3, h: 1, dir: 's' },
  { tipo: 'sofa', x: 8, y: 19, w: 3, h: 1, dir: 's' },
  { tipo: 'mesa', x: 5, y: 21, w: 4, h: 2 },
  { tipo: 'silla', x: 5, y: 20, w: 1, h: 1, dir: 's' },
  { tipo: 'silla', x: 8, y: 20, w: 1, h: 1, dir: 's' },
  { tipo: 'planta', x: 11, y: 23, w: 1, h: 1 },
  { tipo: 'planta', x: 1, y: 23, w: 1, h: 1 },
  { tipo: 'estante', x: 10, y: 16, w: 2, h: 1 },

  /* --- Recepción / plaza central --- */
  { tipo: 'alfombra', x: 15, y: 17, w: 10, h: 7, color: '#eef0ff' },
  { tipo: 'recepcion', x: 18, y: 18, w: 4, h: 1 },
  { tipo: 'sofa', x: 15, y: 22, w: 3, h: 1, dir: 'n' },
  { tipo: 'sofa', x: 22, y: 22, w: 3, h: 1, dir: 'n' },
  { tipo: 'planta', x: 14, y: 17, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 17, w: 1, h: 1 },
  { tipo: 'planta', x: 14, y: 24, w: 1, h: 1 },
  { tipo: 'planta', x: 25, y: 24, w: 1, h: 1 },
  {
    tipo: 'tv', x: 19, y: 24, w: 2, h: 1,
    accion: { titulo: 'Ir al inicio de la app', href: '/inicio', icono: '🏠' },
  },
]

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

/* ===================== DIBUJO DEL MAPA ===================== */
/* Se dibuja UNA vez a un canvas offscreen y luego se blitea cada frame:
   el mapa es estático, no tiene sentido repintarlo 60 veces por segundo. */

const C = {
  piso: '#f7f7fa',
  pisoLinea: 'rgba(0,0,0,0.035)',
  pared: '#cfd2e0',
  paredTop: '#e8eaf2',
  paredSombra: 'rgba(0,0,0,0.08)',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function dibujarMapa(ctx: CanvasRenderingContext2D) {
  const W = MAPA_W * TILE
  const H = MAPA_H * TILE

  // Piso
  ctx.fillStyle = C.piso
  ctx.fillRect(0, 0, W, H)

  // Alfombras de cada área (dan identidad a las salas)
  for (const m of MUEBLES) {
    if (m.tipo !== 'alfombra') continue
    ctx.fillStyle = m.color ?? '#eef0f5'
    roundRect(ctx, m.x * TILE, m.y * TILE, m.w * TILE, m.h * TILE, 10)
    ctx.fill()
  }

  // Rejilla sutil
  ctx.strokeStyle = C.pisoLinea
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= MAPA_W; x++) { ctx.moveTo(x * TILE + 0.5, 0); ctx.lineTo(x * TILE + 0.5, H) }
  for (let y = 0; y <= MAPA_H; y++) { ctx.moveTo(0, y * TILE + 0.5); ctx.lineTo(W, y * TILE + 0.5) }
  ctx.stroke()

  // Borde de color de cada zona privada + su nombre
  for (const z of ZONAS) {
    ctx.strokeStyle = `${z.color}55`
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    roundRect(ctx, z.x * TILE + 2, z.y * TILE + 2, z.w * TILE - 4, z.h * TILE - 4, 8)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = `${z.color}dd`
    ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${z.emoji} ${z.nombre}`, z.x * TILE + 8, z.y * TILE + 6)
  }

  // Paredes (con cara superior para dar volumen 3/4)
  const grid = construirColisiones()
  const esPared = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAPA_W || y >= MAPA_H) return false
    return PAREDES.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)
      && !PUERTAS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)
  }
  void grid
  for (let y = 0; y < MAPA_H; y++) {
    for (let x = 0; x < MAPA_W; x++) {
      if (!esPared(x, y)) continue
      const px = x * TILE, py = y * TILE
      ctx.fillStyle = C.pared
      ctx.fillRect(px, py, TILE, TILE)
      // Cara superior más clara si abajo no hay pared (efecto de altura)
      if (!esPared(x, y + 1)) {
        ctx.fillStyle = C.paredTop
        ctx.fillRect(px, py, TILE, TILE * 0.55)
        ctx.fillStyle = C.paredSombra
        ctx.fillRect(px, py + TILE - 4, TILE, 4)
      }
    }
  }

  // Muebles (los no-alfombra)
  for (const m of MUEBLES) {
    if (m.tipo === 'alfombra') continue
    dibujarMueble(ctx, m)
  }
}

function dibujarMueble(ctx: CanvasRenderingContext2D, m: Mueble) {
  const x = m.x * TILE, y = m.y * TILE, w = m.w * TILE, h = m.h * TILE
  ctx.save()
  switch (m.tipo) {
    case 'escritorio': {
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      roundRect(ctx, x + 2, y + 6, w - 4, h - 2, 5); ctx.fill()
      ctx.fillStyle = '#d8b28c'
      roundRect(ctx, x + 2, y + 3, w - 4, h - 6, 5); ctx.fill()
      // Monitor
      ctx.fillStyle = '#3f4256'
      roundRect(ctx, x + w / 2 - 11, y + 4, 22, 13, 3); ctx.fill()
      ctx.fillStyle = '#8fb8ff'
      roundRect(ctx, x + w / 2 - 9, y + 6, 18, 9, 2); ctx.fill()
      if (m.label) {
        ctx.fillStyle = 'rgba(10,10,10,0.5)'
        ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(m.label, x + w / 2, y + h - 8)
      }
      break
    }
    case 'mesa': {
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      roundRect(ctx, x + 3, y + 7, w - 6, h - 4, 8); ctx.fill()
      ctx.fillStyle = '#e2c9a8'
      roundRect(ctx, x + 3, y + 4, w - 6, h - 8, 8); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.5; ctx.stroke()
      break
    }
    case 'silla': {
      const cx = x + TILE / 2, cy = y + TILE / 2
      ctx.fillStyle = '#8b8fa8'
      roundRect(ctx, cx - 9, cy - 8, 18, 16, 5); ctx.fill()
      ctx.fillStyle = '#6f7490'
      // respaldo según orientación
      if (m.dir === 'n') roundRect(ctx, cx - 9, cy - 12, 18, 5, 3)
      else if (m.dir === 's') roundRect(ctx, cx - 9, cy + 7, 18, 5, 3)
      else if (m.dir === 'e') roundRect(ctx, cx + 7, cy - 9, 5, 18, 3)
      else roundRect(ctx, cx - 12, cy - 9, 5, 18, 3)
      ctx.fill()
      break
    }
    case 'sofa': {
      ctx.fillStyle = '#7a80a8'
      roundRect(ctx, x + 2, y + 5, w - 4, h - 8, 8); ctx.fill()
      ctx.fillStyle = '#8e94bd'
      roundRect(ctx, x + 5, y + 8, w - 10, h - 16, 5); ctx.fill()
      break
    }
    case 'planta': {
      const cx = x + TILE / 2, cy = y + TILE / 2
      ctx.fillStyle = '#c98f5f'
      roundRect(ctx, cx - 7, cy + 3, 14, 11, 3); ctx.fill()
      ctx.fillStyle = '#3f9d68'
      ctx.beginPath(); ctx.arc(cx, cy - 3, 10, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#4fb87c'
      ctx.beginPath(); ctx.arc(cx - 5, cy - 7, 6, 0, Math.PI * 2)
      ctx.arc(cx + 6, cy - 5, 5, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'pizarra': {
      ctx.fillStyle = '#e8eaf2'
      roundRect(ctx, x + 2, y + 6, w - 4, h + 10, 4); ctx.fill()
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, x + 5, y + 9, w - 10, h + 2, 3); ctx.fill()
      ctx.strokeStyle = '#7170ff'; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 10, y + 18); ctx.lineTo(x + 22, y + 14)
      ctx.moveTo(x + 10, y + 24); ctx.lineTo(x + 30, y + 22)
      ctx.stroke()
      break
    }
    case 'tv': {
      ctx.fillStyle = '#2b2e3f'
      roundRect(ctx, x + 2, y + 6, w - 4, h + 12, 4); ctx.fill()
      ctx.fillStyle = '#5aa9ff'
      roundRect(ctx, x + 5, y + 9, w - 10, h + 6, 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      roundRect(ctx, x + 5, y + 9, w - 10, (h + 6) / 2, 2); ctx.fill()
      break
    }
    case 'cocina': {
      ctx.fillStyle = '#b9bed4'
      roundRect(ctx, x + 1, y + 8, w - 2, h + 12, 5); ctx.fill()
      ctx.fillStyle = '#d7dbe8'
      roundRect(ctx, x + 3, y + 10, w - 6, h + 4, 3); ctx.fill()
      // cafetera
      ctx.fillStyle = '#5c6076'
      roundRect(ctx, x + w - 22, y + 6, 14, 14, 3); ctx.fill()
      break
    }
    case 'estante': {
      ctx.fillStyle = '#b78a63'
      roundRect(ctx, x + 2, y + 6, w - 4, h + 12, 4); ctx.fill()
      const libros = ['#e05a5a', '#4f8ef7', '#f0b429', '#57b894', '#a06cd5']
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = libros[i % libros.length]
        ctx.fillRect(x + 6 + i * 8, y + 10, 6, 12)
      }
      break
    }
    case 'recepcion': {
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      roundRect(ctx, x + 2, y + 9, w - 4, h + 4, 8); ctx.fill()
      ctx.fillStyle = '#7170ff'
      roundRect(ctx, x + 2, y + 5, w - 4, h + 6, 8); ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('DISTINTO', x + w / 2, y + h / 2 + 4)
      break
    }
    case 'camara': {
      const cx = x + TILE / 2, cy = y + TILE / 2
      ctx.fillStyle = '#3a3d4e'
      roundRect(ctx, cx - 10, cy - 7, 20, 14, 4); ctx.fill()
      ctx.fillStyle = '#1c1e29'
      ctx.beginPath(); ctx.arc(cx - (m.dir === 'o' ? 10 : -10), cy, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 2, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'luz': {
      const cx = x + TILE / 2, cy = y + TILE / 2
      ctx.fillStyle = 'rgba(255, 236, 170, 0.45)'
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f5d76e'
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#8b8fa8'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 15); ctx.stroke()
      break
    }
    case 'fondo': {
      ctx.fillStyle = '#f0dede'
      roundRect(ctx, x + 2, y + 8, w - 4, h + 14, 3); ctx.fill()
      ctx.strokeStyle = '#d8b9b9'; ctx.lineWidth = 1.5; ctx.stroke()
      break
    }
  }
  ctx.restore()
}
