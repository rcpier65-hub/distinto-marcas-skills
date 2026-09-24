/* Sonidos de la app (chat y avisos importantes), sintetizados con Web Audio:
   no hay archivos que descargar y suenan al instante.

   Los navegadores solo dejan sonar audio después de que el usuario tocó la
   página una vez: <SonidosBridge/> (en AppShell) llama a despertarAudio() en
   el primer click/tecla. Antes de eso, sonar*() no hace nada. */

let ctx: AudioContext | null = null

export function despertarAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* navegador sin Web Audio: sin sonido */ }
}

function nota(freq: number, inicio: number, dur: number, vol: number, tipo: OscillatorType = 'sine') {
  if (!ctx) return
  const t0 = ctx.currentTime + inicio
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = tipo
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/* Evita que varios avisos seguidos (p. ej. 5 mensajes de golpe) suenen encima. */
let ultimoMs = 0
function puedeSonar(): boolean {
  if (!ctx || ctx.state !== 'running') return false
  const ahora = Date.now()
  if (ahora - ultimoMs < 700) return false
  ultimoMs = ahora
  return true
}

/* Mensaje de chat: dos notas cortas ascendentes (estilo Telegram). */
export function sonarMensaje(): void {
  if (!puedeSonar()) return
  nota(880, 0, 0.28, 0.22)
  nota(1318.5, 0.11, 0.28, 0.22)
}

/* Aviso importante (notificación del sistema): tres notas, más marcado. */
export function sonarAviso(): void {
  if (!puedeSonar()) return
  nota(659.25, 0, 0.22, 0.2, 'triangle')
  nota(987.77, 0.12, 0.22, 0.2, 'triangle')
  nota(1318.5, 0.24, 0.35, 0.2, 'triangle')
}
