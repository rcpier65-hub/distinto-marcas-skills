// Campos que Nay puede escribir en PATCH /api/v1/publicaciones/:id.
// No corre los efectos del form web (push, sello de diseño, mandar a Ailyn).

import { isYmd } from '@/lib/api/lima'

const ESTADOS = new Set([
  'tareas',
  'idear',
  'editando',
  'editar',
  'disenar',
  'disenando',
  'enviado',
  'aprobar',
  'programar',
  'programar_anuncios',
  'archivado',
  'publicar',
  'publicado',
  'borrador',
])

const ESTADOS_TAREA = new Set([
  'sin_empezar',
  'en_progreso',
  'listo',
  'pausada',
  'archivado',
  'enviado',
])

const TEXT_LIMIT: Record<string, number> = {
  nombre: 500,
  copy: 20000,
  guion: 20000,
  frase: 500,
  notas: 8000,
  descripcion: 20000,
}

const DATE_KEYS = new Set(['fecha_publicacion', 'fecha_edicion', 'fecha_diseno', 'fecha_entrega'])

const URL_KEYS = new Set([
  'drive_material_url',
  'drive_resultado_url',
  'enlace_tomas',
  'enlace_musica',
  'link_tiktok',
  'link_instagram',
  'portada_cruda_url',
  'portada_editada_url',
  'video_sin_musica_url',
  'video_con_musica_url',
])

const BOOL_KEYS = new Set([
  'copy_listo',
  'musica_lista',
  'portada_lista',
  'disenado',
  'editado',
  'video_aprobado',
  'es_tarea_diseno',
])

const ARRAY_KEYS = new Set(['plataformas', 'tipo_contenido'])

const ALLOWED = new Set([
  ...Object.keys(TEXT_LIMIT),
  ...DATE_KEYS,
  ...URL_KEYS,
  ...BOOL_KEYS,
  ...ARRAY_KEYS,
  'estado',
  'estado_tarea',
])

export type PublicacionPatch = Record<string, unknown>

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

function asNullableString(value: unknown, label: string, max: number): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null }
  if (typeof value !== 'string') return fail(`${label} tiene que ser texto o null`)
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: null }
  if (trimmed.length > max) return fail(`${label} puede tener hasta ${max} caracteres`)
  return { ok: true, value: trimmed }
}

export function parsePublicacionPatch(body: unknown): { ok: true; patch: PublicacionPatch } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Body JSON inválido')
  const input = body as Record<string, unknown>
  const patch: PublicacionPatch = {}

  for (const key of Object.keys(input)) {
    if (!ALLOWED.has(key)) return fail(`Campo no permitido: ${key}`)
    const value = input[key]

    if (key === 'estado') {
      if (typeof value !== 'string' || !ESTADOS.has(value)) {
        return fail('estado no es válido')
      }
      patch.estado = value
      continue
    }

    if (key === 'estado_tarea') {
      if (typeof value !== 'string' || !ESTADOS_TAREA.has(value)) {
        return fail('estado_tarea no es válido')
      }
      patch.estado_tarea = value
      continue
    }

    if (key in TEXT_LIMIT) {
      const parsed = asNullableString(value, key, TEXT_LIMIT[key])
      if (!parsed.ok) return parsed
      if (key === 'nombre' && parsed.value === null) return fail('El nombre no puede quedar vacío')
      patch[key] = parsed.value
      continue
    }

    if (DATE_KEYS.has(key)) {
      if (value === null) {
        patch[key] = null
        continue
      }
      if (typeof value !== 'string' || !isYmd(value.trim())) {
        return fail(`${key} tiene que ser YYYY-MM-DD o null`)
      }
      patch[key] = value.trim()
      continue
    }

    if (URL_KEYS.has(key)) {
      const parsed = asNullableString(value, key, 2000)
      if (!parsed.ok) return parsed
      if (parsed.value && !/^https?:\/\//i.test(parsed.value)) {
        return fail(`${key} tiene que empezar con http:// o https://`)
      }
      patch[key] = parsed.value
      continue
    }

    if (BOOL_KEYS.has(key)) {
      if (typeof value !== 'boolean') return fail(`${key} tiene que ser true o false`)
      patch[key] = value
      continue
    }

    if (ARRAY_KEYS.has(key)) {
      if (!Array.isArray(value)) return fail(`${key} tiene que ser una lista de textos`)
      if (value.length > 20) return fail(`${key} acepta hasta 20 valores`)
      const items: string[] = []
      for (const item of value) {
        if (typeof item !== 'string') return fail(`${key} tiene que ser una lista de textos`)
        const trimmed = item.trim()
        if (!trimmed) continue
        if (trimmed.length > 40) return fail(`Cada valor de ${key} puede tener hasta 40 caracteres`)
        items.push(trimmed)
      }
      patch[key] = items
      continue
    }
  }

  if (Object.keys(patch).length === 0) return fail('Sin cambios para guardar')
  return { ok: true, patch }
}
