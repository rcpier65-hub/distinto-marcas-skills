// app/app/soporte/page.tsx
//
// Módulo "Soporte": el equipo reporta fallas / pedidos / consultas.
// - Todos pueden crear y ven SUS propios reportes.
// - Erick y Pedro (directores) ven TODOS y pueden resolverlos.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { AutoRefresh } from '@/components/auto-refresh'
import { SoporteView, type Reporte } from './_components/soporte-view'

export const dynamic = 'force-dynamic'

export default async function SoportePage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: me } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  /* Admin del panel = director (Erick + Pedro) o admin/owner sin team_member. */
  const esAdmin = !me || me.rol_base === 'director'
  const meId: string | null = me?.id ?? null
  const meNombre: string = me?.nombre ?? (user.email?.split('@')[0] ?? '')

  let q = service
    .from('soporte_reportes')
    .select('id, team_member_id, autor_nombre, tipo, descripcion, estado, nota_resolucion, created_at, resuelto_at, avisado_at')
    .order('created_at', { ascending: false })
    .limit(300)
  /* Los que NO son admin ven SOLO sus reportes. */
  if (!esAdmin && meId) q = q.eq('team_member_id', meId)
  const { data } = await q

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportes: Reporte[] = ((data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    autorNombre: (r.autor_nombre ?? 'Alguien') as string,
    esMio: !!meId && r.team_member_id === meId,
    tipo: (r.tipo ?? 'falla') as Reporte['tipo'],
    descripcion: (r.descripcion ?? '') as string,
    estado: (r.estado ?? 'pendiente') as Reporte['estado'],
    notaResolucion: (r.nota_resolucion ?? null) as string | null,
    createdAt: r.created_at as string,
    resueltoAt: (r.resuelto_at ?? null) as string | null,
    avisado: !!r.avisado_at,
  }))

  return (
    <>
      {/* El panel se actualiza solo cuando alguien crea o resuelve un reporte. */}
      <AutoRefresh intervalMs={12000} />
      <SoporteView reportes={reportes} esAdmin={esAdmin} meNombre={meNombre} />
    </>
  )
}
