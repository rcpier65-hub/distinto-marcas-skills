// app/app/equipo/page.tsx
//
// Vista "Mi equipo" — Pedro configura miembros, sus roles, permisos
// granulares por módulo, marcas a las que tienen acceso, y genera
// links de invitación para sumarlos.
//
// Server component: fetcha team_members + roles + marcas y los pasa al
// cliente EquipoView donde está toda la interacción.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { EquipoView } from './_components/equipo-view'
import type { RolPredefinido, TeamMember } from '@/lib/team/types'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Traemos: miembros activos + roles del catálogo + marcas para el
     selector de "marcas_acceso". Métricas básicas (videos editados,
     comentarios respondidos) las calculamos en otro turno; por ahora
     solo el conteo de cuántas publicaciones está editando. */
  const [membersResult, rolesResult, marcasResult, pubsByEditorResult] = await Promise.all([
    service
      .from('team_members')
      .select(`
        id, auth_user_id, email, nombre, rol_base, cargo_personalizado,
        fecha_cumpleanos, fecha_pago, avatar_url, permisos_override,
        marcas_acceso, editor_legacy_id, activo, notas, password_inicial,
        created_at, updated_at
      `)
      .order('activo', { ascending: false })
      .order('nombre'),
    service
      .from('roles_predefinidos')
      .select('*')
      .order('orden'),
    service
      .from('marcas')
      .select('id, slug, nombre, color_primario_hex, emoji_marca')
      .order('nombre'),
    /* Conteo de publicaciones POR editor en estado 'editar' — métrica
       para mostrar en las cards rápida. Group by editor_id. */
    service
      .from('publicaciones')
      .select('editor_id')
      .eq('estado', 'editar'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (membersResult.data ?? []) as TeamMember[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = (rolesResult.data ?? []) as RolPredefinido[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]

  /* Conteo manual editor_id → count */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubsRows = (pubsByEditorResult.data ?? []) as any[]
  const pubsPorEditor = new Map<string, number>()
  for (const r of pubsRows) {
    if (!r.editor_id) continue
    pubsPorEditor.set(r.editor_id, (pubsPorEditor.get(r.editor_id) ?? 0) + 1)
  }

  return (
    <EquipoView
      members={members}
      roles={roles}
      marcas={marcas.map((m) => ({
        id: m.id,
        slug: m.slug,
        nombre: m.nombre,
        color: m.color_primario_hex ?? '#737373',
        emoji: m.emoji_marca ?? null,
      }))}
      /* Pasamos las metricas pre-calculadas; el cliente solo lee.
         Cada miembro busca por editor_legacy_id (FK al editor original
         para los 5 backfileados). */
      pubsPorEditor={Object.fromEntries(pubsPorEditor)}
    />
  )
}
