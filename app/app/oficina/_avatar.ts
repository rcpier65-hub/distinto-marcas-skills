// Apariencia compartida por los personajes 3D y el editor.
export type Direccion = 'n' | 's' | 'e' | 'o'
export type Peinado = 'corto' | 'largo' | 'rizado' | 'mono' | 'gorra' | 'calvo' | 'bob' | 'cola'
export type Accesorio = 'ninguno' | 'lentes' | 'audifonos' | 'bigote'
export type EstadoUsuario = 'disponible' | 'ocupado' | 'nomolestar'

export type AvatarConfig = {
  piel: string
  pelo: string
  peinado: Peinado
  ropa: string
  accesorio: Accesorio
  cuerpo?: 'hombre' | 'mujer' | 'neutro'
  rostro?: 'ovalado' | 'redondo' | 'angular'
  ojos?: string
  pantalon?: string
  vestimenta?: 'camiseta' | 'camisa' | 'chaqueta'
  barba?: 'ninguna' | 'corta' | 'completa'
}

export const PIELES = ['#f7d3ba', '#eab896', '#c98c63', '#a2673f', '#6b4632', '#f2c9a0']
export const PELOS = ['#2b2118', '#4a3728', '#8b5a2b', '#c9a227', '#d94f4f', '#5b5b6e', '#e8e2d9', '#7c3aed']
export const ROPAS = ['#7170ff', '#ba41f7', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#0f172a', '#64748b']
export const PEINADOS: Peinado[] = ['corto', 'largo', 'rizado', 'mono', 'gorra', 'calvo', 'bob', 'cola']
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

export const OJOS = ['#593d2b', '#31829e', '#618358', '#64748b']
export const PANTALONES = ['#283440', '#d6cab9', '#405a79', '#3e3c4a', '#f0ede6']
export const CUERPOS = ['hombre', 'mujer', 'neutro'] as const
export const ROSTROS = ['ovalado', 'redondo', 'angular'] as const
export const VESTIMENTAS = ['camiseta', 'camisa', 'chaqueta'] as const
export const BARBAS = ['ninguna', 'corta', 'completa'] as const
const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
export function avatarValido(a: unknown): a is AvatarConfig {
  if (!a || typeof a !== 'object') return false
  const o = a as AvatarConfig
  return hex(o.piel) && hex(o.pelo) && hex(o.ropa) && PEINADOS.includes(o.peinado) && ACCESORIOS.includes(o.accesorio)
}
/** Acepta los avatares antiguos sin imponer un género a partir del nombre. */
export function normalizarAvatar(a: AvatarConfig): Required<AvatarConfig> {
  return {
    piel: hex(a.piel) ? a.piel : PIELES[0], pelo: hex(a.pelo) ? a.pelo : PELOS[0], ropa: hex(a.ropa) ? a.ropa : ROPAS[0],
    peinado: PEINADOS.includes(a.peinado) ? a.peinado : 'corto', accesorio: ACCESORIOS.includes(a.accesorio) ? a.accesorio : 'ninguno',
    cuerpo: CUERPOS.includes(a.cuerpo!) ? a.cuerpo! : 'neutro', rostro: ROSTROS.includes(a.rostro!) ? a.rostro! : 'ovalado',
    ojos: hex(a.ojos) ? a.ojos : OJOS[0], pantalon: hex(a.pantalon) ? a.pantalon : PANTALONES[0],
    vestimenta: VESTIMENTAS.includes(a.vestimenta!) ? a.vestimenta! : 'camiseta', barba: BARBAS.includes(a.barba!) ? a.barba! : 'ninguna',
  }
}
