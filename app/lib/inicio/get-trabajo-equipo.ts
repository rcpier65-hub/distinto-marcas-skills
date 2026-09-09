// app/lib/inicio/get-trabajo-equipo.ts
// Pedro tickets b2f993db + e5d97753: team sync + totales editor/diseño/generales

type Service = any

export type TareaMiembroTipo = 'diseno' | 'editor' | 'general' | 'comentario'

export type TareaMiembro = {
  id: string
  titulo: string
  marcaNombre: string
  marcaColor: string
  estadoLabel: string
  fechaLabel: string | null
  href: string
  tipo: TareaMiembroTipo
}

export type TotalesEquipo = {
  totales: number
  editor: number
  diseno: number
  generales: number
}

export type MiembroTrabajo = {
  id: string
  nombre: string
  rolBase: string
  rolLabel: string
  color: string
  pendientes: number
  tareas: TareaMiembro[]
  moduloHref: string
  conteos?: { editor: number; diseno: number; generales: number; comentario: number }
}

export type TrabajoEquipoResult = {
  miembros: MiembroTrabajo[]
  totales: TotalesEquipo
}

const ROL_LABEL: Record<string, string> = {
  disenador: 'Diseño',
  editor: 'Edición',
  community_manager: 'Community',
  social_media_manager: 'Social media',
  director: 'Dirección',
  admin: 'Admin',
}
const ROL_COLOR: Record<string, string> = {
  disenador: '#ec4899',
  editor: '#8b5cf6',
  community_manager: '#22c55e',
  social_media_manager: '#22c55e',
  director: '#7170ff',
  admin: '#7170ff',
}
const ROL_MODULO: Record<string, string> = {
  disenador: '/diseno',
  editor: '/editor',
  community_manager: '/comentarios',
  social_media_manager: '/comentarios',
}

const SUBESTADO_LABEL: Record<string, string> = {
  sin_empezar: 'Sin empezar',
  en_progreso: 'En progreso',
  listo: 'Listo',
  revisar: 'A revisar',
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fechaCorta(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).slice(0, 10)
  const [y, mo, d] = s.split('-').map(Number)
  if (!y || !mo || !d) return null
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  return `${DIAS[dt.getDay()]} ${d} ${MESES[mo - 1]}`
}

function marcaDe(row: any): { nombre: string; color: string } {
  const m = Array.isArray(row?.marca) ? row.marca[0]
    : Array.isArray(row?.marcas) ? row.marcas[0]
    : (row?.marca ?? row?.marcas ?? null)
  return {
    nombre: (m?.nombre ?? 'Marca') as string,
    color: (m?.color_primario_hex ?? '#737373') as string,
  }
}

function prioridad(nombre: string): number {
  const n = nombre.toLowerCase()
  if (n.includes('ailyn')) return 0
  if (n.includes('pieer') || n.includes('pierr') || n.includes('pier')) return 1
  if (n.includes('lorena')) return 2
  return 3
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}

function emptyConteos() {
  return { editor: 0, diseno: 0, generales: 0, comentario: 0 }
}

export async function getTrabajoEquipo(service: Service): Promise<TrabajoEquipoResult> {
  let miembros: { id: string; nombre: string; rol_base: string }[] = []
  try {
    const { data } = await service
      .from('team_members')
      .select('id, nombre, rol_base, activo')
      .eq('activo', true)
      .order('nombre')
    miembros = (data ?? []).filter(
      (m: { rol_base: string }) => m.rol_base && m.rol_base !== 'director',
    )
  } catch {
    return { miembros: [], totales: { totales: 0, editor: 0, diseno: 0, generales: 0 } }
  }
  if (miembros.length === 0) {
    return { miembros: [], totales: { totales: 0, editor: 0, diseno: 0, generales: 0 } }
  }

  const byId = new Map<string, { m: typeof miembros[0]; tareas: TareaMiembro[]; conteos: ReturnType<typeof emptyConteos> }>()
  for (const m of miembros) {
    byId.set(m.id, { m, tareas: [], conteos: emptyConteos() })
  }

  const porPrimerNombre = new Map<string, string>()
  for (const m of miembros) {
    const k = primerNombre(m.nombre).toLowerCase()
    if (!porPrimerNombre.has(k)) porPrimerNombre.set(k, m.id)
  }

  const FULL_DIS = `id, nombre, fecha_diseno, fecha_entrega, estado_tarea, marca:marcas(nombre, color_primario_hex)`
  const BASE_DIS = `id, nombre, fecha_diseno, estado_tarea, marca:marcas(nombre, color_primario_hex)`

  const [disenoRes, editorRes, generalesRes, comentariosRes] = await Promise.all([
    (async () => {
      let res = await service
        .from('publicaciones')
        .select(FULL_DIS)
        .eq('es_tarea_diseno', true)
        .not('estado_tarea', 'in', '(listo,archivado)')
        .order('fecha_entrega', { ascending: true, nullsFirst: false })
        .limit(200)
      if (res.error) {
        res = await service
          .from('publicaciones')
          .select(BASE_DIS)
          .eq('es_tarea_diseno', true)
          .not('estado_tarea', 'in', '(listo,archivado)')
          .order('fecha_diseno', { ascending: true, nullsFirst: false })
          .limit(200)
      }
      return res
    })(),
    service
      .from('publicaciones')
      .select('id, nombre, fecha_publicacion, fecha_edicion, editor_nombre, marca:marcas(nombre, color_primario_hex)')
      .eq('estado', 'editar')
      .not('editor_nombre', 'is', null)
      .order('fecha_edicion', { ascending: true, nullsFirst: false })
      .limit(200)
      .then(async (r: { data: unknown; error?: { message?: string } | null }) => {
        if (r.error && /fecha_edicion/i.test(r.error.message ?? '')) {
          return service
            .from('publicaciones')
            .select('id, nombre, fecha_publicacion, editor_nombre, marca:marcas(nombre, color_primario_hex)')
            .eq('estado', 'editar')
            .not('editor_nombre', 'is', null)
            .order('fecha_publicacion', { ascending: true, nullsFirst: false })
            .limit(200)
        }
        return r
      }),
    service
      .from('tareas')
      .select('id, texto, categoria, color, team_member_id, created_at, marca_slug')
      .eq('completada', false)
      .order('created_at', { ascending: false })
      .limit(500),
    service
      .from('comentarios_inbox')
      .select('id, comment_text, comment_created_at, marcas:marca_id(nombre, color_primario_hex)')
      .eq('status', 'pending')
      .order('comment_created_at', { ascending: true, nullsFirst: false })
      .limit(200)
      .then((r: unknown) => r, () => ({ data: [] })),
  ])

  const disenadores = miembros.filter((m) => m.rol_base === 'disenador')
  const disenoRows = (disenoRes?.data ?? []) as any[]
  for (const r of disenoRows) {
    const mk = marcaDe(r)
    const tarea: TareaMiembro = {
      id: r.id as string,
      titulo: (r.nombre ?? '(sin título)') as string,
      marcaNombre: mk.nombre,
      marcaColor: mk.color,
      estadoLabel: SUBESTADO_LABEL[r.estado_tarea as string] ?? 'Pendiente',
      fechaLabel: fechaCorta(r.fecha_entrega ?? r.fecha_diseno),
      href: `/publicaciones/${r.id}`,
      tipo: 'diseno',
    }
    const dest = disenadores[0]
    if (!dest) continue
    const bucket = byId.get(dest.id)
    if (!bucket) continue
    bucket.tareas.push(tarea)
    bucket.conteos.diseno++
  }

  for (const r of ((editorRes?.data ?? []) as any[])) {
    const alias = primerNombre(String(r.editor_nombre ?? '')).toLowerCase()
    const mid = porPrimerNombre.get(alias)
    if (!mid) continue
    const bucket = byId.get(mid)
    if (!bucket) continue
    const mk = marcaDe(r)
    bucket.tareas.push({
      id: r.id as string,
      titulo: (r.nombre ?? '(sin título)') as string,
      marcaNombre: mk.nombre,
      marcaColor: mk.color,
      estadoLabel: 'Por editar',
      fechaLabel: fechaCorta(r.fecha_edicion ?? r.fecha_publicacion),
      href: `/publicaciones/${r.id}`,
      tipo: 'editor',
    })
    bucket.conteos.editor++
  }

  for (const t of ((generalesRes?.data ?? []) as any[])) {
    const mid = t.team_member_id as string | null
    if (!mid) continue
    const bucket = byId.get(mid)
    if (!bucket) continue
    bucket.tareas.push({
      id: t.id as string,
      titulo: (t.texto ?? '(sin texto)') as string,
      marcaNombre: (t.categoria ?? 'General') as string,
      marcaColor: (t.color ?? '#737373') as string,
      estadoLabel: 'Tarea',
      fechaLabel: null,
      href: '/tareas',
      tipo: 'general',
    })
    bucket.conteos.generales++
  }

  const cms = miembros.filter(
    (m) => m.rol_base === 'community_manager' || m.rol_base === 'social_media_manager',
  )
  const comRows = ((comentariosRes?.data ?? []) as any[]).map((r) => {
    const mk = marcaDe(r)
    const txt = (r.comment_text ?? '').trim()
    return {
      id: r.id as string,
      titulo: txt ? (txt.length > 60 ? `${txt.slice(0, 60)}…` : txt) : 'Comentario',
      marcaNombre: mk.nombre,
      marcaColor: mk.color,
      estadoLabel: 'Por responder',
      fechaLabel: fechaCorta(r.comment_created_at),
      href: '/comentarios',
      tipo: 'comentario' as const,
    }
  })
  for (const cm of cms) {
    const bucket = byId.get(cm.id)
    if (!bucket) continue
    for (const c of comRows) {
      bucket.tareas.push(c)
      bucket.conteos.comentario++
    }
  }

  const out: MiembroTrabajo[] = []
  for (const { m, tareas, conteos } of byId.values()) {
    out.push({
      id: m.id,
      nombre: m.nombre,
      rolBase: m.rol_base,
      rolLabel: ROL_LABEL[m.rol_base] ?? 'Equipo',
      color: ROL_COLOR[m.rol_base] ?? '#737373',
      pendientes: tareas.length,
      tareas,
      moduloHref: ROL_MODULO[m.rol_base] ?? '/tareas',
      conteos,
    })
  }

  out.sort((a, b) => {
    const pa = prioridad(a.nombre)
    const pb = prioridad(b.nombre)
    if (pa !== pb) return pa - pb
    return b.pendientes - a.pendientes
  })

  let editor = 0
  let diseno = 0
  for (const m of out) {
    editor += m.conteos.editor
    diseno += m.conteos.diseno
  }
  const generalesAll = ((generalesRes?.data ?? []) as any[]).filter((t) => !!t.team_member_id).length
  const totales: TotalesEquipo = {
    editor,
    diseno,
    generales: generalesAll,
    totales: editor + diseno + generalesAll,
  }

  return { miembros: out, totales }
}
