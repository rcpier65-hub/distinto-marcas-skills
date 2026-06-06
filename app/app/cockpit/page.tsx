/* /cockpit — la nueva home de Distinto.
   Renderiza dentro del AppShell (sidebar 240px a la izquierda).
   Mientras conectamos Supabase real, usa mock data centralizado.

   Route guard: si el usuario no tiene permiso "metricas" (ej. un
   editor entrando directo a /cockpit), lo redirigimos al primer
   módulo que SÍ pueda ver. Así nadie ve datos que no le corresponden. */

import { redirect } from 'next/navigation'
import { CockpitView } from '@/components/views/CockpitView'
import { getCurrentMemberPermisos, getLandingRoute } from '@/lib/team/permisos-helper'
import { tieneAcceso } from '@/lib/team/types'

export const dynamic = 'force-dynamic'

export default async function CockpitPage() {
  const p = await getCurrentMemberPermisos()
  /* Si NO hay miembro asociado = admin/owner → mostrar cockpit normal */
  if (p) {
    /* Hay miembro → chequear permiso metricas */
    if (!tieneAcceso(p.permisos, 'metricas')) {
      const landing = await getLandingRoute()
      redirect(landing)
    }
  }
  return <CockpitView />
}
