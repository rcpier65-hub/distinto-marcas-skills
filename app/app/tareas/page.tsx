// app/app/tareas/page.tsx
//
// Tablero de tareas estilo "Notas". Columnas dinámicas (categoría = entidad).
// El CEO (director) ve TODAS las tareas; cada miembro solo las suyas.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { TAREA_SELECT, rowToTarea } from '@/lib/tareas/serialize'
import type { Tarea } from '@/lib/tareas/types'
import { TareasView } from './_components/tareas-view'

export const dynamic = 'force-dynamic'

export default async function TareasPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: tm } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const meId: string | null = tm?.id ?? null
  const esCEO = tm?.rol_base === 'director'

  let q = service
    .from('tareas')
    .select(TAREA_SELECT)
    .eq('completada', false)
    .order('created_at', { ascending: false })
  if (!esCEO && meId) q = q.eq('team_member_id', meId)
  const { data } = await q
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas: Tarea[] = ((data ?? []) as any[]).map(rowToTarea)

  /* Equipo (para sugerir @menciones). Excluye al director. */
  const { data: members } = await service
    .from('team_members')
    .select('id, nombre')
    .eq('activo', true)
    .neq('rol_base', 'director')
    .order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipo = ((members ?? []) as any[]).map((m) => ({ id: m.id as string, nombre: m.nombre as string }))

  return <TareasView tareasIniciales={tareas} esCEO={esCEO} meId={meId} equipo={equipo} />
}
