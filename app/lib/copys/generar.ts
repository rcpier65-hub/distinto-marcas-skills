// app/lib/copys/generar.ts
//
// Generación de copys de publicaciones con Claude (Anthropic), replicando el
// flujo que Pedro hacía en Notion: "Claude, analiza el guion de esta pieza y
// hazme copys con la voz de la marca".
//
// Contexto que recibe el modelo (clave de la calidad):
//   - Voz de la marca (marcas.tono_voz: tono, arquetipo, instrucciones)
//   - Datos canon (marca_facts: web, whatsapp, puntos de venta, productos,
//     frases canon vs frases prohibidas)
//   - El guion de la pieza + tipo de contenido + plataformas
//
// Devuelve 3 opciones para que Pedro elija. Raw fetch al endpoint de Messages
// (no hay SDK instalado; el resto del código llama LLMs por fetch — ver
// lib/integrations/openai.ts). Modelo: claude-opus-4-8.

import { getAnthropicApiKey } from '@/lib/integrations/anthropic'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-opus-4-8'

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
  const apiKey = await getAnthropicApiKey()
  if (!apiKey) {
    return {
      ok: false,
      error: 'Falta configurar tu API key de Anthropic. Ve a Settings → IA (Claude) y pégala.',
    }
  }

  const { voz, instrucciones } = vozATexto(input.tonoVoz)
  const factsTxt = factsATexto(input.facts)
  const guion = (input.guion ?? '').trim()
  const copyActual = (input.copyActual ?? '').trim()

  const system = [
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
    '- Usa emojis con criterio (no en exceso) y, si aplica, 3-8 hashtags relevantes al final.',
    '- NO inventes precios, cifras, promociones, certificaciones ni datos que no estén en el contexto. Si falta un dato, invita a escribir por DM/WhatsApp.',
    '- Largo apropiado para caption de IG/FB (máximo ~2200 caracteres).',
    'Genera EXACTAMENTE 3 opciones de copy DISTINTAS entre sí (distinto ángulo/hook), todas fieles a la voz de la marca.',
  ].filter(Boolean).join('\n')

  const userParts = [
    `Tema/título de la pieza: ${input.nombre || '(sin título)'}`,
    input.tipoContenido?.length ? `Tipo de contenido: ${input.tipoContenido.join(', ')}` : '',
    input.plataformas?.length ? `Plataforma(s): ${input.plataformas.join(', ')}` : '',
    guion
      ? `\nGUION DE LA PIEZA (analízalo y basa el copy en él):\n${guion.slice(0, 6000)}`
      : '\n(No hay guion cargado: básate en el tema, el tipo de contenido y la voz de la marca.)',
    copyActual ? `\nCopy actual (puedes mejorarlo o variar el ángulo):\n${copyActual.slice(0, 2200)}` : '',
    '\nDevuelve las 3 opciones.',
  ].filter(Boolean).join('\n')

  const body = {
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: userParts }],
    output_config: {
      effort: 'medium',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            opciones: {
              type: 'array',
              description: 'Exactamente 3 copys distintos, listos para publicar.',
              items: { type: 'string' },
            },
          },
          required: ['opciones'],
          additionalProperties: false,
        },
      },
    },
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      if (res.status === 401) return { ok: false, error: 'API key de Anthropic inválida (401). Revisa que la copiaste completa.' }
      if (res.status === 429) return { ok: false, error: 'Límite alcanzado o sin crédito (429). Carga saldo en console.anthropic.com.' }
      if (res.status === 529) return { ok: false, error: 'Claude está sobrecargado ahora mismo (529). Vuelve a intentar en un momento.' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (errBody as any)?.error?.message ?? `HTTP ${res.status}`
      return { ok: false, error: `Error de Anthropic: ${msg}` }
    }

    const json = await res.json()
    // Con output_config.format el primer bloque de texto es JSON válido.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlock = (json?.content as any[] | undefined)?.find((b) => b?.type === 'text')
    const raw: string | undefined = textBlock?.text
    if (!raw) return { ok: false, error: 'Claude no devolvió contenido. Intenta de nuevo.' }

    let parsed: { opciones?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'No pude leer la respuesta de Claude. Intenta de nuevo.' }
    }

    const opciones = Array.isArray(parsed.opciones)
      ? parsed.opciones.map((o) => String(o ?? '').trim()).filter(Boolean)
      : []
    if (opciones.length === 0) return { ok: false, error: 'Claude no generó copys. Intenta de nuevo.' }

    return { ok: true, opciones: opciones.slice(0, 3) }
  } catch (e) {
    const msg = (e as Error)?.name === 'TimeoutError'
      ? 'Claude tardó demasiado (timeout). Intenta de nuevo.'
      : `Error de red: ${(e as Error).message}`
    return { ok: false, error: msg }
  }
}
