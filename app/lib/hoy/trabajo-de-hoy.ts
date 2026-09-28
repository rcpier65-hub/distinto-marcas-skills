// app/lib/hoy/trabajo-de-hoy.ts
//
// "Tu trabajo de hoy" y pendientes rápidos de /inicio. La página y
// GET /api/v1/tareas usan estas consultas.

import 'server-only'
import { tieneAcceso, type Permisos } from '@/lib/team/types'

export type TrabajoHoyItem = {
  id: string
  nombre: string
  marca: string
  marcaColor: string
  meta: string
  marcadaHoy: boolean
  modulo: 'editor' | 'diseno' | 'comentarios'
}

export type PendienteInicio = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  prioridad: 1 | 2 | 3
  completado: boolean
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

/* Mismo ramal que app/app/inicio/page.tsx: el dueño ve el pulso de
   publicaciones; el resto, su cola según el módulo. */
export async function cargarTrabajoDeHoy(
  service: Service,
  args: { esOwner: boolean; nombre: string; permisos: Permisos | null; hoy: string },
): Promise<TrabajoHoyItem[]> {
  const { esOwner, nombre, permisos, hoy } = args

  if (esOwner) {
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, estado, marca:marcas(slug, nombre, color_primario_hex)`)
      .in('estado', ['tareas', 'idear', 'disenar', 'editar', 'aprobar', 'programar'])
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_publicacion
          ? `${r.estado} · ${new Date(r.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : (r.estado as string),
        marcadaHoy: false,
        modulo: 'editor' as const,
      }
    })
  }

  if (!permisos) return []

  if (tieneAcceso(permisos, 'editor')) {
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, fecha_edicion, fecha_marcada_para_editar, editor_nombre, marca:marcas(slug, nombre, color_primario_hex)`)
      .ilike('editor_nombre', nombre)
      .eq('estado', 'editar')
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_publicacion
          ? `Publica ${new Date(r.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : 'Sin fecha',
        marcadaHoy: r.fecha_marcada_para_editar === hoy,
        modulo: 'editor' as const,
      }
    })
  }

  if (tieneAcceso(permisos, 'diseno')) {
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_diseno, estado_tarea, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('es_tarea_diseno', true)
      .not('estado_tarea', 'in', '(listo,archivado)')
      .order('fecha_diseno', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_diseno
          ? `Entrega ${new Date(r.fecha_diseno + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : 'Sin fecha',
        marcadaHoy: false,
        modulo: 'diseno' as const,
      }
    })
  }

  if (tieneAcceso(permisos, 'comentarios') || tieneAcceso(permisos, 'inbox')) {
    const { data } = await service
      .from('comentarios_inbox')
      .select(`id, author_username, author_display_name, comment_text, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('status', 'pending')
      .order('comment_created_at', { ascending: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: ((r.comment_text ?? '').substring(0, 60) || '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: `@${r.author_display_name || r.author_username || 'anon'}`,
        marcadaHoy: false,
        modulo: 'comentarios' as const,
      }
    })
  }

  return []
}

export async function cargarPendientesInicio(service: Service, teamMemberId: string | null): Promise<PendienteInicio[]> {
  let pendientesQuery = service
    .from('pendientes_rapidos')
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at')
    .eq('completado', false)
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(30)
  if (teamMemberId) {
    pendientesQuery = pendientesQuery.eq('team_member_id', teamMemberId)
  } else {
    pendientesQuery = pendientesQuery.is('team_member_id', null)
  }
  const { data: pendientesRaw } = await pendientesQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((pendientesRaw ?? []) as any[]).map((row) => ({
    id: row.id as string,
    titulo: row.titulo as string,
    descripcion: (row.descripcion ?? null) as string | null,
    categoria: row.categoria as string,
    prioridad: row.prioridad as 1 | 2 | 3,
    completado: row.completado as boolean,
    created_at: row.created_at as string,
  }))
}
