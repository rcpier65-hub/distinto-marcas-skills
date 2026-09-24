import 'server-only'

/* ¿En qué está trabajando cada persona? Para mostrarlo en el chat debajo de
   su nombre (Pedro 24-sep-2026: "el editor debe salir editando tal, Ailyn
   diseñando tal, Lorena según la tarea en curso").

   Se deduce de lo que ya registra la app, en este orden:
   1. EDITANDO: publicación en "editar" con edición iniciada y sin terminar
      (iniciado_edicion_at y sin editado_at). Editor por editor_id o por
      editor_nombre ("PIEER" → PIEER MEDINA).
   2. DISEÑANDO: publicación en "disenar" iniciada y sin terminar (started_at y
      sin diseno_terminado_at). Diseñador por disenador_id / disenador_nombre;
      si no tiene, y hay una sola persona con rol diseñador, es ella.
   3. TAREA: tarea "en proceso" sin completar.
   Se ignora la marca estado_tarea='en_progreso' porque queda pegada en
   publicaciones ya publicadas. */

export type Actividad = { tipo: 'editando' | 'disenando' | 'tarea'; texto: string; marca: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

function primerNombre(x: string | null | undefined): string {
  return (x ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

export async function actividadEquipo(service: Service): Promise<Map<string, Actividad>> {
  const out = new Map<string, Actividad>()
  try {
    const [{ data: miembros }, { data: marcas }, { data: edicion }, { data: diseno }, { data: tareas }] = await Promise.all([
      service.from('team_members').select('id, nombre, rol_base').eq('activo', true),
      service.from('marcas').select('id, nombre'),
      service.from('publicaciones').select('nombre, marca_id, editor_id, editor_nombre, iniciado_edicion_at')
        .eq('estado', 'editar').not('iniciado_edicion_at', 'is', null).is('editado_at', null).is('archived_at', null)
        .order('iniciado_edicion_at', { ascending: false }).limit(30),
      service.from('publicaciones').select('nombre, marca_id, disenador_id, disenador_nombre, started_at')
        .eq('estado', 'disenar').not('started_at', 'is', null).is('diseno_terminado_at', null).is('archived_at', null)
        .order('started_at', { ascending: false }).limit(30),
      service.from('tareas').select('team_member_id, texto, categoria, created_at')
        .eq('estado', 'en_proceso').eq('completada', false).order('created_at', { ascending: false }).limit(50),
    ])
    const equipo = (miembros ?? []) as { id: string; nombre: string; rol_base: string | null }[]
    const marcaNombre = new Map(((marcas ?? []) as { id: string; nombre: string }[]).map((m) => [m.id, m.nombre]))
    const porNombre = (n: string | null | undefined) => {
      const k = primerNombre(n)
      return k ? equipo.find((m) => primerNombre(m.nombre) === k) ?? null : null
    }
    const disenadores = equipo.filter((m) => m.rol_base === 'disenador')
    const poner = (id: string | undefined | null, a: Actividad) => { if (id && !out.has(id)) out.set(id, a) }

    for (const p of (edicion ?? []) as { nombre: string; marca_id: string; editor_id: string | null; editor_nombre: string | null }[]) {
      const quien = p.editor_id ?? porNombre(p.editor_nombre)?.id
      poner(quien, { tipo: 'editando', texto: p.nombre, marca: marcaNombre.get(p.marca_id) ?? null })
    }
    for (const p of (diseno ?? []) as { nombre: string; marca_id: string; disenador_id: string | null; disenador_nombre: string | null }[]) {
      const quien = p.disenador_id ?? porNombre(p.disenador_nombre)?.id ?? (disenadores.length === 1 ? disenadores[0].id : null)
      poner(quien, { tipo: 'disenando', texto: p.nombre, marca: marcaNombre.get(p.marca_id) ?? null })
    }
    for (const t of (tareas ?? []) as { team_member_id: string; texto: string; categoria: string | null }[]) {
      poner(t.team_member_id, { tipo: 'tarea', texto: t.texto, marca: t.categoria && t.categoria !== 'General' ? t.categoria : null })
    }
  } catch (e) {
    console.error('[mensajes] actividadEquipo', e)
  }
  return out
}
