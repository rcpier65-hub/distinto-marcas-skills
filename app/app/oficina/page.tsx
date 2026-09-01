// app/app/oficina/page.tsx
//
// Oficina virtual del equipo — inspirada en Gather.town. Cada miembro entra
// con su avatar, camina por el mapa y habla con quien tenga cerca (el audio
// y el video se abren solos por proximidad). Pedro 31-ago-2026.
//
// Visible para todo el equipo (igual que /reunion): no gatea por módulo.

import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { leerPerfilesDb } from '@/lib/oficina/db'
import { OficinaView } from './_components/oficina-view'
import type { AvatarConfig } from './_avatar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Oficina' }

export default async function OficinaPage() {
  const user = await requireUser()
  const permisos = await getCurrentMemberPermisos()
  const nombre = permisos?.member?.nombre ?? user.email?.split('@')[0] ?? 'Alguien'

  /* Perfiles guardados: avatar de cada uno + qué escritorio reclamó.
     Defensivo: si la tabla aún no existe, la oficina abre igual. */
  let perfiles: Array<{ userId: string; nombre: string | null; escritorio: string | null }> = []
  let miAvatar: AvatarConfig | null = null
  try {
    const filas = await leerPerfilesDb()
    perfiles = filas.map((p) => ({ userId: p.user_id, nombre: p.nombre, escritorio: p.escritorio }))
    const mio = filas.find((p) => p.user_id === user.id)
    if (mio?.avatar && typeof mio.avatar === 'object') miAvatar = mio.avatar as unknown as AvatarConfig
  } catch { /* primera vez, sin tabla todavía */ }

  return (
    <OficinaView
      yoId={user.id}
      nombre={nombre}
      avatarGuardado={miAvatar}
      perfiles={perfiles}
    />
  )
}
