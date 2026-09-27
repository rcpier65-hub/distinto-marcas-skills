// Upsert parcial de marca_facts para PATCH/PUT /api/v1/marcas/:slug/facts.
// Los campos que no vienen en el body se conservan. Strings vacíos → null.

const STRING_FIELDS = ['nombre_comercial', 'web_principal', 'whatsapp_principal', 'notas'] as const
const ARRAY_FIELDS = ['puntos_venta', 'proximamente', 'frases_prohibidas', 'frases_canon'] as const

const STRING_LIMIT: Record<(typeof STRING_FIELDS)[number], number> = {
  nombre_comercial: 200,
  web_principal: 500,
  whatsapp_principal: 40,
  notas: 8000,
}

type StringField = (typeof STRING_FIELDS)[number]
type ArrayField = (typeof ARRAY_FIELDS)[number]

export type FactsPayload = {
  nombre_comercial: string | null
  web_principal: string | null
  whatsapp_principal: string | null
  puntos_venta: string[]
  proximamente: string[]
  productos_datos: Record<string, unknown>
  frases_prohibidas: string[]
  frases_canon: string[]
  notas: string | null
  updated_at: string | null
}

function fail(error: string, status = 400): { ok: false; status: number; error: string } {
  return { ok: false, status, error }
}

function isStringField(key: string): key is StringField {
  return (STRING_FIELDS as readonly string[]).includes(key)
}

function isArrayField(key: string): key is ArrayField {
  return (ARRAY_FIELDS as readonly string[]).includes(key)
}

function cleanString(value: unknown, label: string, max: number): { ok: true; value: string | null } | { ok: false; status: number; error: string } {
  if (value === null) return { ok: true, value: null }
  if (typeof value !== 'string') return fail(`${label} tiene que ser texto o null`)
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: null }
  if (trimmed.length > max) return fail(`${label} puede tener hasta ${max} caracteres`)
  return { ok: true, value: trimmed }
}

function cleanStringList(value: unknown, label: string): { ok: true; value: string[] } | { ok: false; status: number; error: string } {
  if (!Array.isArray(value)) return fail(`${label} tiene que ser una lista de textos`)
  if (value.length > 80) return fail(`${label} acepta hasta 80 valores`)
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return fail(`${label} tiene que ser una lista de textos`)
    const trimmed = item.trim()
    if (!trimmed) continue
    if (trimmed.length > 300) return fail(`Cada valor de ${label} puede tener hasta 300 caracteres`)
    items.push(trimmed)
  }
  return { ok: true, value: items }
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function shapeFacts(row: Record<string, unknown> | null, nombreMarca: string): FactsPayload {
  return {
    nombre_comercial: typeof row?.nombre_comercial === 'string' && row.nombre_comercial.trim()
      ? row.nombre_comercial
      : nombreMarca,
    web_principal: typeof row?.web_principal === 'string' ? row.web_principal : null,
    whatsapp_principal: typeof row?.whatsapp_principal === 'string' ? row.whatsapp_principal : null,
    puntos_venta: asStringList(row?.puntos_venta),
    proximamente: asStringList(row?.proximamente),
    productos_datos: asObject(row?.productos_datos),
    frases_prohibidas: asStringList(row?.frases_prohibidas),
    frases_canon: asStringList(row?.frases_canon),
    notas: typeof row?.notas === 'string' ? row.notas : null,
    updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
  }
}

export async function upsertMarcaFacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  marcaId: string,
  nombreMarca: string,
  body: unknown,
): Promise<{ ok: true; facts: FactsPayload; hasFacts: boolean } | { ok: false; status: number; error: string }> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Body JSON inválido')
  const input = body as Record<string, unknown>

  const allowed = new Set<string>([...STRING_FIELDS, ...ARRAY_FIELDS, 'productos_datos'])
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) return fail(`Campo no permitido: ${key}`)
  }
  if (Object.keys(input).length === 0) return fail('Sin cambios para guardar')

  const { data: existing, error: readError } = await service
    .from('marca_facts')
    .select(`
      nombre_comercial, web_principal, whatsapp_principal, puntos_venta, proximamente,
      productos_datos, frases_prohibidas, frases_canon, notas, updated_at
    `)
    .eq('marca_id', marcaId)
    .maybeSingle()
  if (readError) return fail(readError.message, 500)

  const current = (existing ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = {
    marca_id: marcaId,
    nombre_comercial: typeof current.nombre_comercial === 'string' ? current.nombre_comercial : null,
    web_principal: typeof current.web_principal === 'string' ? current.web_principal : null,
    whatsapp_principal: typeof current.whatsapp_principal === 'string' ? current.whatsapp_principal : null,
    puntos_venta: asStringList(current.puntos_venta),
    proximamente: asStringList(current.proximamente),
    productos_datos: asObject(current.productos_datos),
    frases_prohibidas: asStringList(current.frases_prohibidas),
    frases_canon: asStringList(current.frases_canon),
    notas: typeof current.notas === 'string' ? current.notas : null,
  }

  for (const key of Object.keys(input)) {
    const value = input[key]
    if (isStringField(key)) {
      const parsed = cleanString(value, key, STRING_LIMIT[key])
      if (!parsed.ok) return parsed
      next[key] = parsed.value
      continue
    }
    if (isArrayField(key)) {
      const parsed = cleanStringList(value, key)
      if (!parsed.ok) return parsed
      next[key] = parsed.value
      continue
    }
    if (key === 'productos_datos') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return fail('productos_datos debe ser un objeto JSON {}')
      }
      let encoded = ''
      try {
        encoded = JSON.stringify(value)
      } catch {
        return fail('productos_datos no se puede guardar')
      }
      if (encoded.length > 100_000) return fail('productos_datos es demasiado grande')
      next.productos_datos = value
    }
  }

  const { data: saved, error } = await service
    .from('marca_facts')
    .upsert(next, { onConflict: 'marca_id' })
    .select(`
      nombre_comercial, web_principal, whatsapp_principal, puntos_venta, proximamente,
      productos_datos, frases_prohibidas, frases_canon, notas, updated_at
    `)
    .single()

  if (error) return fail(error.message, 500)
  return { ok: true, hasFacts: true, facts: shapeFacts(saved as Record<string, unknown>, nombreMarca) }
}
