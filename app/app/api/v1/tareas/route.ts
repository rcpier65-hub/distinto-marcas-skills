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
// Auth (Kairos NO debe llevar CRON_SECRET):
//   A) Authorization: Bearer <access_token de Supabase Auth>
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
//   B) Authorization: Bearer <CRON_SECRET>  (rutinas / servidor, igual que el resto de /api/v1)
//      Con team_member_id → ese miembro.
//      Sin team_member_id → alcance CEO (team_member_id IS NULL), no hace falta el query.
//
// estado (tareas) → status: null | sin_empezar → "pendiente"; el resto se pasa
// tal cual (en_proceso, archivado, …). pendientes_rapidos abiertos → "pendiente".
// prioridad solo existe en pendientes_rapidos; en tareas va null.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveApiCaller, type ApiCaller } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const TZ = 'America/Lima'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Scope =
  | { kind: 'member'; teamMemberId: string }
  | { kind: 'admin_null' }

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scopeFilter(q: any, scope: Scope): any {
  switch (scope.kind) {
    case 'member':
      return q.eq('team_member_id', scope.teamMemberId)
    case 'admin_null':
      return q.is('team_member_id', null)
    default: {
      const _never: never = scope
      return _never
    }
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveScope(service: any, caller: ApiCaller, requestedId: string | null): Promise<
  { ok: true; scope: Scope } | { ok: false; response: NextResponse }
> {
  if (requestedId && !UUID_RE.test(requestedId)) {
    return { ok: false, response: jsonError('team_member_id no es un uuid', 400) }
  }

  switch (caller.kind) {
    case 'cron':
      if (requestedId) return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
      return { ok: true, scope: { kind: 'admin_null' } }
    case 'user':
      break
    default: {
      const _never: never = caller
      return _never
    }
  }

  const { data: tm, error } = await service
    .from('team_members')
    .select('id, nombre, activo')
    .eq('auth_user_id', caller.userId)
    .maybeSingle()
  if (error) return { ok: false, response: jsonError(error.message, 500) }

  if (tm && tm.activo === false) {
    return { ok: false, response: jsonError('Miembro desactivado', 403) }
  }

  /* Sin fila = admin/owner (Pedro). Mismo criterio que permisos-helper y que
     crearTarea, que persiste team_member_id = null. */
  if (!tm) {
    if (requestedId) return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
    return { ok: true, scope: { kind: 'admin_null' } }
  }

  const meId = tm.id as string
  if (requestedId && requestedId !== meId) {
    /* /tareas: solo el dueño llamado "Pedro" ve el tablero del equipo.
       El resto (incluido un director que no es Pedro) ve solo lo suyo. */
    const esOwner = (tm.nombre ?? '').trim().toLowerCase() === 'pedro'
    if (!esOwner) {
      return { ok: false, response: jsonError('No puedes ver tareas de otro miembro', 403) }
    }
    return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
  }
  return { ok: true, scope: { kind: 'member', teamMemberId: meId } }
}

export async function GET(request: Request) {
  const auth = await resolveApiCaller(request)
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
  const scoped = await resolveScope(service, auth.caller, requestedId)
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
