// Una política compartida para recepción, envío y estado visual.
// La histéresis conserva el transporte; nunca amplía el radio audible.
export const DIST_FULL = 1.2
export const DIST_CONECTA = 2.4
export const DIST_SILENCIO = 2.6
export const DIST_CORTA = 3.4
export const DIST_QUIET = 1.3

export type EstadoUsuarioAudio = 'disponible' | 'ocupado' | 'nomolestar'
export type EstadoAudio = {
  id: string; x: number; y: number
  zona: string | null
  privada: string | null
  spot: boolean; ghost: boolean; quiet: boolean
  estado: EstadoUsuarioAudio
}
export type Motivo = 'fantasma' | 'nomolestar' | 'spotlight' | 'privada' | 'privada-fuera'
  | 'sala-distinta' | 'silencioso' | 'cercania' | 'lejos'
export type Decision = { conectar: boolean; gain: number; videoAlpha: number; fijado: boolean; motivo: Motivo }
export const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
export function gainPorDistancia(d: number): number {
  return Math.max(0, Math.min(1, (DIST_SILENCIO - d) / (DIST_SILENCIO - DIST_FULL)))
}
export function decidir(yo: EstadoAudio, otro: EstadoAudio, conectadoAntes: boolean): Decision {
  const nada = (motivo: Motivo): Decision => ({ conectar: false, gain: 0, videoAlpha: 0, fijado: false, motivo })
  const pleno = (motivo: Motivo, fijado = false): Decision => ({ conectar: true, gain: 1, videoAlpha: 1, fijado, motivo })
  if (![yo.x, yo.y, otro.x, otro.y].every(Number.isFinite)) return nada('lejos')
  if (yo.ghost || otro.ghost) return nada('fantasma')
  if (yo.estado === 'nomolestar' || otro.estado === 'nomolestar') return nada('nomolestar')
  // Una llamada aceptada excluye a todos los demás, incluso anuncios generales.
  if (yo.privada || otro.privada) {
    return yo.privada && yo.privada === otro.privada ? pleno('privada') : nada('privada-fuera')
  }
  if (otro.spot) return pleno('spotlight', true)
  // Las paredes aíslan salas. Compartir sala no elimina la distancia.
  if (yo.zona !== otro.zona) return nada('sala-distinta')
  const d = distancia(yo, otro)
  if (yo.quiet || otro.quiet) return d <= DIST_QUIET ? pleno('silencioso') : nada('silencioso')
  if (d > (conectadoAntes ? DIST_CORTA : DIST_CONECTA)) return nada('lejos')
  const gain = gainPorDistancia(d)
  return { conectar: true, gain, videoAlpha: gain > 0 ? 1 : 0, fijado: false, motivo: gain > 0 ? 'cercania' : 'lejos' }
}
export function debeConectar(a: EstadoAudio, b: EstadoAudio, antes: boolean): boolean {
  return decidir(a, b, antes).conectar || decidir(b, a, antes).conectar
}
export function paneo(yo: { x: number }, otro: { x: number }): number {
  return Math.max(-1, Math.min(1, (otro.x - yo.x) / DIST_CONECTA))
}
