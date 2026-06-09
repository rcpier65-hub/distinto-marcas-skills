// app/lib/inicio/get-frase-del-dia.ts
//
// Selecciona la frase del día para un miembro.
//
// Reglas que pidió Pedro:
//   1. Primeros 60 días desde "anclaje" → frase secuencial
//      (todos los miembros recorren las 60 frases del rol en orden)
//   2. Día 61+ → frase aleatoria del banco, con seed determinista
//      (la misma frase NO cambia al recargar el mismo día)
//
// "Anclaje": el día 1 del calendario universal. Esto significa que TODOS
// los miembros con el mismo rol ven la misma frase el mismo día —
// pueden hablar entre sí sobre la frase. Si en cambio anclamos por
// fecha_alta de cada uno, las frases divergen demasiado.

import { getFrasesParaRol, type Frase } from './frases-por-rol'

/* Fecha de referencia: el "día 0" desde el cual contamos los 60 días
   secuenciales. Pedro arrancó la app en mayo/jun 2026. */
const FECHA_ANCLA = new Date('2026-06-01T00:00:00')

/* Hash simple para mezclar string + número y dar índice estable. */
function hashSeed(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) + seed.charCodeAt(i)
    h = h | 0  // forzar int32
  }
  return Math.abs(h)
}

/**
 * Devuelve la frase del día para un miembro.
 *
 * @param rolBase - 'disenador' | 'editor' | 'community_manager' | etc.
 * @param memberId - uuid del team_member (para diversificar después del día 60)
 * @param fecha - fecha actual (default: hoy en server time)
 */
export function getFraseDelDia(
  rolBase: string,
  memberId: string,
  fecha: Date = new Date(),
): { frase: Frase; numero: number; total: number } {
  const banco = getFrasesParaRol(rolBase)
  const total = banco.length

  /* Calcular días transcurridos desde el ancla */
  const msPorDia = 1000 * 60 * 60 * 24
  const diff = Math.floor((fecha.getTime() - FECHA_ANCLA.getTime()) / msPorDia)
  const diaIndex = Math.max(0, diff)

  let idx: number
  if (diaIndex < total) {
    /* Fase 1: primeros N días, secuencial */
    idx = diaIndex
  } else {
    /* Fase 2: aleatorio determinista. Seed = memberId + ymd para que cada
       miembro tenga su propia frase del día sin importar el rol. */
    const ymd = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
    idx = hashSeed(`${memberId}|${ymd}`) % total
  }

  return {
    frase: banco[idx],
    numero: idx + 1,
    total,
  }
}
