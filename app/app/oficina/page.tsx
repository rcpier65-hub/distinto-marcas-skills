// app/app/oficina/page.tsx
//
// Oficina virtual del equipo — inspirada en Gather.town. La conexión vive en
// OficinaProvider (toda la app); esta página solo dibuja el mapa.
// Pedro 31-ago-2026 · 24-sep-2026 (oficina persistente).

import { requireUser } from '@/lib/auth/get-user'
import { OficinaView } from './_components/oficina-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Oficina' }

export default async function OficinaPage() {
  await requireUser()
  return <OficinaView />
}
