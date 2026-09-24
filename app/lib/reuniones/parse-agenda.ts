// app/lib/reuniones/parse-agenda.ts
//
// Interpreta una orden en lenguaje natural para AGENDAR una reunión, tipo
// "agenda para Manrique mañana 10am". Usa OpenAI (gpt-4o-mini) si hay
// OPENAI_API_KEY; si no, cae a un fallback heurístico (match de marca por
// nombre + parseo básico de "mañana/hoy" y "10am/3pm").
//
// Devuelve la marca (slug de la lista), la fecha (YYYY-MM-DD en Lima), la hora
// (HH:MM 24h), duración y un título. Los campos que no logra sacar quedan null
// para que la UI le pida al usuario completarlos. Pedro 25-ago-2026.

import { ymdLima } from '@/lib/fechas/hoy'
import { fechaExplicita, fechaValida } from './fecha-explicita'

export type AgendaParsed = {
  /* 'grabacion' si la frase habla de grabar ("grabación el 10 de octubre").
     Pedro 24-sep-2026. */
  tipo: 'reunion' | 'grabacion'
  marcaSlug: string | null
  fecha: string | null   // YYYY-MM-DD (Lima)
  hora: string | null    // HH:MM (24h)
  durationMin: number
  titulo: string
}

type MarcaLite = { slug: string; nombre: string }

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function hoyLimaDate(now: Date): { ymd: string; dow: number } {
  const ymd = ymdLima(now)
  const [y, m, d] = ymd.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  return { ymd, dow }
}

/* ============== OPENAI (preferido) ============== */
async function parseConOpenAI(texto: string, marcas: MarcaLite[], now: Date): Promise<AgendaParsed | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const { ymd, dow } = hoyLimaDate(now)
  const listaMarcas = marcas.map((m) => `${m.slug} — ${m.nombre}`).join('\n')
  const sistema = `Interpretas órdenes para AGENDAR REUNIONES de una agencia de marketing en Lima (zona America/Lima).
HOY es ${ymd} (${DIAS[dow]}).
Marcas disponibles (elige EXACTAMENTE un slug de esta lista, o null si no identificas la marca):
${listaMarcas}

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "marcaSlug": "slug exacto de la lista o null",
  "fecha": "YYYY-MM-DD resolviendo 'mañana', 'pasado mañana', 'el martes', 'el 5', etc. respecto a HOY en Lima; null si no se menciona",
  "hora": "HH:MM en 24h resolviendo '10am'->10:00, '3pm'->15:00, '10 y media'->10:30; null si no se menciona",
  "durationMin": número en minutos (default 45),
  "titulo": "asunto PROFESIONAL de la reunión. Si el usuario menciona el MOTIVO/TEMA, inclúyelo SIEMPRE, ej. 'agenda reunión vid natur para revisión de la web' → 'Revisión de la web · Vid Natur'. Sin motivo → 'Reunión con {nombre de la marca}'"
}
Reglas: NO inventes fecha ni hora si el usuario no las dijo (deja null). Una fecha explícita con día y mes SIEMPRE tiene prioridad sobre el día de la semana: 'jueves 01 de octubre' significa 1 de octubre, nunca el jueves más cercano. Sin año, usa la próxima ocurrencia de ese día y mes; respeta el año si está escrito. Solo 'el martes' SIN fecha explícita = el PRÓXIMO martes. NUNCA descartes el motivo de la reunión si el usuario lo dijo. Responde SOLO el JSON.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: texto }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) { console.error('[parse-agenda] OpenAI HTTP', res.status); return null }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    const p = JSON.parse(content) as Partial<AgendaParsed>
    const slug = typeof p.marcaSlug === 'string' && marcas.some((m) => m.slug === p.marcaSlug) ? p.marcaSlug : null
    return {
      tipo: 'reunion',
      marcaSlug: slug,
      fecha: fechaValida(String(p.fecha)) ? String(p.fecha) : null,
      hora: /^\d{1,2}:\d{2}$/.test(String(p.hora)) ? String(p.hora).padStart(5, '0') : null,
      durationMin: Number.isFinite(p.durationMin as number) && (p.durationMin as number) > 0 ? Math.round(p.durationMin as number) : 45,
      titulo: (p.titulo ? String(p.titulo) : 'Reunión').trim().slice(0, 90),
    }
  } catch (e) {
    console.error('[parse-agenda] OpenAI error:', e)
    return null
  }
}

/* ============== FALLBACK HEURÍSTICO ============== */
function parseFallback(texto: string, marcas: MarcaLite[], now: Date): AgendaParsed {
  const t = texto.toLowerCase()
  // Marca: match por primera palabra significativa del nombre o el slug.
  const marca = marcas.find((m) => {
    const nom = m.nombre.toLowerCase()
    const primeras = nom.split(/\s+/).filter((w) => w.length > 3)
    return t.includes(m.slug.toLowerCase()) || primeras.some((w) => t.includes(w))
  })
  // Fecha: hoy / mañana / pasado mañana / día de la semana.
  const { ymd, dow } = hoyLimaDate(now)
  const [y, mo, d] = ymd.split('-').map(Number)
  const addDays = (n: number) => {
    const dt = new Date(Date.UTC(y, mo - 1, d + n, 12))
    return dt.toISOString().slice(0, 10)
  }
  let fecha: string | null = null
  if (/pasado\s*mañana|pasado manana/.test(t)) fecha = addDays(2)
  else if (/mañana|manana/.test(t)) fecha = addDays(1)
  else if (/\bhoy\b/.test(t)) fecha = addDays(0)
  else {
    for (let i = 0; i < 7; i++) {
      if (t.includes(DIAS[i]) || (i === 3 && t.includes('miercoles')) || (i === 6 && t.includes('sabado'))) {
        const delta = (i - dow + 7) % 7 || 7 // el PRÓXIMO ese día
        fecha = addDays(delta); break
      }
    }
  }
  // Hora: "10am", "3 pm", "15:00", "10:30".
  let hora: string | null = null
  const mHM = t.match(/\b(\d{1,2}):(\d{2})\b/)
  const mAP = t.match(/\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/)
  if (mHM) hora = `${mHM[1].padStart(2, '0')}:${mHM[2]}`
  else if (mAP) {
    let h = parseInt(mAP[1], 10)
    const pm = /p/.test(mAP[2])
    if (pm && h < 12) h += 12
    if (!pm && h === 12) h = 0
    hora = `${String(h).padStart(2, '0')}:00`
  }
  return {
    tipo: 'reunion',
    marcaSlug: marca?.slug ?? null,
    fecha,
    hora,
    durationMin: 45,
    titulo: marca ? `Reunión con ${marca.nombre}` : 'Reunión',
  }
}

/* ¿Pide una GRABACIÓN (no una reunión)? "grabación", "grabar", "rodaje",
   "sesión de fotos/video". Si también dice "reunión", manda reunión. */
export function esGrabacion(texto: string): boolean {
  const t = texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/\breuni(on|ones)\b/.test(t)) return false
  return /grabaci|\bgrabar|\bgrabamos|\brodaje|sesion de (fotos|video)/.test(t)
}

export async function parseAgenda(texto: string, marcas: MarcaLite[], now = new Date()): Promise<AgendaParsed> {
  const explicita = fechaExplicita(texto, ymdLima(now))
  const ia = await parseConOpenAI(texto, marcas, now)
  // Si la IA no resolvió todo (o no hay key), completamos con el fallback.
  const fb = parseFallback(texto, marcas, now)
  const tipo = esGrabacion(texto) ? 'grabacion' : 'reunion'
  return {
    tipo,
    marcaSlug: ia?.marcaSlug ?? fb.marcaSlug,
    // An invalid explicit date must ask for clarification, never become "Thursday".
    fecha: explicita.encontrada ? explicita.fecha : ia?.fecha ?? fb.fecha,
    hora: ia?.hora ?? fb.hora,
    // Grabación: 2 h por defecto (una reunión, 45 min) salvo que la frase diga otra cosa.
    durationMin: tipo === 'grabacion' && !(ia && /\b(\d+)\s*(h|hora|min)/i.test(texto)) ? 120 : ia?.durationMin ?? fb.durationMin,
    titulo: ia?.titulo ?? fb.titulo,
  }
}
