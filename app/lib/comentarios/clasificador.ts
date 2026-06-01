// app/lib/comentarios/clasificador.ts
//
// Heurística para clasificar comentarios sin AI. Reglas en orden de prioridad
// (la primera que matchea gana).
//
// v2 (2026-06-01) — Mejor distribución de categorías. Pedro reportó que muchas
// cosas caían en "otro" (humor, votos, quejas sutiles) y la Routine respondía
// con template genérico. Ahora detectamos:
//
//   - "spam"            → insultos, hate speech (skip respuesta)
//   - "queja"           → "nunca responden", "no me contestan", "esperando"
//   - "humor"           → "jaja"/"jeje", emojis de risa (😂🤣🥹🤪), "voto por", "ganó"
//   - "pregunta_info"   → keywords comerciales SIN requerir "?"
//                         (precio, me interesa, dirección, dónde, venden, stock)
//   - "testimonial"     → elogio explícito ("los tops", "amo", "me encanta")
//   - "empatia"         → tema sensible compartido sin pregunta
//   - "derivar"         → ambiguo y muy corto
//   - "reaccion"        → solo emojis no-risa, 1-3 palabras simples
//   - "otro"            → fallback
//
// El clasificador heurístico setea `categoria_sugerida`. La Routine luego
// PUEDE sobreescribirla con su propia decisión via POST /sugerencia. La UI
// muestra `categoria_sugerida` como dropdown editable por Pedro.

import type { ComentarioCategoria } from '@/lib/types/database'

// ──────────────────────────────────────────────────────────────────────────
// Patrones (case-insensitive)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Spam / hate — insultos directos en lunfardo peruano + general.
 * Si matchea, se setea como spam y no se genera respuesta.
 */
const PATRONES_SPAM =
  /\b(idiot[ao]?|estupid[ao]?|imb[eé]cil|pendej[ao]?|conchatum|chingu?en|mierd[ao]?|caquit[ao]?|aweonad[ao]?|huevon|cu?liad[ao]|verg[ao]?|cojud[ao]|put[oa]\s*(?:madre|que|que\s+te))\b/i

/**
 * Queja — frustración por respuesta lenta, mal servicio, expectativa frustrada.
 * Tiene PRIORIDAD sobre pregunta_info porque la respuesta debe empezar con
 * disculpa antes de dar info.
 */
const PATRONES_QUEJA =
  /(\bnunca\s+(?:responden|contestan|me\s+responden|me\s+contestan)\b|\bno\s+(?:contestan|responden|me\s+(?:responden|contestan|atienden))\b|\bescrib[oíi]\s+(?:al?\s+)?(?:wsp|whats?app|dm)\b.*\b(?:nadie|nunca|nuncio|nunci[ao]|no(?:\s+me)?)\b|\bllevo\s+(?:esperando|d[ií]as?\s+esperando|semanas?\s+esperando)\b|\bsin\s+respuesta\b|\bme\s+ignoran\b|\bmal\s+servicio\b|p[eé]sim[oa]\s+atenc|horrible\s+atenci[oó]n|\bestafa\b)/i

/**
 * Humor — risa explícita, votos en concursos, bromas. Para que la Routine
 * sepa que el comentario es lúdico y no responda con info comercial.
 *
 * Emojis: 😂 🤣 😹 🥹 🤪 + variantes de "ja/je/ji" repetidas
 */
const PATRONES_HUMOR =
  /(\bjaja+\w*|\bjeje+\w*|\bjiji+\w*|\bjojo+\w*|🤣|😂|😹|🥹|🤪|🤡|\bvoto\s+(?:por|a)\b|\bgan[óo]\b\s+\w+|team\s+\w+|capo\b|crack\s+\w+|\bganador|muy\s+buen[ao]\s+broma)/i

/**
 * Pregunta info comercial — keywords de intención de compra/consulta.
 * NO requiere signo de pregunta (la gente real escribe "Precio" o "Dirección").
 *
 * Cuidado: este pattern tiene MENOR prioridad que humor y queja, así que
 * "ganó mi Gloglo" no cae acá aunque tenga "ganó" porque humor matchea antes.
 */
const PATRONES_INFO =
  /\b(precios?|costos?|cuesta|cu[áa]nto|c[óo]mo|info|informaci[óo]n|edad|adolescente|adulto|ni[ñn]o|sesi[óo]n|durac|hor[ao]s?|atienden|atenc[ií][óo]n|ubicac|direcci[oó]n|d[oó]nde|d[ií]as?|hac[eé]n|realizan|hay|tienen?|venden?|stock|disponibles?|disponibilidad|tea|tdah|tda|prueba|evaluac|terapia|consultas?|citas?|me\s+interesa|interesa(?:r|d[oa])?|comprar|me\s+gustar[ií]a|quisiera|necesito|busco|delivery|env[ií]os?|env[ií]an|ll[eé]vame|ll[eé]vate|tallas?|colores?|modelos?)\b/i

/**
 * Testimonial — elogio explícito.
 */
const PATRONES_TESTIMONIAL =
  /\b(gracias|excelente|recomiendo|encant[óo]|maravillos|incre[ií]ble|amazing|buenos?\s+profesional|s[uú]per|much[ií]simo|maravilla|cracks?|geni[oa]l|amo|amamos|me\s+encanta|nos\s+encanta|los?\s+(?:mejores|top|amo|adoro|admiro)|son\s+[uú]nic[oa]s?|tops?\s+(?:de\s+los\s+tops?)?|los\s+amo|me\s+encantan)\b/i

/**
 * Empatía / tema sensible compartido.
 */
const PATRONES_EMPATIA =
  /\b(lamentablement|tristeza|verdad\s+(?:que|es)|sufr|dolor|complicado|dif[íi]cil|terrible|injusto|tristement|me\s+pasa|yo\s+tambi[éi]n)\b/i

/**
 * Derivar — solo casos muy ambiguos / vacíos.
 */
const PATRONES_DERIVAR_AMBIGUO = /^(\?\?+|consult[ao]r?|informaci[óo]n|\?)$/i

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * ¿Es una reacción corta? Solo emojis no-risa o 1-3 palabras genéricas.
 * Si tiene emoji de risa ya lo capturó PATRONES_HUMOR antes.
 */
function esReaccionCorta(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  const sinEmojis = trimmed.replace(/\p{Extended_Pictographic}/gu, '').trim()
  if (sinEmojis.length <= 3) return true
  const palabras = trimmed.split(/\s+/).filter(Boolean)
  if (palabras.length <= 3 && !trimmed.includes('?')) return true
  return false
}

function tienePregunta(text: string): boolean {
  return text.includes('?') || text.includes('¿')
}

// ──────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────

export function clasificarComentario(text: string): ComentarioCategoria {
  const t = text.trim()
  if (t.length === 0) return 'otro'

  // 0. Spam → skip (no responder)
  if (PATRONES_SPAM.test(t)) return 'spam'

  // 1. Queja — tiene PRIORIDAD sobre info porque "nunca responden + me interesa X"
  //    debe responderse con disculpa primero, no con info pura.
  if (PATRONES_QUEJA.test(t)) return 'queja'

  // 2. Humor / votos / bromas — antes que info porque "ganó mi capo" tiene "ganó"
  //    pero no es pregunta comercial.
  if (PATRONES_HUMOR.test(t)) return 'humor'

  // 3. Muy ambiguo y corto
  if (PATRONES_DERIVAR_AMBIGUO.test(t)) return 'derivar'

  // 4. Pregunta info (con o sin signo, por keywords comerciales)
  if (PATRONES_INFO.test(t)) return 'pregunta_info'

  // 5. Pregunta vaga corta → derivar
  if (tienePregunta(t) && t.length < 30) return 'derivar'

  // 6. Pregunta larga sin keywords → asumimos pregunta_info (consulta detallada)
  if (tienePregunta(t)) return 'pregunta_info'

  // 7. Testimonial
  if (PATRONES_TESTIMONIAL.test(t)) return 'testimonial'

  // 8. Empatía
  if (PATRONES_EMPATIA.test(t)) return 'empatia'

  // 9. Reacción corta (solo emojis no-risa o 1-3 palabras)
  if (esReaccionCorta(t)) return 'reaccion'

  // 10. Fallback
  return 'otro'
}

// ──────────────────────────────────────────────────────────────────────────
// UI labels
// ──────────────────────────────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<
  ComentarioCategoria,
  { emoji: string; label: string; color: string }
> = {
  pregunta_info:  { emoji: '❓', label: 'Pregunta info',  color: '#3B82F6' },
  testimonial:    { emoji: '💙', label: 'Testimonial',    color: '#10B981' },
  empatia:        { emoji: '🤝', label: 'Empatía',        color: '#8B5CF6' },
  derivar:        { emoji: '📩', label: 'Derivar a DM',   color: '#F97316' },
  reaccion:       { emoji: '✨', label: 'Reacción',       color: '#EC4899' },
  queja:          { emoji: '😟', label: 'Queja',          color: '#EF4444' },
  humor:          { emoji: '😄', label: 'Humor',          color: '#F59E0B' },
  sensible:       { emoji: '🩺', label: 'Sensible',       color: '#DC2626' },
  spam:           { emoji: '🚫', label: 'Spam / Hate',    color: '#71717A' },
  otro:           { emoji: '💬', label: 'Otro',           color: '#6B7280' },
}
