// app/lib/comentarios/clasificador.ts
//
// Heurística simple para clasificar comentarios sin AI. Reglas en orden de prioridad
// (la primera que matchea gana). Basado en patrones que vi en data real de Manrique:
//
//   - "pregunta_info"   → contiene "?" + (cuesta|precio|info|costos|edad|adultos|adolescentes|sesiones|cómo|cuanto|tea|adha|cuál)
//   - "testimonial"     → ("gracias" | "excelente" | "recomiendo" | "encanto" | "buenos profesionales") + corto/medio
//   - "empatia"         → contiene tema sensible ("lamentablemente" | "sucede" | "tristeza" | "verdad") sin pregunta
//   - "reaccion"        → ≤3 palabras o solo emojis ("facto", "🔥", "💙", "👏", "amen")
//   - "derivar"         → muy corto pero confuso ("??", "consultar", "información")
//   - "otro"            → fallback
//
// No es perfecto pero captura ~80% bien. Pedro puede editar la categoría en UI
// antes de aprobar.

import type { ComentarioCategoria } from '@/lib/types/database'

// Patrones (case-insensitive)
const PATRONES_INFO = /\b(precio|costo|cuesta|cu[áa]nto|c[óo]mo|info|informaci[óo]n|edad|adolescente|adulto|ni[ñn]o|sesi[óo]n|durac|hor[ao]|atienden|atenc[ií][óo]n|ubicac|d[ií]as?|hac[eé]n|realizan|hay|tienen|tea|tdah|tda|prueba|evaluac|terapia|consulta|cita)\b/i

const PATRONES_TESTIMONIAL = /\b(gracias|excelente|recomiendo|encant[óo]|maravillos|incre[ií]ble|amazing|buenos?\s+profesional|s[uú]per|much[ío]simo|maravilla|cracks?|geni[oa]l)\b/i

const PATRONES_EMPATIA = /\b(lamentablement|tristeza|verdad|sufr|dolor|complicado|dif[íi]cil|terrible|injusto|tristement)\b/i

const PATRONES_DERIVAR_AMBIGUO = /^(\?\?+|consult[ao]r?|informaci[óo]n|\\?)$/i

// Solo emojis o muy corto
function esReaccionCorta(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  // Solo emojis y espacios?
  const sinEmojis = trimmed.replace(/\p{Extended_Pictographic}/gu, '').trim()
  if (sinEmojis.length <= 3) return true
  // 1-3 palabras y sin signos de pregunta?
  const palabras = trimmed.split(/\s+/).filter(Boolean)
  if (palabras.length <= 3 && !trimmed.includes('?')) return true
  return false
}

function tienePregunta(text: string): boolean {
  return text.includes('?') || text.includes('¿')
}

export function clasificarComentario(text: string): ComentarioCategoria {
  const t = text.trim()

  // 1. Muy ambiguo y corto → derivar
  if (PATRONES_DERIVAR_AMBIGUO.test(t)) return 'derivar'

  // 2. Pregunta con keywords de info comercial → pregunta_info
  if (tienePregunta(t) && PATRONES_INFO.test(t)) return 'pregunta_info'

  // 3. Solo pregunta sin keywords → derivar (vago)
  if (tienePregunta(t) && t.length < 30) return 'derivar'

  // 4. Pregunta larga → pregunta_info (probable consulta detallada)
  if (tienePregunta(t)) return 'pregunta_info'

  // 5. Testimonial con palabras de elogio
  if (PATRONES_TESTIMONIAL.test(t)) return 'testimonial'

  // 6. Empatía / coincidencia con tema sensible
  if (PATRONES_EMPATIA.test(t)) return 'empatia'

  // 7. Reacción corta
  if (esReaccionCorta(t)) return 'reaccion'

  // 8. Fallback
  return 'otro'
}

/**
 * Util de UI: nombre legible + emoji para mostrar en chips.
 */
export const CATEGORIA_LABEL: Record<ComentarioCategoria, { emoji: string; label: string; color: string }> = {
  pregunta_info:  { emoji: '❓', label: 'Pregunta info',  color: '#3B82F6' },
  testimonial:    { emoji: '💙', label: 'Testimonial',    color: '#10B981' },
  empatia:        { emoji: '🤝', label: 'Empatía',        color: '#8B5CF6' },
  derivar:        { emoji: '📩', label: 'Derivar a DM',   color: '#F97316' },
  reaccion:       { emoji: '✨', label: 'Reacción',       color: '#EC4899' },
  queja:          { emoji: '😟', label: 'Queja',          color: '#EF4444' },  // v2
  humor:          { emoji: '😄', label: 'Humor',          color: '#F59E0B' },  // v2
  sensible:       { emoji: '🩺', label: 'Sensible',       color: '#DC2626' },  // v2 — clínico/médico
  spam:           { emoji: '🚫', label: 'Spam / Hate',    color: '#71717A' },  // v2 — skip
  otro:           { emoji: '💬', label: 'Otro',           color: '#6B7280' },
}
