// app/app/api/creacion-ideas/generar/route.ts
// Genera un guion viral (framework VIRAL) con Claude, para el módulo
// "Creación de Ideas". La API key de Anthropic vive en el servidor (integraciones
// o env) y NUNCA se expone al cliente. El módulo (iframe, mismo origen) hace POST
// acá; requireUser valida la sesión por cookie.
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { getOpenAIApiKey } from '@/lib/integrations/openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STEPS = [
  { key: 'V', name: 'Verbal', purpose: 'Gancho hablado (primeros 3s)' },
  { key: 'I', name: 'Imán', purpose: 'Retención / promesa' },
  { key: 'R', name: 'Respaldo', purpose: 'Prueba / credibilidad' },
  { key: 'A', name: 'Anuncio', purpose: 'Núcleo / valor' },
  { key: 'L', name: 'Lista / CTA', purpose: 'Cierre + un solo CTA' },
]

export async function POST(req: Request) {
  await requireUser()
  const key = await getOpenAIApiKey()
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'No hay API key de OpenAI configurada (ponla en Settings).' },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}
  try { body = await req.json() } catch { /* body vacío */ }
  const idea = String(body.idea ?? '').trim().slice(0, 500)
  if (!idea) return NextResponse.json({ ok: false, error: 'Falta la idea' }, { status: 400 })
  const niche = String(body.niche ?? '').slice(0, 80)
  const platform = String(body.platform ?? 'TikTok').slice(0, 40)
  const goal = String(body.goal ?? '').slice(0, 80)
  const hook = String(body.hook ?? '').slice(0, 300)

  const system = `Eres un guionista experto en videos verticales virales (TikTok/Reels) en español peruano neutro (tuteo). Escribes guiones HABLADOS, listos para leer en cámara: cortos, con ritmo y naturales. Usas el framework VIRAL de 5 pasos:
V (Verbal): gancho hablado en los primeros 3 segundos que frene el scroll.
I (Imán): promesa que retiene, adelanta lo que viene.
R (Respaldo): prueba o credibilidad.
A (Anuncio): el núcleo, el valor real o el paso a paso.
L (Lista / CTA): cierre con UN solo llamado a la acción.
Reglas: cada paso = 1 a 2 frases habladas. Sin emojis, sin hashtags, sin acotaciones de escena, sin encabezados. Devuelve SOLO JSON válido, nada más.`

  const userMsg = `Tema del video: "${idea}".
${niche ? `Nicho: ${niche}. ` : ''}${platform ? `Plataforma: ${platform}. ` : ''}${goal ? `Objetivo: ${goal}. ` : ''}${hook ? `Gancho sugerido: "${hook}". ` : ''}
Devuelve exactamente:
{"steps":[{"key":"V","text":"..."},{"key":"I","text":"..."},{"key":"R","text":"..."},{"key":"A","text":"..."},{"key":"L","text":"..."}]}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ ok: false, error: `OpenAI ${res.status}: ${t.slice(0, 180)}` }, { status: 502 })
    }
    const data = await res.json()
    const rawText: string = (data?.choices?.[0]?.message?.content ?? '').trim()
    const match = rawText.match(/\{[\s\S]*\}/)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = null
    try { parsed = JSON.parse(match ? match[0] : rawText) } catch { /* no parseó */ }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepsIn: any[] = Array.isArray(parsed?.steps) ? parsed.steps : []
    const steps = STEPS.map((def) => {
      const found = stepsIn.find((s) => String(s?.key ?? '').toUpperCase() === def.key)
      return { key: def.key, name: def.name, purpose: def.purpose, text: String(found?.text ?? '').trim() }
    })
    if (steps.some((s) => !s.text)) {
      return NextResponse.json({ ok: false, error: 'La IA devolvió una respuesta incompleta.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, steps })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
