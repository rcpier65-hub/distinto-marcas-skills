// app/lib/copys/generar.ts
//
// Generación de copys de publicaciones con OpenAI (gpt-4o), replicando el
// flujo que Pedro hacía en Notion: "analiza el guion de esta pieza y
// hazme copys con la voz de la marca".
//
// Pedro 15-jun-2026: el copy debe funcionar con OpenAI (NO Anthropic). Usa la
// MISMA key de OpenAI que las respuestas de comentarios (integraciones.openai_api_key,
// configurada en Settings, o env OPENAI_API_KEY). Ver lib/integrations/openai.ts.
//
// Contexto que recibe el modelo (clave de la calidad):
//   - Voz de la marca (marcas.tono_voz: tono, arquetipo, instrucciones)
//   - Datos canon (marca_facts: web, whatsapp, puntos de venta, productos,
//     frases canon vs frases prohibidas)
//   - El guion de la pieza + tipo de contenido + plataformas
//
// Devuelve 3 opciones para que Pedro elija. Raw fetch a chat/completions.

import { getOpenAIApiKey } from '@/lib/integrations/openai'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o'

export type GenerarCopysInput = {
  marcaNombre: string
  tonoVoz: unknown // marcas.tono_voz (jsonb): { tono, arquetipo, instrucciones?, emojis_vetados? }
  // marca_facts (canon) — todo opcional
  facts?: {
    nombre_comercial?: string | null
    web_principal?: string | null
    whatsapp_principal?: string | null
    puntos_venta?: string[] | null
    proximamente?: string[] | null
    productos_datos?: unknown
    frases_prohibidas?: string[] | null
    frases_canon?: string[] | null
    notas?: string | null
  } | null
  nombre: string // título / tema de la pieza
  guion: string // el guion técnico (puede venir vacío)
  tipoContenido: string[] // REEL, POST, CARRUSEL...
  plataformas: string[] // Instagram, Facebook, Tiktok...
  copyActual?: string // copy ya escrito (para "mejóralo" / variar)
  /* Prompt editable de la marca (lo configura Pedro en /publicaciones). Si está
     presente, MANDA: es el contexto + reglas + ejemplos de la marca y reemplaza
     al system auto-armado. Fix Pedro 15-jun-2026 ("genera sin contexto"). */
  promptMarca?: string | null
  /* Transcripción de un audio (modo "generar en base a audio"). */
  transcript?: string | null
}

export type GenerarCopysResult =
  | { ok: true; opciones: string[] }
  | { ok: false; error: string }

/** Convierte el jsonb de tono_voz en líneas legibles para el prompt. */
function vozATexto(tono: unknown): { voz: string; instrucciones: string } {
  if (!tono || typeof tono !== 'object') return { voz: '', instrucciones: '' }
  const t = tono as Record<string, unknown>
  const parts: string[] = []
  if (t.tono) parts.push(`tono ${String(t.tono)}`)
  if (t.arquetipo) parts.push(`arquetipo ${String(t.arquetipo)}`)
  if (Array.isArray(t.emojis_vetados) && t.emojis_vetados.length) {
    parts.push(`NO uses estos emojis: ${(t.emojis_vetados as unknown[]).join(' ')}`)
  }
  const instrucciones = typeof t.instrucciones === 'string' ? t.instrucciones.trim() : ''
  return { voz: parts.join(' · '), instrucciones }
}

function factsATexto(facts: GenerarCopysInput['facts']): string {
  if (!facts) return ''
  const l: string[] = []
  if (facts.nombre_comercial) l.push(`Nombre comercial actual: ${facts.nombre_comercial}`)
  if (facts.web_principal) l.push(`Web: ${facts.web_principal}`)
  if (facts.whatsapp_principal) l.push(`WhatsApp: ${facts.whatsapp_principal}`)
  if (facts.puntos_venta?.length) l.push(`Puntos de venta: ${facts.puntos_venta.join(', ')}`)
  if (facts.proximamente?.length) l.push(`Próximamente: ${facts.proximamente.join(', ')}`)
  if (facts.productos_datos && typeof facts.productos_datos === 'object' && Object.keys(facts.productos_datos as object).length) {
    l.push(`Datos de producto (verificables — NO inventes otros): ${JSON.stringify(facts.productos_datos)}`)
  }
  if (facts.frases_canon?.length) l.push(`Frases canon (úsalas / inspírate): ${facts.frases_canon.join(' | ')}`)
  if (facts.frases_prohibidas?.length) l.push(`Frases PROHIBIDAS (NUNCA las uses): ${facts.frases_prohibidas.join(' | ')}`)
  if (facts.notas) l.push(`Notas: ${facts.notas}`)
  return l.join('\n')
}

/**
 * Genera 3 opciones de copy. Best-effort tipado: devuelve {ok:false,error} con
 * mensaje en español si falta la key o si la API falla, para mostrarlo en la UI.
 */
export async function generarCopysIA(input: GenerarCopysInput): Promise<GenerarCopysResult> {
  const apiKey = await getOpenAIApiKey()
  if (!apiKey) {
    return {
      ok: false,
      error: 'Falta configurar tu API key de OpenAI. Ve a Settings → IA y pégala.',
    }
  }

  const { voz, instrucciones } = vozATexto(input.tonoVoz)
  const factsTxt = factsATexto(input.facts)
  const guion = (input.guion ?? '').trim()
  const copyActual = (input.copyActual ?? '').trim()
  const transcript = (input.transcript ?? '').trim()
  const promptMarca = (input.promptMarca ?? '').trim()

  /* Reglas de formato que SIEMPRE aplican (incluso cuando manda el prompt de la
     marca). Pedro: máximo 3 hashtags. */
  const FORMATO = [
    'REGLAS DE FORMATO (obligatorias):',
    '- Español peruano natural, tuteo ("tú tienes", "escríbenos"). NUNCA voseo ("tenés") ni "che/boludo".',
    '- MÁXIMO 3 hashtags al final (puede ser menos, o ninguno si el estilo de la marca no usa hashtags).',
    '- NO inventes precios, cifras, promociones ni datos que no estén en el contexto.',
    '- Genera EXACTAMENTE 3 opciones de copy DISTINTAS entre sí (distinto ángulo/hook).',
    'Responde SOLO en formato JSON con esta forma exacta: {"opciones": ["copy 1", "copy 2", "copy 3"]}.',
  ].join('\n')

  /* Si la marca tiene su prompt configurado, ESE es el contexto (incluye su voz,
     reglas y ejemplos). Reemplaza al system auto-armado. */
  const system = promptMarca
    ? [
        `Eres copywriter de la agencia Distinto y escribes copys para la marca "${input.marcaNombre}".`,
        'Sigue AL PIE DE LA LETRA el siguiente contexto, reglas y ejemplos de la marca:',
        '',
        promptMarca,
        '',
        FORMATO,
      ].join('\n')
    : [
        `Eres copywriter de la agencia Distinto y escribes copys para redes sociales de la marca "${input.marcaNombre}".`,
        voz ? `Voz de la marca: ${voz}.` : '',
        instrucciones
          ? `\n⚡ INSTRUCCIONES ESPECÍFICAS DE LA MARCA (MÁXIMA PRIORIDAD, mandan sobre las reglas generales):\n${instrucciones}\n`
          : '',
        factsTxt ? `\nDATOS CANON DE LA MARCA:\n${factsTxt}\n` : '',
        'REGLAS GENERALES:',
        '- Español peruano natural, tuteo ("tú tienes", "escríbenos"). NUNCA voseo ("tenés", "escribime") ni "che/boludo".',
        '- Adapta el copy a la(s) plataforma(s) y al tipo de contenido indicados.',
        '- Engancha en la primera línea (hook). Cierra con un llamado a la acción claro.',
        '- Usa emojis con criterio (no en exceso) y MÁXIMO 3 hashtags al final.',
        '- NO inventes precios, cifras, promociones, certificaciones ni datos que no estén en el contexto. Si falta un dato, invita a escribir por DM/WhatsApp.',
        '- Largo apropiado para caption de IG/FB (máximo ~2200 caracteres).',
        'Genera EXACTAMENTE 3 opciones de copy DISTINTAS entre sí (distinto ángulo/hook), todas fieles a la voz de la marca.',
        'Responde SOLO en formato JSON con esta forma exacta: {"opciones": ["copy 1", "copy 2", "copy 3"]}.',
      ].filter(Boolean).join('\n')

  const userParts = [
    `Tema/título de la pieza: ${input.nombre || '(sin título)'}`,
    input.tipoContenido?.length ? `Tipo de contenido: ${input.tipoContenido.join(', ')}` : '',
    input.plataformas?.length ? `Plataforma(s): ${input.plataformas.join(', ')}` : '',
    transcript
      ? `\nTRANSCRIPCIÓN DEL AUDIO (el copy debe basarse en lo que se dice acá):\n${transcript.slice(0, 6000)}`
      : '',
    guion
      ? `\nGUION DE LA PIEZA (analízalo y basa el copy en él; el copy COMPLEMENTA el video, no lo repite):\n${guion.slice(0, 6000)}`
      : (transcript ? '' : '\n(No hay guion ni audio: básate en el tema, el tipo de contenido y la voz de la marca.)'),
    copyActual ? `\nCopy actual (puedes mejorarlo o variar el ángulo):\n${copyActual.slice(0, 2200)}` : '',
    '\nDevuelve las 3 opciones.',
  ].filter(Boolean).join('\n')

  const body = {
    model: MODEL,
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userParts },
    ],
  }

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      if (res.status === 401) return { ok: false, error: 'API key de OpenAI inválida (401). Revisa que la copiaste completa en Settings.' }
      if (res.status === 429) return { ok: false, error: 'Límite alcanzado o sin crédito (429). Carga saldo en platform.openai.com.' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (errBody as any)?.error?.message ?? `HTTP ${res.status}`
      return { ok: false, error: `Error de OpenAI: ${msg}` }
    }

    const json = await res.json()
    const raw: string | undefined = json?.choices?.[0]?.message?.content
    if (!raw) return { ok: false, error: 'OpenAI no devolvió contenido. Intenta de nuevo.' }

    let parsed: { opciones?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'No pude leer la respuesta de OpenAI. Intenta de nuevo.' }
    }

    const opciones = Array.isArray(parsed.opciones)
      ? parsed.opciones.map((o) => String(o ?? '').trim()).filter(Boolean)
      : []
    if (opciones.length === 0) return { ok: false, error: 'OpenAI no generó copys. Intenta de nuevo.' }

    return { ok: true, opciones: opciones.slice(0, 3) }
  } catch (e) {
    const msg = (e as Error)?.name === 'TimeoutError'
      ? 'OpenAI tardó demasiado (timeout). Intenta de nuevo.'
      : `Error de red: ${(e as Error).message}`
    return { ok: false, error: msg }
  }
}
