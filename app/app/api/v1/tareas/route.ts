// app/app/api/v1/tareas/route.ts
//
// GET /api/v1/tareas
//   ?due=hoy                 v1 solo acepta "hoy". Si se omite, equivale a hoy.
//   ?include_overdue=1       tareas.fecha_entrega <= hoy (si no, = hoy)
//   ?team_member_id=<uuid>   ver alcance abajo
//
// «Qué tengo para hoy» para Kairos (macOS). Une dos fuentes, sin diseño ni hábitos:
//   1. public.tareas — completada = false. Unión: (fecha_entrega = hoy, o <= hoy
//      si include_overdue=1) OR (fecha_entrega IS NULL). Las sin fecha salen como
//      inbox con due: null, igual que los pendientes rápidos. fuente sigue siendo
//      "tareas".
//   2. public.pendientes_rapidos — completado = false, sin fecha: inbox (due null)
//      cuando due=hoy. La UI vive en /inicio.
//
// Auth (Kairos usa clave de dispositivo; NO debe llevar CRON_SECRET):
//   A) Authorization: Bearer dst_live_…
//      resolveApiCaller hashea el token, busca api_device_keys, rechaza revocadas
//      y exige scope tareas:read. El alcance owner (o full / *) también sirve.
//      El alcance de filas es el del dueño (igual que el JWT).
//      POST y PATCH exigen owner (o JWT). CRON_SECRET no escribe.
//   B) Authorization: Bearer <access_token de Supabase Auth>
//      resolveApiCaller valida el JWT con la anon key + auth.getUser(jwt).
//      Luego createServiceClient y filtros explícitos:
//        - Hay fila team_members.auth_user_id = user.id → tareas de ESE miembro
//          (igual que /tareas para un miembro: .eq('team_member_id', meId),
//          y pendientes como /inicio).
//        - No hay fila (Pedro/admin/owner: getCurrentMemberPermisos devuelve null
//          y crearTarea guarda team_member_id null) → alcance CEO:
//          team_member_id IS NULL en tareas y en pendientes_rapidos.
//        - team_member_id en el query: un miembro solo puede pedir el suyo
//          (403 si es otro). Sin fila (admin) o el dueño cuyo nombre es "Pedro"
//          (el tablero /tareas le muestra el equipo) pueden pedir otro uuid.
//          Si el admin lo omite, sigue siendo el alcance NULL, no el tablero entero.
//        - Miembro con activo = false → 403 (no se eleva a admin).
//   C) Authorization: Bearer <CRON_SECRET>  (solo rutinas / servidor, no el cliente Kairos)
//      Con team_member_id → ese miembro.
//      Sin team_member_id → alcance CEO (team_member_id IS NULL), no hace falta el query.
//
// estado (tareas) → status: null | sin_empezar → "pendiente"; el resto se pasa
// tal cual (en_proceso, archivado, …). pendientes_rapidos abiertos → "pendiente".
// prioridad solo existe en pendientes_rapidos; en tareas va null.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireApiActor, resolveApiCaller } from '@/lib/api/auth'
import { isYmd } from '@/lib/api/lima'
import { loadTareaActor, resolveTareaScope, scopeFilter, type TareaScope } from '@/lib/api/tarea-scope'
import { colorParaCategoria, limpiarTexto } from '@/lib/tareas/categorizar'
import { ESTADOS_TAREA, type EstadoTarea } from '@/lib/tareas/pro-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const TZ = 'America/Lima'

type Scope = TareaScope

type TareaItem = {
  id: string
  titulo: string
  due: string | null
  status: string
  prioridad: number | null
  proyecto: string | null
  marca: string | null
  link: string
  fuente: 'tareas' | 'pendientes_rapidos'
}

function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app').replace(/\/$/, '')
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

function statusFromEstado(estado: unknown): string {
  if (typeof estado !== 'string' || estado.length === 0 || estado === 'sin_empezar') return 'pendiente'
  return estado
}

function asPrioridad(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return null
}

function texto(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback
  const t = v.trim()
  return t.length > 0 ? t : fallback
}

function opcional(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function ymd(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 10) return null
  const s = v.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export async function GET(request: Request) {
  const auth = await resolveApiCaller(request, { requiredScope: 'tareas:read' })
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const due = url.searchParams.get('due')
  if (due && due !== 'hoy') {
    return jsonError('v1 solo acepta due=hoy (si se omite, equivale a hoy)', 400)
  }
  const fecha = hoyLima()
  const includeOverdue = url.searchParams.get('include_overdue') === '1'
  const requestedId = url.searchParams.get('team_member_id')?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const scoped = await resolveTareaScope(service, auth.caller, requestedId)
  if (!scoped.ok) return scoped.response
  const scope = scoped.scope

  const tareaSelect = 'id, texto, estado, fecha_entrega, marca_slug, categoria'
  let datedQ = service.from('tareas').select(tareaSelect).eq('completada', false)
  datedQ = scopeFilter(datedQ, scope)
  datedQ = includeOverdue ? datedQ.lte('fecha_entrega', fecha) : datedQ.eq('fecha_entrega', fecha)

  /* due=hoy también trae el tablero abierto sin fecha (inbox, due null).
     include_overdue solo cambia el lado con fecha. */
  let sinFechaQ = service.from('tareas').select(tareaSelect).eq('completada', false).is('fecha_entrega', null)
  sinFechaQ = scopeFilter(sinFechaQ, scope)

  let pendQ = service
    .from('pendientes_rapidos')
    .select('id, titulo, prioridad, categoria')
    .eq('completado', false)
  pendQ = scopeFilter(pendQ, scope)
  pendQ = pendQ.order('prioridad', { ascending: true }).order('created_at', { ascending: false }).limit(100)

  const [datedRes, sinFechaRes, pendRes] = await Promise.all([
    datedQ.order('fecha_entrega', { ascending: true }).limit(200),
    sinFechaQ.order('created_at', { ascending: false }).limit(200),
    pendQ,
  ])
  if (datedRes.error) return jsonError(datedRes.error.message, 500)
  if (sinFechaRes.error) return jsonError(sinFechaRes.error.message, 500)
  if (pendRes.error) return jsonError(pendRes.error.message, 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filasTareas = [...((datedRes.data ?? []) as any[]), ...((sinFechaRes.data ?? []) as any[])]
  const slugs = [...new Set(filasTareas.map((t) => (typeof t.marca_slug === 'string' ? t.marca_slug : '')).filter(Boolean))]
  const nombres = new Map<string, string>()
  if (slugs.length > 0) {
    const { data: marcas, error: marcasErr } = await service.from('marcas').select('slug, nombre').in('slug', slugs)
    if (marcasErr) return jsonError(marcasErr.message, 500)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of (marcas ?? []) as any[]) {
      if (typeof m.slug === 'string' && typeof m.nombre === 'string' && m.nombre.trim()) {
        nombres.set(m.slug, m.nombre.trim())
      }
    }
  }

  const base = appBase()
  const deTareas: TareaItem[] = filasTareas.map((t) => {
    const slug = opcional(t.marca_slug)
    const marca = slug ? (nombres.get(slug) ?? slug) : null
    const categoria = opcional(t.categoria)
    return {
      id: String(t.id),
      titulo: texto(t.texto, 'Sin título'),
      due: ymd(t.fecha_entrega),
      status: statusFromEstado(t.estado),
      prioridad: null,
      proyecto: categoria ?? marca,
      marca,
      link: `${base}/tareas`,
      fuente: 'tareas',
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dePendientes: TareaItem[] = ((pendRes.data ?? []) as any[]).map((p) => ({
    id: String(p.id),
    titulo: texto(p.titulo, 'Sin título'),
    due: null,
    status: 'pendiente',
    prioridad: asPrioridad(p.prioridad),
    proyecto: opcional(p.categoria),
    marca: null,
    link: `${base}/inicio`,
    fuente: 'pendientes_rapidos',
  }))

  const tareas = [...deTareas, ...dePendientes]
  return NextResponse.json({ ok: true, fecha, total: tareas.length, tareas })
}

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

function fuenteDe(value: unknown): 'tareas' | 'pendientes_rapidos' | null {
  if (value == null || value === 'tareas') return 'tareas'
  if (value === 'pendientes_rapidos') return 'pendientes_rapidos'
  return null
}

function estadoTareaDe(value: unknown): EstadoTarea | null {
  if (value == null || value === 'pendiente' || value === 'sin_empezar') return 'sin_empezar'
  if (typeof value === 'string' && (ESTADOS_TAREA as readonly string[]).includes(value)) {
    return value as EstadoTarea
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertDroppingMissing(service: any, table: string, row: Record<string, unknown>, optional: string[]) {
  const payload = { ...row }
  for (let attempt = 0; attempt <= optional.length; attempt++) {
    const { data, error } = await service.from(table).insert(payload).select('id').single()
    if (!error) return { data }
    const message = error.message ?? ''
    const missing = optional.find((col) => col in payload && message.includes(col) && (
      error.code === '42703' || error.code === 'PGRST204' || /does not exist|schema cache/i.test(message)
    ))
    if (!missing) return { error }
    delete payload[missing]
  }
  return { error: { message: 'No se pudo crear' } }
}

export async function POST(request: Request) {
  const actorAuth = await requireApiActor(request)
  if ('response' in actorAuth) return actorAuth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Body JSON inválido', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Body JSON inválido', 400)
  const input = body as Record<string, unknown>
  const permitidos = new Set([
    'texto', 'titulo', 'fuente', 'marca_slug', 'fecha_entrega', 'estado',
    'categoria', 'team_member_id', 'prioridad',
  ])
  for (const key of Object.keys(input)) {
    if (!permitidos.has(key)) return jsonError(`Campo no permitido: ${key}`, 400)
  }

  const fuente = fuenteDe(input.fuente)
  if (!fuente) return jsonError('fuente tiene que ser tareas o pendientes_rapidos', 400)

  const rawTexto = typeof input.texto === 'string'
    ? input.texto
    : typeof input.titulo === 'string'
      ? input.titulo
      : ''
  const textoPlano = rawTexto.trim()
  if (!textoPlano) return jsonError('El texto es obligatorio', 400)
  const max = fuente === 'tareas' ? 600 : 1000
  if (textoPlano.length > max) return jsonError(`Demasiado largo (máx ${max} caracteres)`, 400)

  const requestedId = typeof input.team_member_id === 'string' && input.team_member_id.trim()
    ? input.team_member_id.trim()
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const actor = await loadTareaActor(service, actorAuth.userId)
  if (!actor.ok) return actor.response

  let scope: Scope
  if (requestedId) {
    if (!UUID_RE.test(requestedId)) return jsonError('team_member_id no es un uuid', 400)
    if (!actor.actor.puedeTodo && requestedId !== actor.actor.teamMemberId) {
      return jsonError('No puedes asignar tareas de otro miembro', 403)
    }
    scope = { kind: 'member', teamMemberId: requestedId }
  } else {
    const scoped = await resolveTareaScope(service, { kind: 'user', userId: actorAuth.userId }, null)
    if (!scoped.ok) return scoped.response
    scope = scoped.scope
  }
  const ownerId = scope.kind === 'member' ? scope.teamMemberId : null
  const base = appBase()

  if (fuente === 'pendientes_rapidos') {
    let prioridad: 1 | 2 | 3 = 2
    if (input.prioridad != null) {
      const n = typeof input.prioridad === 'number' ? input.prioridad : Number(input.prioridad)
      if (n !== 1 && n !== 2 && n !== 3) return jsonError('prioridad tiene que ser 1, 2 o 3', 400)
      prioridad = n
    }
    const categoria = typeof input.categoria === 'string' && input.categoria.trim()
      ? input.categoria.trim()
      : 'Otro'
    if (!PENDIENTE_CATEGORIAS.has(categoria)) {
      return jsonError('categoria de pendiente no es válida', 400)
    }

    const inserted = await insertDroppingMissing(service, 'pendientes_rapidos', {
      team_member_id: ownerId,
      texto_original: textoPlano,
      titulo: textoPlano.slice(0, 300),
      descripcion: null,
      categoria,
      prioridad,
      completado: false,
    }, [])
    if (inserted.error) return jsonError(inserted.error.message, 500)
    revalidatePath('/inicio')
    return NextResponse.json({
      ok: true,
      tarea: {
        id: String(inserted.data.id),
        titulo: textoPlano.slice(0, 300),
        due: null,
        status: 'pendiente',
        prioridad,
        proyecto: categoria,
        marca: null,
        link: `${base}/inicio`,
        fuente: 'pendientes_rapidos',
      },
    })
  }

  let marcaSlug: string | null = null
  let categoria = 'General'
  if (typeof input.marca_slug === 'string' && input.marca_slug.trim()) {
    marcaSlug = input.marca_slug.trim()
    const { data: marca, error: marcaErr } = await service
      .from('marcas')
      .select('nombre, slug')
      .eq('slug', marcaSlug)
      .maybeSingle()
    if (marcaErr) return jsonError(marcaErr.message, 500)
    if (!marca) return jsonError(`marca '${marcaSlug}' no existe`, 404)
    categoria = typeof marca.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : marcaSlug
  } else if (typeof input.categoria === 'string' && input.categoria.trim()) {
    categoria = input.categoria.trim().slice(0, 80)
  }

  let fechaEntrega: string | null = null
  if (input.fecha_entrega != null) {
    if (typeof input.fecha_entrega !== 'string' || !isYmd(input.fecha_entrega.trim())) {
      return jsonError('fecha_entrega tiene que ser YYYY-MM-DD o null', 400)
    }
    fechaEntrega = input.fecha_entrega.trim()
  }

  let estado: EstadoTarea = 'sin_empezar'
  if (input.estado != null) {
    const parsed = estadoTareaDe(input.estado)
    if (!parsed) return jsonError('estado tiene que ser sin_empezar, en_proceso o archivado', 400)
    estado = parsed
  }

  const { data: existentes } = await service.from('tareas').select('categoria, color').limit(400)
  const usados: string[] = []
  const colorByCat = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (existentes ?? []) as any[]) {
    if (typeof row.categoria === 'string' && typeof row.color === 'string' && !colorByCat.has(row.categoria)) {
      colorByCat.set(row.categoria, row.color)
      usados.push(row.color)
    }
  }

  const inserted = await insertDroppingMissing(service, 'tareas', {
    team_member_id: ownerId,
    created_by: actor.actor.teamMemberId,
    texto: limpiarTexto(textoPlano),
    categoria,
    color: colorByCat.get(categoria) ?? colorParaCategoria(usados),
    completada: false,
    focus_lane: null,
    marca_slug: marcaSlug,
    fecha_entrega: fechaEntrega,
    estado,
  }, ['fecha_entrega', 'estado', 'marca_slug'])
  if (inserted.error) return jsonError(inserted.error.message, 500)

  revalidatePath('/tareas')
  revalidatePath('/inicio')
  return NextResponse.json({
    ok: true,
    tarea: {
      id: String(inserted.data.id),
      titulo: limpiarTexto(textoPlano),
      due: fechaEntrega,
      status: statusFromEstado(estado),
      prioridad: null,
      proyecto: categoria,
      marca: marcaSlug,
      link: `${base}/tareas`,
      fuente: 'tareas',
    },
  })
}
