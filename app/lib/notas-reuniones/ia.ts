import 'server-only'

/* IA de Notas y reuniones (estilo Granola): llamada única a OpenAI
   (gpt-4o-mini) con respaldo en Anthropic si OpenAI falla o no hay key.
   Mismo esquema de keys que el chat de la nota (Settings → integraciones). */

import { getOpenAIApiKey } from '@/lib/integrations/openai'
import { getAnthropicApiKey } from '@/lib/integrations/anthropic'

type Resultado = { ok: true; texto: string } | { ok: false; error: string }

export async function completarIA(opts: {
  sistema: string
  usuario: string
  json?: boolean
  maxTokens?: number
}): Promise<Resultado> {
  let ultimoError = ''

  const openaiKey = await getOpenAIApiKey()
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: opts.maxTokens ?? 1800,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: opts.sistema },
            { role: 'user', content: opts.usuario },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (res.ok) {
        const j = await res.json()
        const t = String(j?.choices?.[0]?.message?.content ?? '').trim()
        if (t) return { ok: true, texto: t }
      } else {
        ultimoError = `OpenAI respondió ${res.status}`
      }
    } catch (e) {
      ultimoError = e instanceof Error ? e.message : 'Error con OpenAI'
    }
  }

  const anthropicKey = await getAnthropicApiKey()
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: opts.maxTokens ?? 1800,
          system: opts.sistema + (opts.json ? '\nResponde SOLO con JSON válido, sin texto extra.' : ''),
          messages: [{ role: 'user', content: opts.usuario }],
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (res.ok) {
        const j = await res.json()
        const parts = Array.isArray(j?.content) ? j.content : []
        const t = parts.map((p: { text?: string }) => p.text ?? '').join('').trim()
        if (t) return { ok: true, texto: t }
      } else {
        ultimoError = ultimoError || `Anthropic respondió ${res.status}`
      }
    } catch (e) {
      ultimoError = ultimoError || (e instanceof Error ? e.message : 'Error con Anthropic')
    }
  }

  if (!openaiKey && !anthropicKey) return { ok: false, error: 'Falta la API key de IA (Settings → Integraciones).' }
  return { ok: false, error: ultimoError || 'La IA no respondió.' }
}

/* Extrae el primer objeto JSON de un texto (por si la IA agrega algo alrededor). */
export function leerJSON<T>(texto: string): T | null {
  try { return JSON.parse(texto) as T } catch { /* sigue */ }
  const i = texto.indexOf('{')
  const j = texto.lastIndexOf('}')
  if (i >= 0 && j > i) {
    try { return JSON.parse(texto.slice(i, j + 1)) as T } catch { /* nada */ }
  }
  return null
}
