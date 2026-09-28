import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { NOTA_SELECT, rowToNota } from '@/lib/notas-reuniones/types'
import { NotaEditor } from '../_components/nota-editor'
import { esSuperAdmin, puedeVerNota } from '@/lib/notas-reuniones/acceso'

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

  const { data, error } = await service
    .from('notas_reuniones')
    .select(NOTA_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()
  /* Privada: solo su autor. Del equipo: todos. */
  if (!puedeVerNota(data, meId)) notFound()

  const nota = rowToNota(data, meNombre)
  /* Equipo (para asignar tareas) y marcas (para ligar la reunión). */
  const [{ data: equipo }, { data: marcas }] = await Promise.all([
    service.from('team_members').select('id, nombre').eq('activo', true).order('nombre'),
    service.from('marcas').select('id, nombre, emoji_marca').order('nombre'),
  ])
  return (
    <NotaEditor
      nota={nota}
      meNombre={meNombre}
      /* El super admin puede hacer privadas SUS notas. */
      puedePrivatizar={esSuperAdmin(user.email) && !!meId && nota.teamMemberId === meId}
      equipo={((equipo ?? []) as { id: string; nombre: string }[])}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marcas={((marcas ?? []) as any[]).map((m) => ({ id: m.id as string, nombre: m.nombre as string, emoji: (m.emoji_marca ?? null) as string | null }))}
    />
  )
}
