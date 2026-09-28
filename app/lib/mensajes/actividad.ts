import 'server-only'

/* ¿En qué está trabajando cada persona? Para mostrarlo en el chat debajo de
   su nombre (Pedro 24-sep-2026: "el editor debe salir editando tal, Ailyn
   diseñando tal, Lorena según la tarea en curso").

   Se deduce de lo que ya registra la app, en este orden:
   1. EDITANDO: publicación con edición iniciada y sin terminar
      (iniciado_edicion_at y sin editado_at) — la misma regla que usa la vista
      del editor para "Editando". Se ignoran las ya publicadas/archivadas y
      las que quedaron abiertas hace más de 14 días. Editor por editor_id o por
      editor_nombre ("PIEER" → PIEER MEDINA).
   2. DISEÑANDO: publicación en "disenar" iniciada y sin terminar (started_at y
      sin diseno_terminado_at). Diseñador por disenador_id / disenador_nombre;
      si no tiene, y hay una sola persona con rol diseñador, es ella.
   3. TAREA: tarea con el cronómetro corriendo (en_proceso_desde); si no hay,
      la última tarea "en proceso" sin completar.
   Se ignora la marca estado_tarea='en_progreso' porque queda pegada en
   publicaciones ya publicadas. */

export type Actividad = { tipo: 'editando' | 'disenando' | 'tarea'; texto: string; marca: string | null; desde?: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

function primerNombre(x: string | null | undefined): string {
  return (x ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

export async function actividadEquipo(service: Service): Promise<Map<string, Actividad>> {
  const out = new Map<string, Actividad>()
  try {
    const [{ data: miembros }, { data: marcas }, { data: edicion }, { data: diseno }, { data: tareas }, { data: editores }, { data: disenadoresTabla }] = await Promise.all([
      service.from('team_members').select('id, nombre, rol_base').eq('activo', true),
      service.from('marcas').select('id, nombre'),
      service.from('publicaciones').select('nombre, marca_id, editor_id, editor_nombre, iniciado_edicion_at')
        .not('iniciado_edicion_at', 'is', null).not('estado', 'in', '(publicado,archivado)')
        .gte('iniciado_edicion_at', new Date(Date.now() - 14 * 864e5).toISOString()).is('editado_at', null).is('archived_at', null)
        .order('iniciado_edicion_at', { ascending: false }).limit(30),
      service.from('publicaciones').select('nombre, marca_id, disenador_id, disenador_nombre, started_at')
        .eq('estado', 'disenar').not('started_at', 'is', null).is('diseno_terminado_at', null).is('archived_at', null)
        .order('started_at', { ascending: false }).limit(30),
      service.from('tareas').select('team_member_id, texto, categoria, en_proceso_desde, created_at')
        .eq('estado', 'en_proceso').eq('completada', false)
        .order('en_proceso_desde', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(50),
      /* editor_id / disenador_id apuntan a las tablas "editores" y
         "disenadores" (no a team_members): se resuelven por nombre. */
      service.from('editores').select('id, nombre'),
      service.from('disenadores').select('id, nombre'),
    ])
    const equipo = (miembros ?? []) as { id: string; nombre: string; rol_base: string | null }[]
    const marcaNombre = new Map(((marcas ?? []) as { id: string; nombre: string }[]).map((m) => [m.id, m.nombre]))
    const porNombre = (n: string | null | undefined) => {
      const k = primerNombre(n)
      return k ? equipo.find((m) => primerNombre(m.nombre) === k) ?? null : null
    }
    const disenadores = equipo.filter((m) => m.rol_base === 'disenador')
    const nombreEditor = new Map(((editores ?? []) as { id: string; nombre: string }[]).map((e) => [e.id, e.nombre]))
    const nombreDisenador = new Map(((disenadoresTabla ?? []) as { id: string; nombre: string }[]).map((e) => [e.id, e.nombre]))
    const esMiembro = (id: string | null) => (id && equipo.some((m) => m.id === id) ? id : null)
    const poner = (id: string | undefined | null, a: Actividad) => { if (id && !out.has(id)) out.set(id, a) }

    for (const p of (edicion ?? []) as { nombre: string; marca_id: string; editor_id: string | null; editor_nombre: string | null; iniciado_edicion_at: string }[]) {
      const quien = porNombre(p.editor_nombre)?.id
        ?? porNombre(p.editor_id ? nombreEditor.get(p.editor_id) : null)?.id
        ?? esMiembro(p.editor_id)
      poner(quien, { tipo: 'editando', texto: p.nombre, marca: marcaNombre.get(p.marca_id) ?? null, desde: p.iniciado_edicion_at })
    }
    for (const p of (diseno ?? []) as { nombre: string; marca_id: string; disenador_id: string | null; disenador_nombre: string | null; started_at: string }[]) {
      const quien = porNombre(p.disenador_nombre)?.id
        ?? porNombre(p.disenador_id ? nombreDisenador.get(p.disenador_id) : null)?.id
        ?? esMiembro(p.disenador_id)
        ?? (disenadores.length === 1 ? disenadores[0].id : null)
      poner(quien, { tipo: 'disenando', texto: p.nombre, marca: marcaNombre.get(p.marca_id) ?? null, desde: p.started_at })
    }
    for (const t of (tareas ?? []) as { team_member_id: string; texto: string; categoria: string | null; en_proceso_desde: string | null }[]) {
      poner(t.team_member_id, { tipo: 'tarea', texto: t.texto, marca: t.categoria && t.categoria !== 'General' ? t.categoria : null, desde: t.en_proceso_desde })
    }
  } catch (e) {
    console.error('[mensajes] actividadEquipo', e)
  }
  return out
}
