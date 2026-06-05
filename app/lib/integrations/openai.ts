// app/lib/integrations/openai.ts
//
// Generador de respuestas a comentarios con OpenAI (gpt-4o-mini).
// Best-effort: si no hay OPENAI_API_KEY o la API falla, devuelve null y el
// flujo que lo llama sigue sin romperse (el comentario igual se carga, solo
// queda sin borrador).
//
// El contexto que recibe el modelo es la clave de la calidad:
//   - Voz de la marca (marcas.tono_voz)
//   - Texto del post (de qué trata la publicación que comentaron)
//   - El comentario + autor + red social

import type { ComentarioCategoria } from '@/lib/types/database'
import { createServiceClient } from '@/lib/supabase/service'

const CATEGORIAS: ComentarioCategoria[] = [
  'pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion',
  'queja', 'humor', 'sensible', 'spam', 'otro',
]

export type GenComentarioInput = {
  marcaNombre: string
  tonoVoz: unknown            // marcas.tono_voz (jsonb): { tono, arquetipo, emojis_vetados? }
  network: string             // instagram | facebook | tiktok
  postTexto: string | null    // contexto: de qué trata el post
  comentario: string          // el comentario del usuario
  autor: string | null
}

export type GenComentarioResult = { respuesta: string; categoria: ComentarioCategoria }

/** Convierte el jsonb de tono_voz en una línea legible para el prompt. */
function vozATexto(tono: unknown): string {
  if (!tono || typeof tono !== 'object') return ''
  const t = tono as Record<string, unknown>
  const parts: string[] = []
  if (t.tono) parts.push(`tono ${String(t.tono)}`)
  if (t.arquetipo) parts.push(`arquetipo ${String(t.arquetipo)}`)
  if (Array.isArray(t.emojis_vetados) && t.emojis_vetados.length) {
    parts.push(`NO uses estos emojis: ${(t.emojis_vetados as unknown[]).join(' ')}`)
  }
  return parts.join(' · ')
}

/**
 * Resuelve la API key de OpenAI. Prioridad:
 *   1. integraciones.openai_api_key (configurada desde /settings)
 *   2. process.env.OPENAI_API_KEY (fallback Vercel)
 * Devuelve null si no hay ninguna. Tolera que la columna/tabla no exista aún.
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data, error } = await service
      .from('integraciones')
      .select('openai_api_key')
      .eq('id', 1)
      .maybeSingle()
    if (!error && data?.openai_api_key) return String(data.openai_api_key)
  } catch {
    /* tabla/columna puede no existir todavía → caemos al env */
  }
  return process.env.OPENAI_API_KEY || null
}

/**
 * Genera una respuesta sugerida para un comentario, según marca + post + comentario.
 * Devuelve null si no hay key o si la generación falla (best-effort).
 */
export async function generarRespuestaComentario(
  input: GenComentarioInput,
): Promise<GenComentarioResult | null> {
  const apiKey = await getOpenAIApiKey()
  if (!apiKey) return null

  const voz = vozATexto(input.tonoVoz)

  const system = [
    `Eres community manager de la agencia Distinto y respondes comentarios públicos de la marca "${input.marcaNombre}" en redes sociales.`,
    voz ? `Voz de la marca: ${voz}.` : '',
    'REGLAS DE RESPUESTA:',
    '- Español peruano natural, tuteo ("tú tienes", "escríbenos"). NUNCA voseo ("tenés", "escribime") ni "che/boludo".',
    '- Respuestas CORTAS (1 o 2 frases). Cálidas, humanas, que suenen a persona y no a bot.',
    '- Emojis con moderación (0 a 2).',
    '- Si preguntan por precios, stock, pedidos, delivery o un dato que no aparece en el contexto: invita amablemente a escribir por mensaje directo (DM) o WhatsApp. NUNCA inventes precios, cifras ni datos.',
    '- No prometas resultados (salud, suplementos, fitness). No inventes certificaciones, ingredientes ni promociones.',
    '- Comentarios sensibles (salud mental, quejas serias): responde con empatía y deriva a un canal privado.',
    '- Spam o insulto puro: respuesta neutral y breve; clasifícalo como "spam".',
    'Clasifica el comentario en UNA categoría: pregunta_info, testimonial, empatia, derivar, reaccion, queja, humor, sensible, spam, otro.',
    'Responde SOLO en formato JSON: {"respuesta": "<texto>", "categoria": "<categoria>"}.',
  ].filter(Boolean).join('\n')

  const user = [
    `Red social: ${input.network}`,
    input.postTexto ? `Publicación (contexto): ${String(input.postTexto).slice(0, 600)}` : 'Publicación: (sin texto disponible)',
    input.autor ? `Autor del comentario: @${input.autor}` : '',
    `Comentario a responder: "${input.comentario}"`,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null

    const json = await res.json()
    const content: string | undefined = json?.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as { respuesta?: string; categoria?: string }
    const respuesta = (parsed.respuesta ?? '').trim()
    if (!respuesta) return null

    const categoria: ComentarioCategoria = CATEGORIAS.includes(parsed.categoria as ComentarioCategoria)
      ? (parsed.categoria as ComentarioCategoria)
      : 'otro'

    return { respuesta, categoria }
  } catch {
    return null
  }
}
