// app/lib/inicio/get-trabajo-equipo.ts
//
// "El trabajo de tu equipo" para el inicio del CEO. Pedro lo quiere como
// un CARRUSEL de cards (una por persona, estilo "Tareas en diseño"): cada
// card lista LAS TAREAS de esa persona con nombre + marca + estado + la
// fecha programada de la tarea.
//
// Tareas por rol:
//   - disenador  → publicaciones es_tarea_diseno=true, estado_tarea no
//                  terminado. Fecha = fecha_entrega ?? fecha_diseno.
//   - editor     → publicaciones estado='editar' por editor_nombre.
//                  Fecha = fecha_publicacion.
//   - community_manager / social_media_manager
//                → comentarios_inbox status='pending'. Fecha = comment_created_at.
//
// Best-effort: si una tabla/columna no existe, ese miembro queda sin tareas.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type TareaMiembro = {
  id: string
  titulo: string
  marcaNombre: string
  marcaColor: string
  estadoLabel: string
  fechaLabel: string | null   // 'Mié 17 jun' o null si no tiene fecha
  href: string
}

export type MiembroTrabajo = {
  id: string
  nombre: string
  rolBase: string
  rolLabel: string
  color: string
  pendientes: number
  tareas: TareaMiembro[]
  moduloHref: string          // dónde ver todo el trabajo de esta persona
}

const ROL_LABEL: Record<string, string> = {
  disenador: 'Diseño',
  editor: 'Edición',
  community_manager: 'Community',
  social_media_manager: 'Social media',
  director: 'Dirección',
}
const ROL_COLOR: Record<string, string> = {
  disenador: '#ec4899',
  editor: '#8b5cf6',
  community_manager: '#22c55e',
  social_media_manager: '#22c55e',
  director: '#7170ff',
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

/* 'YYYY-MM-DD' (o timestamp) → 'Mié 17 jun'. Null si no parsea. */
function fechaCorta(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).slice(0, 10)
  const [y, mo, d] = s.split('-').map(Number)
  if (!y || !mo || !d) return null
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  return `${DIAS[dt.getDay()]} ${d} ${MESES[mo - 1]}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function marcaDe(row: any): { nombre: string; color: string } {
  const m = Array.isArray(row?.marca) ? row.marca[0]
    : Array.isArray(row?.marcas) ? row.marcas[0]
    : (row?.marca ?? row?.marcas ?? null)
  return {
    nombre: (m?.nombre ?? 'Marca') as string,
    color: (m?.color_primario_hex ?? '#737373') as string,
  }
}

/* Prioridad de orden pedida por Pedro: Ailyn 1°, Pieer 2°, Lorena 3°,
   el resto después (por cantidad de pendientes desc). */
function prioridad(nombre: string): number {
  const n = nombre.toLowerCase()
  if (n.includes('ailyn')) return 0
  if (n.includes('pieer') || n.includes('pierr') || n.includes('pier')) return 1
  if (n.includes('lorena')) return 2
  return 3
}

export async function getTrabajoEquipo(service: Service): Promise<MiembroTrabajo[]> {
  // Miembros activos operativos (excluye director/CEO — no es "equipo").
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
    return []
  }
  if (miembros.length === 0) return []

  const out: MiembroTrabajo[] = []

  for (const m of miembros) {
    let tareas: TareaMiembro[] = []

    try {
      if (m.rol_base === 'disenador') {
        /* Tareas del módulo Diseño (es_tarea_diseno) que NO están terminadas.
           Equipo actual: una sola diseñadora (Ailyn) → la card muestra todas
           las tareas activas de diseño, igual que el bloque "Tareas en diseño".
           Si en el futuro hay varias diseñadoras, filtrar por disenador_nombre. */
        const FULL = `id, nombre, fecha_diseno, fecha_entrega, estado_tarea, marca:marcas(nombre, color_primario_hex)`
        const BASE = `id, nombre, fecha_diseno, estado_tarea, marca:marcas(nombre, color_primario_hex)`
        let res = await service
          .from('publicaciones')
          .select(FULL)
          .eq('es_tarea_diseno', true)
          .not('estado_tarea', 'in', '(listo,archivado)')
          .order('fecha_entrega', { ascending: true, nullsFirst: false })
          .limit(20)
        if (res.error) {
          res = await service
            .from('publicaciones')
            .select(BASE)
            .eq('es_tarea_diseno', true)
            .not('estado_tarea', 'in', '(listo,archivado)')
            .order('fecha_diseno', { ascending: true, nullsFirst: false })
            .limit(20)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tareas = ((res.data ?? []) as any[]).map((r) => {
          const mk = marcaDe(r)
          return {
            id: r.id as string,
            titulo: (r.nombre ?? '(sin título)') as string,
            marcaNombre: mk.nombre,
            marcaColor: mk.color,
            estadoLabel: SUBESTADO_LABEL[r.estado_tarea as string] ?? 'Pendiente',
            fechaLabel: fechaCorta(r.fecha_entrega ?? r.fecha_diseno),
            href: `/publicaciones/${r.id}`,
          }
        })
      } else if (m.rol_base === 'editor') {
        /* El sync de Notion guarda editor_nombre como NOMBRE DE PILA ("PIEER"),
           pero team_members.nombre es el nombre completo ("PIEER MEDINA"). Por eso
           matcheamos por el PRIMER nombre con prefijo (case-insensitive) en vez de
           exacto — si no, las tareas de Pieer nunca salían. Ordenamos por fecha de
           edición (la fecha de "editar hoy"), con fallback a fecha de publicación. */
        const primerNombre = m.nombre.trim().split(/\s+/)[0] || m.nombre
        // % en ilike = comodín de prefijo. Escapamos %/_ por si el nombre los trae.
        const patron = `${primerNombre.replace(/[%_]/g, '\\$&')}%`
        let res = await service
          .from('publicaciones')
          .select('id, nombre, fecha_publicacion, fecha_edicion, marca:marcas(nombre, color_primario_hex)')
          .eq('estado', 'editar')
          .ilike('editor_nombre', patron)
          .order('fecha_edicion', { ascending: true, nullsFirst: false })
          .limit(20)
        /* Defensive: si fecha_edicion no existe en este entorno, reintenta sin ella. */
        if (res.error) {
          res = await service
            .from('publicaciones')
            .select('id, nombre, fecha_publicacion, marca:marcas(nombre, color_primario_hex)')
            .eq('estado', 'editar')
            .ilike('editor_nombre', patron)
            .order('fecha_publicacion', { ascending: true, nullsFirst: false })
            .limit(20)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tareas = ((res.data ?? []) as any[]).map((r) => {
          const mk = marcaDe(r)
          return {
            id: r.id as string,
            titulo: (r.nombre ?? '(sin título)') as string,
            marcaNombre: mk.nombre,
            marcaColor: mk.color,
            estadoLabel: 'Por editar',
            fechaLabel: fechaCorta(r.fecha_edicion ?? r.fecha_publicacion),
            href: `/publicaciones/${r.id}`,
          }
        })
      } else if (m.rol_base === 'community_manager' || m.rol_base === 'social_media_manager') {
        const { data } = await service
          .from('comentarios_inbox')
          .select('id, comment_text, comment_created_at, marcas:marca_id(nombre, color_primario_hex)')
          .eq('status', 'pending')
          .order('comment_created_at', { ascending: true, nullsFirst: false })
          .limit(20)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tareas = ((data ?? []) as any[]).map((r) => {
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
          }
        })
      }
    } catch { /* miembro queda sin tareas */ }

    out.push({
      id: m.id,
      nombre: m.nombre,
      rolBase: m.rol_base,
      rolLabel: ROL_LABEL[m.rol_base] ?? 'Equipo',
      color: ROL_COLOR[m.rol_base] ?? '#737373',
      pendientes: tareas.length,
      tareas,
      moduloHref: ROL_MODULO[m.rol_base] ?? '/inicio',
    })
  }

  /* Orden: Ailyn, Pieer, Lorena, luego el resto por pendientes desc. */
  out.sort((a, b) => {
    const pa = prioridad(a.nombre)
    const pb = prioridad(b.nombre)
    if (pa !== pb) return pa - pb
    return b.pendientes - a.pendientes
  })
  return out
}
