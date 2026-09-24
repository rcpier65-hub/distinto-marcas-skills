/* Convierte el plazo dicho en la reunión ("para el viernes", "mañana",
   "el 10 de octubre", "fin de mes"…) en una fecha YYYY-MM-DD, en código.
   La IA copia las palabras exactas y aquí se calcula: gpt-4o-mini se
   equivocaba con los días de la semana ("el viernes" → un miércoles).
   Pedro 24-sep-2026. */

import { fechaExplicita } from '@/lib/reuniones/fecha-explicita'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function sumar(hoy: string, n: number): string {
  const [y, m, d] = hoy.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10)
}
function diaSemana(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

export function resolverPlazo(plazo: string | null | undefined, hoy: string): string | null {
  if (!plazo) return null
  const t = plazo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const exp = fechaExplicita(t, hoy)
  if (exp.encontrada) return exp.fecha

  if (/pasado\s*manana/.test(t)) return sumar(hoy, 2)
  if (/\bmanana\b/.test(t)) return sumar(hoy, 1)
  if (/\bhoy\b|\bahorita\b|\bahora\b/.test(t)) return hoy

  const enDias = t.match(/\ben\s+(\d{1,2})\s+dias?\b/)
  if (enDias) return sumar(hoy, Number(enDias[1]))

  const dow = diaSemana(hoy)
  if (/fin de mes|final(es)? de mes/.test(t)) {
    const [y, m] = hoy.split('-').map(Number)
    return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10)
  }
  if (/fin de semana/.test(t)) return sumar(hoy, ((6 - dow + 7) % 7) || 7)
  if (/(proxima|siguiente|otra) semana|semana que viene/.test(t)) return sumar(hoy, ((1 - dow + 7) % 7) || 7)
  if (/esta semana/.test(t)) return sumar(hoy, Math.max(0, 5 - dow))

  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${DIAS[i]}\\b`).test(t)) {
      return sumar(hoy, (i - dow + 7) % 7 || 7)   // el PRÓXIMO (nunca hoy)
    }
  }
  return null
}
