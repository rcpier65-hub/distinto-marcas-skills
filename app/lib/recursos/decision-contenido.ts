export type ContentObjective = 'alcance' | 'autoridad' | 'leads' | 'ventas'

export type ContentMetrics = {
  title: string
  platform: string
  objective: ContentObjective
  duration: number
  views: number
  averageWatch: number
  completion: number
  saves: number
  shares: number
  profileVisits: number
  clicks: number
  leads: number
  sales: number
  attempts: number
  baselineViews?: number
  baselineWatch?: number
  baselineCompletion?: number
  baselineSaves?: number
  baselineShares?: number
  baselineClicks?: number
}

export type ContentDecision = 'repetir' | 'corregir' | 'reformular' | 'retestear' | 'archivar'

export type ContentDiagnosis = {
  decision: ContentDecision
  label: string
  summary: string
  confidence: 'alta' | 'media'
  score: number
  scores: { attention: number; connection: number; intent: number; business: number }
  strength: string
  bottleneck: string
  keep: string[]
  change: string[]
  nextTest: string
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))
const safeRate = (value: number, base: number) => base > 0 ? value / base : 0
const scaled = (value: number, weak: number, strong: number) => clamp(((value - weak) / (strong - weak)) * 100)
const compare = (value: number, baseline?: number) => baseline && baseline > 0 ? clamp((value / baseline) * 62.5) : null
const average = (...values: Array<number | null>) => {
  const usable = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0
}

export function diagnoseContent(input: ContentMetrics): ContentDiagnosis {
  const watchRatio = safeRate(input.averageWatch, input.duration) * 100
  const viewsComparison = compare(input.views, input.baselineViews)
  const watchComparison = compare(input.averageWatch, input.baselineWatch)
  const completionComparison = compare(input.completion, input.baselineCompletion)
  const interactionRate = safeRate(input.saves + input.shares, input.views) * 100
  const baselineInteraction = input.baselineViews
    ? safeRate((input.baselineSaves ?? 0) + (input.baselineShares ?? 0), input.baselineViews) * 100
    : undefined
  const interactionComparison = compare(interactionRate, baselineInteraction)
  const intentRate = safeRate(input.profileVisits + input.clicks + input.leads * 4, input.views) * 100
  const baselineClickRate = input.baselineViews
    ? safeRate(input.baselineClicks ?? 0, input.baselineViews) * 100
    : undefined
  const intentComparison = compare(intentRate, baselineClickRate)

  const attention = Math.round(average(
    scaled(watchRatio, 18, 62),
    scaled(input.completion, 8, 55),
    viewsComparison,
    watchComparison,
    completionComparison,
  ))
  const connection = Math.round(average(
    scaled(interactionRate, 0.25, 3),
    interactionComparison,
  ))
  const intent = Math.round(average(
    scaled(intentRate, 0.1, 2.5),
    intentComparison,
  ))
  const business = Math.round(clamp(
    input.sales > 0 ? 100 : input.leads > 0 ? 72 + Math.min(24, input.leads * 4) : input.clicks > 0 ? 42 + Math.min(24, input.clicks) : 18,
  ))

  const weights = input.objective === 'alcance'
    ? { attention: .45, connection: .35, intent: .15, business: .05 }
    : input.objective === 'autoridad'
      ? { attention: .30, connection: .40, intent: .20, business: .10 }
      : input.objective === 'leads'
        ? { attention: .20, connection: .20, intent: .35, business: .25 }
        : { attention: .15, connection: .15, intent: .25, business: .45 }
  const score = Math.round(
    attention * weights.attention + connection * weights.connection + intent * weights.intent + business * weights.business,
  )

  let decision: ContentDecision
  if (score >= 70 && attention >= 55 && (connection >= 50 || intent >= 50 || business >= 70)) decision = 'repetir'
  else if (attention < 48 && Math.max(connection, intent, business) >= 50) decision = 'corregir'
  else if (attention >= 55 && intent < 38 && ['leads', 'ventas'].includes(input.objective)) decision = 'reformular'
  else if (input.attempts >= 3 && score < 38 && attention < 45 && connection < 45) decision = 'archivar'
  else decision = 'retestear'

  const copy: Record<ContentDecision, { label: string; summary: string }> = {
    repetir: { label: 'Repetir con una variación', summary: 'La idea produjo señales suficientes para construir una serie. Conserva su promesa central y cambia una sola variable.' },
    corregir: { label: 'Corregir el empaque', summary: 'Existe interés después del inicio, pero el gancho o el ritmo impiden que más personas lleguen al valor.' },
    reformular: { label: 'Reformular la conversión', summary: 'El contenido retiene, pero no mueve a la acción esperada. La promesa, el puente a la oferta o el CTA necesitan precisión.' },
    retestear: { label: 'Retestear una hipótesis', summary: 'La evidencia todavía no permite escalar ni descartar. Haz una segunda versión cambiando una sola variable medible.' },
    archivar: { label: 'Archivar esta hipótesis', summary: 'Después de varias pruebas, la idea sigue débil en atención y conexión. Conserva el aprendizaje y libera espacio para otra hipótesis.' },
  }

  const dimensions = [
    { key: 'atención', value: attention },
    { key: 'conexión', value: connection },
    { key: 'intención', value: intent },
    { key: 'resultado comercial', value: business },
  ].sort((a, b) => b.value - a.value)

  const keep = decision === 'repetir'
    ? ['La promesa o tensión central', dimensions[0].key === 'conexión' ? 'El tema que provocó guardados y compartidos' : 'El elemento que sostuvo la atención']
    : [dimensions[0].value >= 50 ? `La señal más fuerte: ${dimensions[0].key}` : 'El aprendizaje sobre lo que no movilizó a la audiencia']

  const change = attention < 50
    ? ['Mostrar la consecuencia en los primeros 2 segundos', 'Recortar contexto y llegar antes a la prueba o demostración']
    : intent < 40
      ? ['Nombrar el siguiente paso con una acción concreta', 'Conectar el valor del video con un problema que el servicio resuelve']
      : connection < 45
        ? ['Añadir una postura, comparación o utilidad que merezca guardarse', 'Usar un ejemplo específico del cliente ideal']
        : ['Cambiar solo el ángulo o ejemplo para validar que el resultado es repetible']

  const nextTest = attention < 50
    ? 'Publica la misma idea con el resultado primero, elimina la introducción y mide retención antes de cambiar el tema.'
    : intent < 40
      ? 'Mantén el cuerpo y prueba un CTA ligado a un recurso concreto; mide visitas, clics y consultas, no solo vistas.'
      : connection < 45
        ? 'Convierte la idea en una comparación contracorriente o una lista aplicable y mide guardados + compartidos.'
        : 'Crea una segunda pieza con la misma promesa y un ejemplo distinto; si repite la señal, conviértela en serie.'

  const hasBaseline = Boolean(input.baselineViews || input.baselineWatch || input.baselineCompletion)
  return {
    decision,
    label: copy[decision].label,
    summary: copy[decision].summary,
    confidence: hasBaseline ? 'alta' : 'media',
    score,
    scores: { attention, connection, intent, business },
    strength: `${dimensions[0].key[0].toUpperCase()}${dimensions[0].key.slice(1)} (${dimensions[0].value}/100)`,
    bottleneck: `${dimensions.at(-1)!.key[0].toUpperCase()}${dimensions.at(-1)!.key.slice(1)} (${dimensions.at(-1)!.value}/100)`,
    keep,
    change,
    nextTest,
  }
}
