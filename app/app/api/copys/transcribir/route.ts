// app/app/api/copys/transcribir/route.ts
//
// Transcribe un audio con OpenAI Whisper (whisper-1) y devuelve el texto, para
// el modo "generar copy en base a audio". Usamos un route handler (no un server
// action) para no chocar con el límite de body de los server actions. Pedro
// 15-jun-2026. Usa la MISMA API key de OpenAI (Settings / env).

import { requireUser } from '@/lib/auth/get-user'
import { getOpenAIApiKey } from '@/lib/integrations/openai'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  await requireUser()

  const apiKey = await getOpenAIApiKey()
  if (!apiKey) {
    return Response.json({ ok: false, error: 'Falta configurar tu API key de OpenAI en Settings → IA.' }, { status: 400 })
  }

  let file: unknown
  try {
    const form = await req.formData()
    file = form.get('audio')
  } catch {
    return Response.json({ ok: false, error: 'No pude leer el audio enviado.' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ ok: false, error: 'No se recibió ningún audio.' }, { status: 400 })
  }
  // Whisper acepta hasta 25MB. Avisamos antes para no fallar feo.
  if (file.size > 25 * 1024 * 1024) {
    return Response.json({ ok: false, error: 'El audio supera 25MB. Usa uno más corto o comprimido.' }, { status: 400 })
  }

  const fd = new FormData()
  fd.append('file', file, file.name || 'audio.m4a')
  fd.append('model', 'whisper-1')
  fd.append('language', 'es')

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
      signal: AbortSignal.timeout(110000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if (res.status === 401) return Response.json({ ok: false, error: 'API key de OpenAI inválida (401).' }, { status: 502 })
      return Response.json({ ok: false, error: `OpenAI ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}` }, { status: 502 })
    }
    const json = await res.json()
    const text = String(json?.text ?? '').trim()
    if (!text) return Response.json({ ok: false, error: 'El audio no devolvió transcripción. Intenta con otro.' }, { status: 502 })
    return Response.json({ ok: true, text })
  } catch (e) {
    const msg = (e as Error)?.name === 'TimeoutError' ? 'La transcripción tardó demasiado (timeout).' : (e as Error).message
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
