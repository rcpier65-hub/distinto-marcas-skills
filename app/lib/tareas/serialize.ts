// app/lib/tareas/serialize.ts
import type { Tarea, FocusLane } from './types'

export const TAREA_SELECT = `id, team_member_id, created_by, texto, categoria, color, completada, completada_at, focus_lane, created_at,
  miembro:team_members!tareas_team_member_id_fkey(nombre)`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToTarea(r: any): Tarea {
  const m = Array.isArray(r.miembro) ? r.miembro[0] : r.miembro
  return {
    id: r.id,
    teamMemberId: r.team_member_id ?? null,
    teamMemberNombre: m?.nombre ?? null,
    createdBy: r.created_by ?? null,
    texto: r.texto,
    categoria: r.categoria,
    color: r.color,
    completada: !!r.completada,
    focusLane: (r.focus_lane ?? null) as FocusLane | null,
    createdAt: r.created_at,
    completadaAt: r.completada_at ?? null,
  }
}
