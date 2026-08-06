// app/app/ruleta/page.tsx
//
// "La Ruleta" — sorteo mensual de quién organiza la próxima salida del equipo.
// Gira la ruleta, sale un integrante, y se registra la actividad (lugar, fecha,
// hora, asistentes). Abajo, el historial de quién organizó antes.
// Pedro 21-jul-2026.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { RuletaView, type Miembro, type Actividad } from './_components/ruleta-view'

export const dynamic = 'force-dynamic'

export default async function RuletaPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: me } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Para Erick (lo gestiona) y el director. Otros vuelven a su inicio.
  if (!me || (me.nombre !== 'Erick' && me.rol_base !== 'director')) redirect('/inicio')

  const [equipoRes, histRes] = await Promise.all([
    service
      .from('team_members')
      .select('id, nombre, avatar_url')
      .eq('activo', true)
      .order('nombre'),
    service
      .from('ruleta_actividades')
      .select('id, organizador_nombre, lugar, fecha, hora, asistentes, notas, created_at')
      .order('fecha', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipo: Miembro[] = ((equipoRes?.data ?? []) as any[]).map((m) => ({
    id: m.id as string,
    nombre: m.nombre as string,
    avatarUrl: (m.avatar_url ?? null) as string | null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historial: Actividad[] = ((histRes?.data ?? []) as any[]).map((a) => ({
    id: a.id as string,
    organizador: a.organizador_nombre as string,
    lugar: (a.lugar ?? null) as string | null,
    fecha: (a.fecha ?? null) as string | null,
    hora: (a.hora ?? null) as string | null,
    asistentes: (a.asistentes ?? []) as string[],
    notas: (a.notas ?? null) as string | null,
  }))

  return <RuletaView equipo={equipo} historial={historial} />
}
