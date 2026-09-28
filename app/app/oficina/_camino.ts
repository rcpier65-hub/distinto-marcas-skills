// Movilidad de la oficina — Pedro 24-sep-2026: "mejora la movilidad del
// usuario" y "que se siente".
//
// · buscarCamino: A* sobre la grilla de colisiones (8 direcciones, sin cortar
//   esquinas). Con un clic/toque el avatar RODEA paredes y muebles en vez de
//   chocar y detenerse como antes (iba en línea recta).
// · Sillas: si te quedas quieto sobre una silla, te sientas mirando hacia
//   donde apunta la silla (hacia el escritorio).

import { MAPA_W, MAPA_H, MUEBLES } from './_mapa'
import type { Direccion } from './_avatar'

export type Punto = { x: number; y: number }

function libreCasilla(grid: Uint8Array, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < MAPA_W && cy < MAPA_H && grid[cy * MAPA_W + cx] === 0
}

/* Casilla libre más cercana (por si el destino cae en una pared/mueble). */
function libreCercana(grid: Uint8Array, cx: number, cy: number): Punto | null {
  if (libreCasilla(grid, cx, cy)) return { x: cx, y: cy }
  for (let r = 1; r <= 4; r++) {
    let mejor: Punto | null = null
    let md = Infinity
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const x = cx + dx, y = cy + dy
        if (!libreCasilla(grid, x, y)) continue
        const d = dx * dx + dy * dy
        if (d < md) { md = d; mejor = { x, y } }
      }
    }
    if (mejor) return mejor
  }
  return null
}

/**
 * Camino (lista de puntos en coordenadas del mapa, centros de casilla) desde
 * `desde` hasta `hasta`. El último punto es el destino exacto si es libre.
 * null si no hay camino.
 */
export function buscarCamino(grid: Uint8Array, desde: Punto, hasta: Punto): Punto[] | null {
  const ini = libreCercana(grid, Math.floor(desde.x), Math.floor(desde.y))
  const fin = libreCercana(grid, Math.floor(hasta.x), Math.floor(hasta.y))
  if (!ini || !fin) return null
  const idx = (x: number, y: number) => y * MAPA_W + x
  const g = new Float32Array(MAPA_W * MAPA_H).fill(Infinity)
  const padre = new Int32Array(MAPA_W * MAPA_H).fill(-1)
  const cerrado = new Uint8Array(MAPA_W * MAPA_H)
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - fin.x), dy = Math.abs(y - fin.y)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }
  // Cola de prioridad simple (el mapa es chico: 40×26).
  const abiertos: number[] = [idx(ini.x, ini.y)]
  g[idx(ini.x, ini.y)] = 0
  const f = new Float32Array(MAPA_W * MAPA_H).fill(Infinity)
  f[idx(ini.x, ini.y)] = h(ini.x, ini.y)

  while (abiertos.length) {
    let bi = 0
    for (let i = 1; i < abiertos.length; i++) if (f[abiertos[i]] < f[abiertos[bi]]) bi = i
    const actual = abiertos.splice(bi, 1)[0]
    const ax = actual % MAPA_W, ay = Math.floor(actual / MAPA_W)
    if (ax === fin.x && ay === fin.y) break
    cerrado[actual] = 1
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = ax + dx, ny = ay + dy
        if (!libreCasilla(grid, nx, ny)) continue
        // Sin cortar esquinas: en diagonal, las dos casillas laterales libres.
        if (dx && dy && (!libreCasilla(grid, ax + dx, ay) || !libreCasilla(grid, ax, ay + dy))) continue
        const ni = idx(nx, ny)
        if (cerrado[ni]) continue
        const costo = g[actual] + (dx && dy ? Math.SQRT2 : 1)
        if (costo < g[ni]) {
          g[ni] = costo
          f[ni] = costo + h(nx, ny)
          padre[ni] = actual
          if (!abiertos.includes(ni)) abiertos.push(ni)
        }
      }
    }
  }

  const finI = idx(fin.x, fin.y)
  if (padre[finI] === -1 && !(ini.x === fin.x && ini.y === fin.y)) return null
  const casillas: Punto[] = []
  for (let c = finI; c !== -1; c = padre[c]) casillas.push({ x: (c % MAPA_W) + 0.5, y: Math.floor(c / MAPA_W) + 0.5 })
  casillas.reverse()
  casillas.shift() // la casilla donde ya estoy
  // Si el destino exacto es libre, terminar justo ahí (no en el centro).
  if (libreCasilla(grid, Math.floor(hasta.x), Math.floor(hasta.y))) {
    if (casillas.length) casillas[casillas.length - 1] = { x: hasta.x, y: hasta.y }
    else casillas.push({ x: hasta.x, y: hasta.y })
  }
  return suavizar(grid, desde, casillas)
}

/* Quita puntos intermedios cuando hay línea recta libre (camina más natural). */
function suavizar(grid: Uint8Array, desde: Punto, puntos: Punto[]): Punto[] {
  if (puntos.length <= 1) return puntos
  const out: Punto[] = []
  let base = desde
  let i = 0
  while (i < puntos.length) {
    let j = puntos.length - 1
    while (j > i && !lineaLibre(grid, base, puntos[j])) j--
    out.push(puntos[j])
    base = puntos[j]
    i = j + 1
  }
  return out
}

function lineaLibre(grid: Uint8Array, a: Punto, b: Punto): boolean {
  const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4)
  const r = 0.34
  for (let s = 0; s <= pasos; s++) {
    const t = pasos ? s / pasos : 1
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as const) {
      if (!libreCasilla(grid, Math.floor(x + ox), Math.floor(y + oy))) return false
    }
  }
  return true
}

/* ===================== Sillas ===================== */
export type Silla = { x: number; y: number; dir: Direccion }

export const SILLAS: Silla[] = MUEBLES
  .filter((m) => m.tipo === 'silla')
  .map((m) => ({ x: m.x + 0.5, y: m.y + 0.5, dir: (m.dir ?? 's') as Direccion }))

/** Silla sobre la que estoy parado (a menos de ~media casilla). */
export function sillaEn(x: number, y: number): Silla | null {
  return SILLAS.find((s) => Math.abs(s.x - x) < 0.5 && Math.abs(s.y - y) < 0.5) ?? null
}

/** La silla del escritorio con ese label (justo debajo del escritorio). */
export function sillaDeEscritorio(label: string): Silla | null {
  const e = MUEBLES.find((m) => m.tipo === 'escritorio' && m.label === label)
  if (!e) return null
  return SILLAS.find((s) => s.x > e.x && s.x < e.x + e.w && Math.abs(s.y - (e.y + e.h + 0.5)) < 0.6) ?? null
}
