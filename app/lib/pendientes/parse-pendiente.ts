// app/lib/pendientes/parse-pendiente.ts
//
// Parser de un mensaje en lenguaje natural a un pendiente estructurado.
// Usa OpenAI (gpt-4o-mini) si OPENAI_API_KEY está configurada, sino cae
// a un fallback heurístico basado en regex/keyword matching.
//
// Pedro pidió: el user escribe en lenguaje natural en un chat tipo
// ChatGPT, y la app interpreta automáticamente:
//   - Título limpio (no "necesito mandar las portadas hoy" sino
//     "Mandar portadas a Lorena")
//   - Categoría según el rol del user
//   - Prioridad (1=alta urgente, 2=media, 3=baja)
//
// Sin OpenAI funciona igual con peor categorización — el feature está
// vivo desde el primer minuto. Cuando Pedro agregue la key, mejora.

const CATEGORIAS_VALIDAS = [
  'Diseño',
  'Edición',
  'Comunicación',
  'Investigación',
  'Personal',
  'Urgente',
  'Administrativo',
  'Otro',
] as const

export type Categoria = (typeof CATEGORIAS_VALIDAS)[number]

export type PendienteParsed = {
  titulo: string
  descripcion: string | null
  categoria: Categoria
  prioridad: 1 | 2 | 3
}

/* ============== OPENAI (preferido) ============== */

async function parseConOpenAI(
  texto: string,
  rolBase: string,
): Promise<PendienteParsed | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const sistema = `Eres un asistente que extrae tareas pendientes del lenguaje natural y las normaliza.

El usuario es: ${rolBase} (diseñador, editor, community manager, etc.)

DEVUELVE SOLO JSON válido con esta estructura exacta:
{
  "titulo": "título corto en imperativo, máx 8 palabras, empieza con verbo",
  "descripcion": "contexto adicional o null si no aporta",
  "categoria": "una de: Diseño, Edición, Comunicación, Investigación, Personal, Urgente, Administrativo, Otro",
  "prioridad": 1 | 2 | 3
}

Reglas:
- prioridad 1: el user dijo "urgente", "ya", "ahora", "hoy mismo", "antes de X"
- prioridad 2 (default): tareas normales del día
- prioridad 3: "cuando pueda", "en algún momento", "más tarde"
- categoría según naturaleza:
    Diseño: portadas, piezas, layouts, mockups, color, tipografía
    Edición: videos, cortes, montaje, reels, animación
    Comunicación: emails, WhatsApp, llamadas, reuniones, responder a alguien
    Investigación: buscar referencias, ver tendencias, leer, analizar
    Personal: cosas no laborales o de bienestar
    Urgente: deadlines críticos
    Administrativo: facturas, recibos, organizar archivos, reportes
    Otro: cuando no encaja claramente
- título: imperativo limpio. Quitar muletillas como "tengo que", "necesito", "me toca".
  Ej. "tengo que mandar las portadas a Lorena hoy" → "Mandar portadas a Lorena"
- responde SOLO el JSON, sin markdown ni comentarios`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: texto },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error('[parseConOpenAI] HTTP', res.status, await res.text())
      return null
    }

    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as Partial<PendienteParsed>

    /* Validar y sanear */
    const categoria = CATEGORIAS_VALIDAS.includes(parsed.categoria as Categoria)
      ? (parsed.categoria as Categoria)
      : 'Otro'
    const prioridad = ([1, 2, 3] as const).includes(parsed.prioridad as 1 | 2 | 3)
      ? (parsed.prioridad as 1 | 2 | 3)
      : 2

    return {
      titulo: (parsed.titulo ?? texto).toString().trim().slice(0, 120),
      descripcion: parsed.descripcion ? String(parsed.descripcion).slice(0, 500) : null,
      categoria,
      prioridad,
    }
  } catch (e) {
    console.error('[parseConOpenAI] error:', e)
    return null
  }
}

/* ============== FALLBACK HEURÍSTICO ============== */

/* Quitar muletillas comunes del título para que quede en imperativo. */
function limpiarTitulo(texto: string): string {
  let t = texto.trim().replace(/\s+/g, ' ')
  /* Muletillas iniciales — case-insensitive */
  const prefijos = [
    /^tengo que /i, /^debo /i, /^necesito /i, /^me toca /i,
    /^hay que /i, /^acordarme de /i, /^recordar /i, /^anotar /i,
    /^pendiente: /i, /^todo: /i, /^pd: /i,
  ]
  for (const p of prefijos) t = t.replace(p, '')
  /* Capitalizar primera letra */
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1)
  /* Quitar punto final */
  t = t.replace(/\.+$/, '')
  return t.slice(0, 120)
}

/* Categorizar por keyword matching simple. */
function categorizarPorKeywords(texto: string, rolBase: string): Categoria {
  const t = texto.toLowerCase()
  if (/urgent|ya |ahora |asap|para hoy|antes de/i.test(t)) return 'Urgente'
  if (/diseñ|portada|pieza|mockup|color|tipograf|figma|illustrator|photoshop|layout/i.test(t)) return 'Diseño'
  if (/video|edita|montaje|reel|corte|premiere|capcut|after effects|adobe/i.test(t)) return 'Edición'
  if (/email|correo|whatsapp|mensaje|llamar|reuni[oó]n|responder|escribir a|contactar/i.test(t)) return 'Comunicación'
  if (/buscar|investig|referenci|tendenc|leer|analizar|estudiar|aprender/i.test(t)) return 'Investigación'
  if (/factura|recibo|reporte|organiz|archivar|impuesto|sunat|nota de cr[eé]dito/i.test(t)) return 'Administrativo'
  if (/personal|familia|m[eé]dico|cita m[eé]dica|ejercicio|gym|descansar/i.test(t)) return 'Personal'

  /* Default por rol cuando ninguna keyword aplica */
  if (rolBase === 'disenador') return 'Diseño'
  if (rolBase === 'editor') return 'Edición'
  if (rolBase === 'community_manager') return 'Comunicación'
  if (rolBase === 'social_media_manager') return 'Comunicación'
  return 'Otro'
}

function prioridadHeuristica(texto: string): 1 | 2 | 3 {
  const t = texto.toLowerCase()
  if (/urgent|ya|ahora|asap|para hoy|antes de|hoy mismo|ya mismo/.test(t)) return 1
  if (/cuando pueda|en algún momento|más tarde|alguna vez|si tengo tiempo/.test(t)) return 3
  return 2
}

function parseHeuristico(texto: string, rolBase: string): PendienteParsed {
  return {
    titulo: limpiarTitulo(texto),
    descripcion: texto.length > 120 ? texto.slice(120, 500) : null,
    categoria: categorizarPorKeywords(texto, rolBase),
    prioridad: prioridadHeuristica(texto),
  }
}

/* ============== ENTRY POINT ============== */

/**
 * Parsea un texto en lenguaje natural a un pendiente estructurado.
 * Intenta OpenAI primero; si falla cae a heurística para que el feature
 * funcione siempre.
 */
export async function parsePendiente(
  texto: string,
  rolBase: string,
): Promise<PendienteParsed> {
  const ai = await parseConOpenAI(texto, rolBase)
  if (ai) return ai
  return parseHeuristico(texto, rolBase)
}
