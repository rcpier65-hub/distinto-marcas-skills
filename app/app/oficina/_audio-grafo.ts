// app/app/oficina/_audio-grafo.ts
//
// GRAFO DE AUDIO de la oficina: la ÚNICA fuente de verdad de "quién oye a
// quién y con cuánto volumen". Antes esto estaba duplicado (el bucle de
// conexiones decidía una cosa y el render pintaba otra), y la UI mentía:
// decía "te escucha" a través de una pared.
//
// Reglas tomadas de Gather, en este orden de precedencia:
//   1. Fantasma / No molestar  → se corta todo
//   2. Spotlight               → 1.0, atraviesa salas privadas
//   3. Conversación privada    → 1.0 entre los dos; los de afuera al 15%
//   4. Misma sala privada      → 1.0 · sala distinta → sin conexión
//   5. Modo silencioso         → solo el de al lado (1 casilla)
//   6. Cercanía                → volumen por distancia, corte en 6
//
// HISTÉRESIS: se conecta a ≤5 casillas pero solo se corta a ≥7. Sin esto,
// parado justo en el borde, la conexión se abría y cerraba sin parar (cada
// ciclo = handshake completo, o sea nunca llegaba a sonar).

export const DIST_FULL = 2        // hasta acá, volumen máximo
export const DIST_CONECTA = 5     // se abre la conexión
export const DIST_CORTA = 7       // recién acá se cierra (histéresis)
export const DIST_SILENCIO = 6    // a partir de acá el volumen ya es 0
export const DIST_QUIET = 1       // modo silencioso: solo el de al lado

export const GAIN_FUERA_PRIVADA = 0.15   // los de afuera oyen bajito
export const ALPHA_FUERA_PRIVADA = 0.35  // y con el video semitransparente

export type EstadoUsuarioAudio = 'disponible' | 'ocupado' | 'nomolestar'

/** Todo lo que necesita saberse de alguien para decidir el audio. */
export type EstadoAudio = {
  id: string
  x: number
  y: number
  zona: string | null      // sala privada donde está
  privada: string | null   // id de la conversación privada
  spot: boolean            // está hablándole a toda la oficina
  ghost: boolean           // modo fantasma
  quiet: boolean           // modo silencioso
  estado: EstadoUsuarioAudio
}

export type Motivo =
  | 'fantasma' | 'nomolestar' | 'spotlight' | 'privada' | 'privada-fuera'
  | 'sala' | 'sala-distinta' | 'silencioso' | 'cercania' | 'lejos'

export type Decision = {
  conectar: boolean     // ¿abrir/mantener la conexión?
  gain: number          // 0..1 — volumen con el que lo oigo
  videoAlpha: number    // 0..1 — opacidad de su burbuja de video
  fijado: boolean       // clavarlo arriba (está en spotlight)
  motivo: Motivo
}

/** Distancia de Chebyshev (radio cuadrado) — es la que usa Gather. */
export function cheb(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/** Volumen por distancia: 1.0 hasta 2 casillas, baja lineal, 0 en 6. */
export function gainPorDistancia(d: number): number {
  if (d <= DIST_FULL) return 1
  if (d >= DIST_SILENCIO) return 0
  return Math.max(0, 1 - (d - DIST_FULL) / (DIST_SILENCIO - DIST_FULL))
}

/**
 * ¿Con cuánto volumen oigo yo a `otro`?
 *
 * `conectadoAntes` implementa la histéresis: si ya estábamos conectados, el
 * corte por distancia se estira de 5 a 7 casillas.
 */
export function decidir(yo: EstadoAudio, otro: EstadoAudio, conectadoAntes: boolean): Decision {
  const nada = (motivo: Motivo): Decision =>
    ({ conectar: false, gain: 0, videoAlpha: 0, fijado: false, motivo })
  const pleno = (motivo: Motivo, fijado = false): Decision =>
    ({ conectar: true, gain: 1, videoAlpha: 1, fijado, motivo })

  // 1. Fantasma o No molestar: se corta todo, en cualquier dirección.
  if (yo.ghost || otro.ghost) return nada('fantasma')
  if (yo.estado === 'nomolestar' || otro.estado === 'nomolestar') return nada('nomolestar')

  // 2. Spotlight: le habla a toda la oficina, atraviesa las salas privadas.
  if (otro.spot) return pleno('spotlight', true)

  const d = cheb(yo, otro)
  const limite = conectadoAntes ? DIST_CORTA : DIST_CONECTA

  // 3. Conversación privada.
  if (yo.privada && otro.privada === yo.privada) return pleno('privada')
  if (yo.privada || otro.privada) {
    /* Uno de los dos está en una conversación privada con alguien más:
       se siguen oyendo, pero bajito y con el video tenue (como Gather).
       Ojo: NO atraviesa salas privadas — si están en salas distintas no
       se oyen. Una sala de juntas no puede volverse permeable porque
       alguien de adentro abrió una privada con alguien de afuera. */
    if (yo.zona !== otro.zona) return nada('sala-distinta')
    if (d > limite) return nada('lejos')
    return {
      conectar: true,
      gain: GAIN_FUERA_PRIVADA,
      videoAlpha: ALPHA_FUERA_PRIVADA,
      fijado: false,
      motivo: 'privada-fuera',
    }
  }

  // 4. Salas privadas: dentro se oyen todos; de sala a sala, nada.
  if (yo.zona || otro.zona) {
    if (yo.zona === otro.zona) return pleno('sala')
    return nada('sala-distinta')
  }

  // 5. Modo silencioso: solo el que tengo justo al lado.
  if (yo.quiet || otro.quiet) {
    if (d <= DIST_QUIET) return pleno('silencioso')
    return nada('silencioso')
  }

  // 6. Cercanía normal.
  if (d > limite) return nada('lejos')
  const g = gainPorDistancia(d)
  /* Dentro del margen de histéresis (5..7) el volumen ya es 0, pero la
     conexión se mantiene viva para no rehacer el handshake si vuelve. */
  return {
    conectar: true,
    gain: g,
    videoAlpha: g > 0 ? 1 : 0.35,
    fijado: false,
    motivo: 'cercania',
  }
}

/**
 * ¿Hay que tener conexión abierta con esta persona?
 *
 * Se evalúa en las DOS direcciones: basta con que uno de los dos deba oír al
 * otro. Así los dos navegadores llegan a la misma conclusión aunque sus
 * posiciones interpoladas difieran un poco.
 */
export function debeConectar(a: EstadoAudio, b: EstadoAudio, conectadoAntes: boolean): boolean {
  return decidir(a, b, conectadoAntes).conectar || decidir(b, a, conectadoAntes).conectar
}

/**
 * Paneo estéreo: a quien tengo a la izquierda lo oigo por la izquierda.
 * Devuelve -1 (izquierda) .. 1 (derecha).
 */
export function paneo(yo: { x: number }, otro: { x: number }): number {
  const dx = otro.x - yo.x
  return Math.max(-1, Math.min(1, dx / DIST_CONECTA))
}
