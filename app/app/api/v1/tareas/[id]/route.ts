// PATCH /api/v1/tareas/:id
//   { "completada": true, "fecha_hecha": "YYYY-MM-DD", "texto", "fecha_entrega", "estado", "marca_slug" }
//   { "fuente": "pendientes_rapidos", "completado": true, "titulo", "prioridad", "categoria" }
//
// Auth: JWT o dst_live_ con alcance owner. No acepta CRON_SECRET.
// Puede completar quien puede en la web: owner sin team_member, director, admin,
// el miembro llamado Pedro, el asignado o el creador.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireApiActor } from '@/lib/api/auth'
import { isYmd } from '@/lib/api/lima'
import { loadTareaActor, puedeTocarTarea } from '@/lib/api/tarea-scope'
import { limpiarTexto } from '@/lib/tareas/categorizar'
import { ESTADOS_TAREA, type EstadoTarea } from '@/lib/tareas/pro-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PENDIENTE_CATEGORIAS = new Set([
  'Diseño',
  'Edición',
  'Comunicación',
  'Investigación',
  'Personal',
  'Urgente',
  'Administrativo',
  'Otro',
])

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

function fuenteDe(value: unknown): 'tareas' | 'pendientes_rapidos' | null {
  if (value == null || value === 'tareas') return 'tareas'
  if (value === 'pendientes_rapidos') return 'pendientes_rapidos'
  return null
}

function estadoTareaDe(value: unknown): EstadoTarea | null {
  if (value === 'pendiente' || value === 'sin_empezar') return 'sin_empezar'
  if (typeof value === 'string' && (ESTADOS_TAREA as readonly string[]).includes(value)) {
    return value as EstadoTarea
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateDroppingMissing(service: any, table: string, id: string, row: Record<string, unknown>, optional: string[]) {
  const payload = { ...row }
  for (let attempt = 0; attempt <= optional.length; attempt++) {
    const { error } = await service.from(table).update(payload).eq('id', id)
    if (!error) return { ok: true as const }
    const message = error.message ?? ''
    const missing = optional.find((col) => col in payload && message.includes(col) && (
      error.code === '42703' || error.code === 'PGRST204' || /does not exist|schema cache/i.test(message)
    ))
    if (!missing) return { ok: false as const, error: message }
    delete payload[missing]
  }
  return { ok: false as const, error: 'No se pudo actualizar' }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actorAuth = await requireApiActor(request)
  if ('response' in actorAuth) return actorAuth.response

  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError('id no es un uuid', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Body JSON inválido', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Body JSON inválido', 400)
  const input = body as Record<string, unknown>
  const permitidos = new Set([
    'fuente', 'completada', 'completado', 'fecha_hecha', 'texto', 'titulo',
    'fecha_entrega', 'estado', 'marca_slug', 'prioridad', 'categoria',
  ])
  for (const key of Object.keys(input)) {
    if (!permitidos.has(key)) return jsonError(`Campo no permitido: ${key}`, 400)
  }
  const fuente = fuenteDe(input.fuente)
  if (!fuente) return jsonError('fuente tiene que ser tareas o pendientes_rapidos', 400)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const actor = await loadTareaActor(service, actorAuth.userId)
  if (!actor.ok) return actor.response

  if (fuente === 'pendientes_rapidos') {
    const { data: row, error } = await service
      .from('pendientes_rapidos')
      .select('id, team_member_id, completado')
      .eq('id', id)
      .maybeSingle()
    if (error) return jsonError(error.message, 500)
    if (!row) return jsonError('Pendiente no encontrado', 404)
    if (!puedeTocarTarea(actor.actor, row)) return jsonError('Este pendiente no es tuyo', 403)

    const patch: Record<string, unknown> = {}
    if (input.completado !== undefined || input.completada !== undefined) {
      const flag = input.completado !== undefined ? input.completado : input.completada
      if (typeof flag !== 'boolean') return jsonError('completado tiene que ser true o false', 400)
      patch.completado = flag
      patch.completado_at = flag ? new Date().toISOString() : null
    }
    if (input.titulo !== undefined || input.texto !== undefined) {
      const raw = typeof (input.titulo ?? input.texto) === 'string' ? String(input.titulo ?? input.texto).trim() : ''
      if (!raw) return jsonError('El título no puede quedar vacío', 400)
      if (raw.length > 1000) return jsonError('Demasiado largo', 400)
      patch.titulo = raw.slice(0, 300)
    }
    if (input.prioridad !== undefined) {
      const n = typeof input.prioridad === 'number' ? input.prioridad : Number(input.prioridad)
      if (n !== 1 && n !== 2 && n !== 3) return jsonError('prioridad tiene que ser 1, 2 o 3', 400)
      patch.prioridad = n
    }
    if (input.categoria !== undefined) {
      if (typeof input.categoria !== 'string' || !PENDIENTE_CATEGORIAS.has(input.categoria.trim())) {
        return jsonError('categoria de pendiente no es válida', 400)
      }
      patch.categoria = input.categoria.trim()
    }
    if (Object.keys(patch).length === 0) return jsonError('Sin cambios para guardar', 400)

    const saved = await updateDroppingMissing(service, 'pendientes_rapidos', id, patch, ['completado_at'])
    if (!saved.ok) return jsonError(saved.error, 500)
    revalidatePath('/inicio')
    return NextResponse.json({
      ok: true,
      id,
      fuente,
      completado: typeof patch.completado === 'boolean' ? patch.completado : row.completado,
    })
  }

  const { data: row, error } = await service
    .from('tareas')
    .select('id, team_member_id, created_by, completada')
    .eq('id', id)
    .maybeSingle()
  if (error) return jsonError(error.message, 500)
  if (!row) return jsonError('Tarea no encontrada', 404)
  if (!puedeTocarTarea(actor.actor, row)) return jsonError('Esta tarea no es tuya', 403)

  const patch: Record<string, unknown> = {}
  if (input.completada !== undefined || input.completado !== undefined) {
    const flag = input.completada !== undefined ? input.completada : input.completado
    if (typeof flag !== 'boolean') return jsonError('completada tiene que ser true o false', 400)
    patch.completada = flag
    if (!flag) {
      patch.completada_at = null
    } else if (input.fecha_hecha != null) {
      if (typeof input.fecha_hecha !== 'string' || !isYmd(input.fecha_hecha.trim())) {
        return jsonError('fecha_hecha tiene que ser YYYY-MM-DD', 400)
      }
      patch.completada_at = `${input.fecha_hecha.trim()}T12:00:00-05:00`
    } else {
      patch.completada_at = new Date().toISOString()
    }
    if (flag) patch.focus_lane = null
  }
  if (input.texto !== undefined || input.titulo !== undefined) {
    const raw = typeof (input.texto ?? input.titulo) === 'string' ? String(input.texto ?? input.titulo).trim() : ''
    if (!raw) return jsonError('El texto no puede quedar vacío', 400)
    if (raw.length > 600) return jsonError('Demasiado largo (máx 600 caracteres)', 400)
    patch.texto = limpiarTexto(raw)
  }
  if (input.fecha_entrega !== undefined) {
    if (input.fecha_entrega === null) {
      patch.fecha_entrega = null
    } else if (typeof input.fecha_entrega === 'string' && isYmd(input.fecha_entrega.trim())) {
      patch.fecha_entrega = input.fecha_entrega.trim()
    } else {
      return jsonError('fecha_entrega tiene que ser YYYY-MM-DD o null', 400)
    }
  }
  if (input.estado !== undefined) {
    const estado = estadoTareaDe(input.estado)
    if (!estado) return jsonError('estado tiene que ser sin_empezar, en_proceso o archivado', 400)
    patch.estado = estado
  }
  if (input.marca_slug !== undefined) {
    if (input.marca_slug === null) {
      patch.marca_slug = null
    } else if (typeof input.marca_slug === 'string' && input.marca_slug.trim()) {
      const slug = input.marca_slug.trim()
      const { data: marca, error: marcaErr } = await service.from('marcas').select('slug').eq('slug', slug).maybeSingle()
      if (marcaErr) return jsonError(marcaErr.message, 500)
      if (!marca) return jsonError(`marca '${slug}' no existe`, 404)
      patch.marca_slug = slug
    } else {
      return jsonError('marca_slug tiene que ser un slug o null', 400)
    }
  }
  if (Object.keys(patch).length === 0) return jsonError('Sin cambios para guardar', 400)

  const saved = await updateDroppingMissing(
    service,
    'tareas',
    id,
    patch,
    ['completada_at', 'focus_lane', 'fecha_entrega', 'estado', 'marca_slug'],
  )
  if (!saved.ok) return jsonError(saved.error, 500)
  revalidatePath('/tareas')
  revalidatePath('/inicio')
  return NextResponse.json({
    ok: true,
    id,
    fuente,
    completada: typeof patch.completada === 'boolean' ? patch.completada : row.completada,
  })
}
