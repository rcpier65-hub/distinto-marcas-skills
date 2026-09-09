import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { NOTA_SELECT, rowToNota } from '@/lib/notas-reuniones/types'
import { NotaEditor } from '../_components/nota-editor'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function NotaDetallePage({ params }: Props) {
  const { id } = await params
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

  const { data, error } = await service
    .from('notas_reuniones')
    .select(NOTA_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()
  if (!esCEO && meId && data.team_member_id && data.team_member_id !== meId) notFound()

  const nota = rowToNota(data, meNombre)
  return <NotaEditor nota={nota} meNombre={meNombre} />
}
