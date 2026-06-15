// app/lib/inicio/get-trabajo-equipo.ts
//
// "El trabajo de tu equipo" para el inicio del CEO. Pedro: ver a cada
// miembro (Ailyn diseñadora, Pieer editor, Lorena SMM) con sus
// pendientes según su rol/módulo, con conteo.
//
// Pendiente por rol:
//   - disenador        → publicaciones estado='disenar' (portada_lista
//                         false) asignadas por disenador_nombre.
//   - editor           → publicaciones estado='editar' por editor_nombre.
//   - community_manager / social_media_manager
//                      → comentarios_inbox status='pending' (workspace).
//
// Best-effort: si una tabla/columna no existe, ese miembro queda en 0.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type MiembroTrabajo = {
  id: string
  nombre: string
  rolBase: string
  rolLabel: string
  color: string
  pendientes: number
  /* hasta 3 títulos de ejemplo para el preview */
  ejemplos: string[]
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
    let pendientes = 0
    let ejemplos: string[] = []

    try {
      if (m.rol_base === 'disenador') {
        const { data } = await service
          .from('publicaciones')
          .select('nombre')
          .eq('estado', 'disenar')
          .eq('portada_lista', false)
          .ilike('disenador_nombre', m.nombre)
          .limit(50)
        pendientes = (data ?? []).length
        ejemplos = (data ?? []).slice(0, 3).map((r: { nombre: string | null }) => r.nombre ?? '(sin título)')
      } else if (m.rol_base === 'editor') {
        const { data } = await service
          .from('publicaciones')
          .select('nombre')
          .eq('estado', 'editar')
          .ilike('editor_nombre', m.nombre)
          .limit(50)
        pendientes = (data ?? []).length
        ejemplos = (data ?? []).slice(0, 3).map((r: { nombre: string | null }) => r.nombre ?? '(sin título)')
      } else if (m.rol_base === 'community_manager' || m.rol_base === 'social_media_manager') {
        const { data } = await service
          .from('comentarios_inbox')
          .select('comment_text')
          .eq('status', 'pending')
          .limit(50)
        pendientes = (data ?? []).length
        ejemplos = (data ?? []).slice(0, 3).map((r: { comment_text: string | null }) =>
          (r.comment_text ?? '').slice(0, 50) || 'Comentario',
        )
      }
    } catch { /* miembro queda en 0 */ }

    out.push({
      id: m.id,
      nombre: m.nombre,
      rolBase: m.rol_base,
      rolLabel: ROL_LABEL[m.rol_base] ?? 'Equipo',
      color: ROL_COLOR[m.rol_base] ?? '#737373',
      pendientes,
      ejemplos,
    })
  }

  // Más pendientes arriba.
  out.sort((a, b) => b.pendientes - a.pendientes)
  return out
}
