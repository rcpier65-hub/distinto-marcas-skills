// app/app/reunion/page.tsx
//
// REUNIONES del equipo — videollamada real dentro del sistema (Pedro
// 17-jul-2026). Reemplaza la idea de la oficina virtual.
//
// - Ves quién del equipo está conectado, en cuadritos tipo Meet.
// - "Unirse" entra a la reunión general; también puedes llamar a alguien.
// - Video y audio reales (WebRTC, cámara y micrófono del navegador) y
//   compartir pantalla.

import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { ReunionView } from './_components/reunion-view'

export const dynamic = 'force-dynamic'

export default async function ReunionPage() {
  const user = await requireUser()
  const permisos = await getCurrentMemberPermisos()
  const nombre = permisos?.member?.nombre ?? user.email?.split('@')[0] ?? 'Alguien'

  return <ReunionView yoId={user.id} nombre={nombre} />
}
