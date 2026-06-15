// app/lib/tareas/categorizar.ts
//
// Categoriza una tarea como en la app "Notas" de Pedro: la categoría es la
// ENTIDAD (cliente / marca / persona) mencionada. Esa entidad es la columna
// del tablero. Si es un miembro del equipo, la tarea se le asigna.
//
//   1) @mención explícita  → esa es la categoría (atajo, sin IA).
//   2) OpenAI (gpt-4o-mini) → detecta el nombre propio.
//   3) Fallback heurístico  → 'General'.

/* Paleta vibrante (igual a la app Notas) para colorear columnas/cards. */
export const TAREA_COLORS = [
  '#E91E8C', '#E8952F', '#5BC0EB', '#43A047', '#8E24AA',
  '#F4511E', '#00897B', '#3949AB', '#C0CA33', '#D81B60',
  '#039BE5', '#6D4C41', '#FFB300', '#00ACC1', '#7CB342',
  '#5E35B1', '#FF5252', '#546E7A',
]

export function colorParaCategoria(usados: string[]): string {
  const libre = TAREA_COLORS.find((c) => !usados.includes(c))
  return libre ?? TAREA_COLORS[usados.length % TAREA_COLORS.length]
}

function capitalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/* Detecta @Nombre (una o dos palabras). Devuelve el nombre capitalizado. */
export function detectarMencion(texto: string): string | null {
  const m = texto.match(/@([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*)?)/u)
  if (!m) return null
  return capitalizar(m[1])
}

async function categorizarConIA(texto: string, existentes: string[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const lista = existentes.length > 0
    ? `Categorías existentes (reúsalas si aplica): ${existentes.join(', ')}`
    : 'No hay categorías existentes aún.'

  const sistema = `Eres un asistente que categoriza tareas de una agencia de marketing. Detecta el CLIENTE, MARCA o PERSONA de la tarea — ese nombre propio ES la categoría.

Reglas:
1. PRIORIDAD: nombres propios de persona/marca/empresa/negocio. Ese nombre es la categoría.
2. Si hay un proyecto/negocio identificable (aunque no sea nombre propio), úsalo.
3. Solo usa "Personal" para cosas 100% personales (comida, casa, salud, mascotas).
4. NUNCA uses "General" si hay algo más específico.
5. Si una categoría existente encaja, reúsala (consistencia).
6. Capitaliza cada palabra.
7. Responde SOLO JSON: {"categoria": "Nombre"}

${lista}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: texto },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 40,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as { categoria?: string }
    const cat = (parsed.categoria ?? '').trim()
    return cat ? capitalizar(cat) : null
  } catch {
    return null
  }
}

/* Devuelve la categoría (entidad) de la tarea. */
export async function categorizarTarea(texto: string, existentes: string[] = []): Promise<string> {
  const mencion = detectarMencion(texto)
  if (mencion) return mencion
  const ia = await categorizarConIA(texto, existentes)
  return ia ?? 'General'
}

/* Quita la @mención del texto para que la card no la repita
   (la columna ya indica a quién es). */
export function limpiarTexto(texto: string): string {
  return texto.replace(/@([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*)?)/u, '').replace(/\s{2,}/g, ' ').trim() || texto.trim()
}
