// app/lib/actividad/derivar.ts
//
// Deriva la actividad de cada persona DIRECTO de las tablas fuente
// (publicaciones editadas + tareas completadas), sin depender de la tabla
// `actividad`. Pedro 23-jun-2026: Pieer editó videos hoy y el reporte salía
// vacío porque (a) la tabla `actividad` no existe todavía y (b) aunque
// existiera, solo registra hacia adelante.
//
// Bonus crítico: resuelve el DESFASE DE NOMBRE. En `publicaciones` el editor
// se guarda como "PIEER" (nombre del catálogo `editores`), pero su perfil de
// equipo es "PIEER MEDINA". Mapeamos nombre-de-editor → nombre-de-perfil por
// nombre completo, nombre del editor vinculado (editor_legacy_id → editores),
// y primer nombre. Así "PIEER" cae en "PIEER MEDINA" y el filtro por persona
// del reporte funciona.

import type { ActividadRow } from '@/app/actividad/_components/actividad-view'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

/** Construye un mapa nombre-en-minúsculas → { nombre canónico, rol } para
 *  resolver cualquier forma del nombre de una persona a su perfil de equipo. */
async function construirResolverActor(service: Service) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tmRes, edRes] = await Promise.all([
    service.from('team_members').select('id, nombre, rol_base, editor_legacy_id'),
    service.from('editores').select('id, nombre').then((r: { data: unknown }) => r, () => ({ data: [] })),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tms = (tmRes?.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eds = ((edRes?.data ?? []) as any[])
  const edNombreById = new Map<string, string>(eds.map((e) => [e.id as string, e.nombre as string]))

  // mapa alias(minúsc) → perfil. Prioridad: nombre completo > editor vinculado
  // > primer nombre (sin pisar claves ya puestas).
  const map = new Map<string, { nombre: string; rol: string }>()
  const set = (alias: string | null | undefined, perfil: { nombre: string; rol: string }, soloSiVacio = false) => {
    if (!alias) return
    const k = alias.toLowerCase().trim()
    if (!k) return
    if (soloSiVacio && map.has(k)) return
    map.set(k, perfil)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberById = new Map<string, any>()
  for (const tm of tms) {
    memberById.set(tm.id, tm)
    const perfil = { nombre: tm.nombre as string, rol: (tm.rol_base as string) ?? 'editor' }
    set(tm.nombre, perfil)                                   // nombre completo
    if (tm.editor_legacy_id) set(edNombreById.get(tm.editor_legacy_id), perfil)  // editor vinculado
    set((tm.nombre as string)?.split(' ')[0], perfil, true)  // primer nombre (no pisa)
  }
  const resolver = (nombreEditor: string | null | undefined): { nombre: string; rol: string } =>
    map.get((nombreEditor ?? '').toLowerCase().trim()) ?? { nombre: nombreEditor ?? 'Alguien', rol: 'editor' }

  return { resolver, memberById }
}

export async function loadActividadDerivada(
  service: Service,
  opts: { desde: string; hasta: string; esAdmin: boolean; soloActorNombre?: string | null },
): Promise<ActividadRow[]> {
  const { resolver, memberById } = await construirResolverActor(service)

  const [editsRes, tareasRes] = await Promise.all([
    // Videos terminados de editar en la ventana (editado_at).
    service
      .from('publicaciones')
      .select('id, nombre, editor_nombre, editado_at, iniciado_edicion_at, marca:marcas(slug)')
      .gte('editado_at', opts.desde)
      .lte('editado_at', opts.hasta)
      .not('editor_nombre', 'is', null)
      .order('editado_at', { ascending: false })
      .limit(500),
    // Tareas del tablero completadas en la ventana.
    service
      .from('tareas')
      .select('id, texto, team_member_id, categoria, completada_at')
      .eq('completada', true)
      .gte('completada_at', opts.desde)
      .lte('completada_at', opts.hasta)
      .order('completada_at', { ascending: false })
      .limit(500),
  ])

  const rows: ActividadRow[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of ((editsRes?.data ?? []) as any[])) {
    const actor = resolver(e.editor_nombre)
    const marca = Array.isArray(e.marca) ? e.marca[0] : e.marca
    rows.push({
      actor_nombre: actor.nombre,
      rol: actor.rol,
      accion: 'Editó video',
      entidad_tipo: 'publicacion',
      marca_slug: marca?.slug ?? null,
      detalle: e.nombre ?? null,
      created_at: e.editado_at,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of ((tareasRes?.data ?? []) as any[])) {
    const m = memberById.get(t.team_member_id)
    if (!m) continue  // tarea sin dueño identificable → no la atribuimos
    rows.push({
      actor_nombre: m.nombre as string,
      rol: (m.rol_base as string) ?? null,
      accion: 'Completó tarea',
      entidad_tipo: 'tarea',
      marca_slug: null,
      detalle: t.texto ?? null,
      created_at: t.completada_at,
    })
  }

  // Filtro por persona (miembro normal ve solo lo suyo; admin puede filtrar).
  let out = rows
  if (opts.soloActorNombre) out = rows.filter((r) => r.actor_nombre === opts.soloActorNombre)

  // Orden cronológico descendente (como la query de la tabla actividad).
  out.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return out
}
