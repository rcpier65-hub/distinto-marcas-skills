// app/app/oficina/_avatar.ts
//
// Avatares de la oficina virtual. En Gather son sprites pixel-art; acá los
// dibujamos PROCEDURALMENTE con canvas (nada de assets que descargar) y son
// personalizables: piel, peinado, color de pelo, ropa y accesorio.
//
// Se dibuja mirando en 4 direcciones, con "bobbing" al caminar y el HUD
// encima (nombre con contorno negro + punto de estado), igual que Gather.

export type Direccion = 'n' | 's' | 'e' | 'o'
export type Peinado = 'corto' | 'largo' | 'rizado' | 'mono' | 'gorra' | 'calvo'
export type Accesorio = 'ninguno' | 'lentes' | 'audifonos' | 'bigote'
export type EstadoUsuario = 'disponible' | 'ocupado' | 'nomolestar'

export type AvatarConfig = {
  piel: string
  pelo: string
  peinado: Peinado
  ropa: string
  accesorio: Accesorio
}

export const PIELES = ['#f7d3ba', '#eab896', '#c98c63', '#a2673f', '#6b4632', '#f2c9a0']
export const PELOS = ['#2b2118', '#4a3728', '#8b5a2b', '#c9a227', '#d94f4f', '#5b5b6e', '#e8e2d9', '#7c3aed']
export const ROPAS = ['#7170ff', '#ba41f7', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#0f172a', '#64748b']
export const PEINADOS: Peinado[] = ['corto', 'largo', 'rizado', 'mono', 'gorra', 'calvo']
export const ACCESORIOS: Accesorio[] = ['ninguno', 'lentes', 'audifonos', 'bigote']

export const ESTADO_COLOR: Record<EstadoUsuario, string> = {
  disponible: '#43d69f',
  ocupado: '#f5c451',
  nomolestar: '#ef4444',
}
export const ESTADO_LABEL: Record<EstadoUsuario, string> = {
  disponible: 'Disponible',
  ocupado: 'Ocupado',
  nomolestar: 'No molestar',
}

/* Avatar por defecto derivado del nombre: dos personas distintas arrancan
   con aspecto distinto sin tener que configurar nada. */
export function avatarPorNombre(nombre: string): AvatarConfig {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0
  /* OJO: los corrimientos van SIN signo (>>>). Con `>>` un hash mayor a 2^31
     da negativo, el módulo sale negativo y el índice devuelve undefined —
     lo que rompía el dibujo del avatar para ciertos nombres. */
  return {
    piel: PIELES[h % PIELES.length],
    pelo: PELOS[(h >>> 3) % PELOS.length],
    peinado: PEINADOS[(h >>> 6) % PEINADOS.length],
    ropa: ROPAS[(h >>> 9) % ROPAS.length],
    accesorio: ACCESORIOS[(h >>> 12) % ACCESORIOS.length],
  }
}

export function avatarValido(a: unknown): a is AvatarConfig {
  if (!a || typeof a !== 'object') return false
  const o = a as Partial<AvatarConfig>
  return typeof o.piel === 'string' && typeof o.pelo === 'string' && typeof o.ropa === 'string'
    && typeof o.peinado === 'string' && typeof o.accesorio === 'string'
}

/**
 * Dibuja un avatar centrado en (cx, cy) — cy es la posición de los PIES.
 * `paso` avanza la animación de caminar (0 si está quieto).
 */
export function dibujarAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cfg: AvatarConfig,
  dir: Direccion,
  caminando: boolean,
  paso: number,
  opts: { fantasma?: boolean; hablando?: boolean } = {},
) {
  const bob = caminando ? Math.sin(paso * 0.35) * 1.6 : 0
  const y = cy + bob

  ctx.save()
  if (opts.fantasma) ctx.globalAlpha = 0.45

  // Sombra en el piso
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 1, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Anillo verde si está hablando (pista extra que Gather no tiene, ayuda mucho)
  if (opts.hablando) {
    ctx.strokeStyle = '#43d69f'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(cx, cy + 1, 13, 6, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Piernas (alternan al caminar)
  const swing = caminando ? Math.sin(paso * 0.35) * 3 : 0
  ctx.fillStyle = '#3d4257'
  ctx.fillRect(cx - 5, y - 9, 4, 9 + swing)
  ctx.fillRect(cx + 1, y - 9, 4, 9 - swing)

  // Cuerpo / ropa
  ctx.fillStyle = cfg.ropa
  roundRectPath(ctx, cx - 8, y - 22, 16, 14, 5)
  ctx.fill()
  // Brazos
  ctx.fillStyle = sombra(cfg.ropa, -18)
  if (dir === 'e') ctx.fillRect(cx + 6, y - 20, 4, 9)
  else if (dir === 'o') ctx.fillRect(cx - 10, y - 20, 4, 9)
  else { ctx.fillRect(cx - 11, y - 20, 4, 9); ctx.fillRect(cx + 7, y - 20, 4, 9) }

  // Cabeza
  ctx.fillStyle = cfg.piel
  ctx.beginPath()
  ctx.arc(cx, y - 28, 8.5, 0, Math.PI * 2)
  ctx.fill()

  // Cara (solo si no mira al norte)
  if (dir !== 'n') {
    const offX = dir === 'e' ? 2.2 : dir === 'o' ? -2.2 : 0
    ctx.fillStyle = '#26262e'
    if (dir === 's') {
      ctx.beginPath(); ctx.arc(cx - 3, y - 29, 1.4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + 3, y - 29, 1.4, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(cx + offX * 1.4, y - 29, 1.4, 0, Math.PI * 2); ctx.fill()
    }
    if (cfg.accesorio === 'bigote') {
      ctx.fillStyle = cfg.pelo
      ctx.fillRect(cx - 3 + offX, y - 25.5, 6, 1.8)
    }
  }

  // Pelo
  ctx.fillStyle = cfg.pelo
  switch (cfg.peinado) {
    case 'corto':
      ctx.beginPath(); ctx.arc(cx, y - 30, 8.5, Math.PI, 0); ctx.fill()
      break
    case 'largo':
      ctx.beginPath(); ctx.arc(cx, y - 30, 8.5, Math.PI, 0); ctx.fill()
      ctx.fillRect(cx - 9, y - 31, 3.5, 13)
      ctx.fillRect(cx + 5.5, y - 31, 3.5, 13)
      break
    case 'rizado':
      for (const [ox, oy, r] of [[-6, -32, 4.5], [0, -35, 5], [6, -32, 4.5], [-8, -28, 3.5], [8, -28, 3.5]] as const) {
        ctx.beginPath(); ctx.arc(cx + ox, y + oy, r, 0, Math.PI * 2); ctx.fill()
      }
      break
    case 'mono':
      ctx.beginPath(); ctx.arc(cx, y - 30, 8.5, Math.PI, 0); ctx.fill()
      ctx.beginPath(); ctx.arc(cx, y - 38, 4.5, 0, Math.PI * 2); ctx.fill()
      break
    case 'gorra':
      ctx.fillStyle = sombra(cfg.pelo, 10)
      roundRectPath(ctx, cx - 9, y - 36, 18, 7, 3); ctx.fill()
      ctx.fillRect(dir === 'o' ? cx - 15 : cx - 3, y - 31, 18, 2.5)
      break
    case 'calvo':
      break
  }

  // Accesorios
  if (cfg.accesorio === 'lentes') {
    ctx.strokeStyle = '#26262e'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.arc(cx - 3.4, y - 29, 3, 0, Math.PI * 2)
    ctx.arc(cx + 3.4, y - 29, 3, 0, Math.PI * 2)
    ctx.moveTo(cx - 0.4, y - 29); ctx.lineTo(cx + 0.4, y - 29)
    ctx.stroke()
  } else if (cfg.accesorio === 'audifonos') {
    ctx.strokeStyle = '#2b2e3f'
    ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.arc(cx, y - 30, 9.5, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = '#2b2e3f'
    roundRectPath(ctx, cx - 12, y - 32, 4.5, 7, 2); ctx.fill()
    roundRectPath(ctx, cx + 7.5, y - 32, 4.5, 7, 2); ctx.fill()
  }

  ctx.restore()
}

/** Etiqueta de nombre + punto de estado (texto blanco con contorno negro). */
export function dibujarEtiqueta(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  nombre: string,
  estado: EstadoUsuario,
  emote: string | null,
) {
  const yTxt = cy - 46

  ctx.save()
  ctx.font = 'bold 12px ui-sans-serif, system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const anchoTxt = ctx.measureText(nombre).width
  // Punto de estado a la izquierda del nombre
  const dotX = cx - anchoTxt / 2 - 8
  ctx.fillStyle = '#222034'
  ctx.beginPath(); ctx.arc(dotX, yTxt, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = ESTADO_COLOR[estado]
  ctx.beginPath(); ctx.arc(dotX, yTxt, 4, 0, Math.PI * 2); ctx.fill()

  // Nombre con contorno negro (se lee sobre cualquier fondo)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#222034'
  ctx.lineJoin = 'round'
  ctx.strokeText(nombre, cx + 4, yTxt)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(nombre, cx + 4, yTxt)

  // Emote flotando encima
  if (emote) {
    ctx.font = '22px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(emote, cx, yTxt - 22)
  }
  ctx.restore()
}

/** Elipse blanca bajo los pies: "este eres tú" (igual que Gather). */
export function dibujarMarcaPropia(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(cx, cy + 2, 13, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/* ---------- helpers ---------- */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Aclara (+) u oscurece (−) un color hex. Tolera valores inválidos: un
    avatar con un color corrupto se ve raro, pero no tumba el render. */
function sombra(hex: string, delta: number): string {
  if (typeof hex !== 'string' || !hex) return '#888888'
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const cl = (v: number) => Math.max(0, Math.min(255, v + delta))
  const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255)
  return `rgb(${r},${g},${b})`
}
