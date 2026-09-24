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
  let previo = ''
  let conGlosario = false
  try {
    const form = await req.formData()
    file = form.get('audio')
    previo = String(form.get('previo') ?? '').slice(-400)
    conGlosario = form.get('glosario') === '1'
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

  /* Pedro 24-sep-2026 ("no escucha bien, confunde cosas"): gpt-4o-transcribe
     es MUCHO más preciso que whisper-1 en español y acepta un "prompt" con
     vocabulario: le pasamos los nombres de marcas y del equipo (Lámparas San
     Borja, Pieer, Ailyn…) y lo último que se dijo, para que no los confunda
     ni corte frases. Si falla, caemos a whisper-1. Probado: whisper escribía
     "lámpara Samborja / Pierre / Eileen"; gpt-4o-transcribe lo escribe bien. */
  const prompt = [conGlosario ? await glosario() : '', previo].filter(Boolean).join('\n').slice(-900)
  const pedir = (model: string) => {
    const fd = new FormData()
    fd.append('file', file as File, (file as File).name || 'audio.m4a')
    fd.append('model', model)
    fd.append('language', 'es')
    if (prompt) fd.append('prompt', prompt)
    return fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
      signal: AbortSignal.timeout(110000),
    })
  }

  try {
    let res = await pedir('gpt-4o-transcribe')
    if (!res.ok && res.status !== 401) res = await pedir('whisper-1')
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

/* Vocabulario de la agencia (marcas activas + equipo), cacheado 10 min. */
let cacheGlosario: { t: number; texto: string } | null = null
async function glosario(): Promise<string> {
  if (cacheGlosario && Date.now() - cacheGlosario.t < 600_000) return cacheGlosario.texto
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const [{ data: marcas }, { data: equipo }] = await Promise.all([
      service.from('marcas').select('nombre').eq('activa', true),
      service.from('team_members').select('nombre').eq('activo', true),
    ])
    const m = ((marcas ?? []) as { nombre: string }[]).map((x) => x.nombre).join(', ')
    const e = ((equipo ?? []) as { nombre: string }[]).map((x) => x.nombre).join(', ')
    const texto = `Reunión de la Agencia Distinto (marketing, Perú). Marcas: ${m}. Equipo: ${e}. Términos: grilla, reels, historias, guion, edición, grabación, copy, community manager.`
    cacheGlosario = { t: Date.now(), texto }
    return texto
  } catch { return '' }
}
