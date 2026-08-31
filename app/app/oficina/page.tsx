// app/app/oficina/page.tsx
//
// Oficina virtual del equipo — inspirada en Gather.town. Cada miembro entra
// con su avatar, camina por el mapa y habla con quien tenga cerca (el audio
// y el video se abren solos por proximidad). Pedro 31-ago-2026.
//
// Visible para todo el equipo (igual que /reunion): no gatea por módulo.

import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { OficinaView } from './_components/oficina-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Oficina' }

export default async function OficinaPage() {
  const user = await requireUser()
  const permisos = await getCurrentMemberPermisos()
  const nombre = permisos?.member?.nombre ?? user.email?.split('@')[0] ?? 'Alguien'
  return <OficinaView yoId={user.id} nombre={nombre} />
}
