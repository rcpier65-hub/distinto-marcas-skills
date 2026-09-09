// Home «Notas y reuniones»: Próximas (agenda) + Recientes + Nueva nota.
// Independiente de /reunion (WebRTC Meet).

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getProximasSemana } from '@/lib/notas-reuniones/proximas'
import { NOTA_SELECT, rowToNota, type NotaReunion } from '@/lib/notas-reuniones/types'
import { NotasHome } from './_components/notas-home'

export const dynamic = 'force-dynamic'

export default async function NotasReunionesPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: me } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const meId: string | null = me?.id ?? null
  const meNombre: string = me?.nombre ?? (user.email?.split('@')[0] ?? 'Yo')
  const esCEO = !me || me.rol_base === 'director'

  const proximas = await getProximasSemana()

  let q = service
    .from('notas_reuniones')
    .select(NOTA_SELECT)
    .order('updated_at', { ascending: false })
    .limit(80)
  if (!esCEO && meId) q = q.eq('team_member_id', meId)

  const { data, error } = await q
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notas: NotaReunion[] = []
  if (!error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[]
    const memberIds = [...new Set(rows.map((r) => r.team_member_id).filter(Boolean))] as string[]
    const nombreById = new Map<string, string>()
    if (memberIds.length) {
      const { data: members } = await service.from('team_members').select('id, nombre').in('id', memberIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of (members ?? []) as any[]) nombreById.set(m.id, m.nombre)
    }
    notas = rows.map((r) =>
      rowToNota(r, r.team_member_id === meId ? 'Yo' : (nombreById.get(r.team_member_id) ?? 'Equipo')),
    )
  }

  return <NotasHome proximas={proximas} notas={notas} meNombre={meNombre} />
}
