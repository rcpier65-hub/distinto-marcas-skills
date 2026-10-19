/* Reloj del servidor para los cronómetros (Lorena 19-oct-2026: "de la nada se
   salta de 2 segundos a 2 minutos, llega a 32 min y salta a 34").
   El inicio de cada sesión (tareas.en_proceso_desde) lo guarda el servidor,
   pero el segundero se calculaba con la hora de la computadora. Si esa hora va
   adelantada o atrasada, el tiempo salta al recargar. Aquí se mide la
   diferencia una vez y los cronómetros cuentan con la hora del servidor. */

/* Diferencias menores a 2 s se ignoran: el encabezado Date tiene resolución
   de 1 s y corregir ruido haría saltar el segundero. */
const UMBRAL_MS = 2_000

/* desfase = hora del servidor − hora local (ms). enviado/recibido son
   Date.now() alrededor de la petición; fecha es el encabezado HTTP Date. */
export function estimarDesfase(enviado: number, recibido: number, fecha: string | null): number {
  const servidor = fecha ? Date.parse(fecha) : NaN
  if (!Number.isFinite(servidor)) return 0
  /* El encabezado trunca al segundo: +500 ms lo centra. */
  const d = servidor + 500 - (enviado + recibido) / 2
  return Math.abs(d) < UMBRAL_MS ? 0 : Math.round(d)
}

/* Segundos del cronómetro: lo acumulado + la sesión en curso medida con la
   hora del servidor. Nunca negativo. */
export function segundosTranscurridos(desde: string | null, acumulado: number, ahoraLocal: number, desfase: number): number {
  if (!desde) return acumulado
  const inicio = Date.parse(desde)
  if (!Number.isFinite(inicio)) return acumulado
  return acumulado + Math.max(0, Math.round((ahoraLocal + desfase - inicio) / 1000))
}

let desfase = 0
let medicion: Promise<number> | null = null

/* Mide una vez por pestaña contra /api/version (sin caché). Si falla, 0. */
export function sincronizarReloj(): Promise<number> {
  if (typeof window === 'undefined') return Promise.resolve(0)
  medicion ??= (async () => {
    try {
      const enviado = Date.now()
      const r = await fetch('/api/version', { cache: 'no-store' })
      desfase = estimarDesfase(enviado, Date.now(), r.headers.get('date'))
    } catch { /* sin red: hora local */ }
    return desfase
  })()
  return medicion
}

/* Hora "del servidor" en ms, según la última medición. */
export const ahoraServidor = () => Date.now() + desfase
export const desfaseActual = () => desfase
