/* /cockpit — la nueva home de Distinto.
   Renderiza dentro del AppShell (sidebar 240px a la izquierda).
   Mientras conectamos Supabase real, usa mock data centralizado.

   Route guard: si el usuario no tiene permiso "metricas" (ej. un
   editor o community_manager entrando directo a /cockpit), lo
   redirigimos al primer módulo que SÍ pueda ver. */

import { redirect } from 'next/navigation'
import { CockpitView } from '@/components/views/CockpitView'
import { getCurrentMemberPermisos, getLandingRoute } from '@/lib/team/permisos-helper'
import { getUser } from '@/lib/auth/get-user'
import { tieneAcceso, type ModuloPermiso } from '@/lib/team/types'

export const dynamic = 'force-dynamic'

export default async function CockpitPage() {
  const p = await getCurrentMemberPermisos()

  /* Si HAY miembro y NO tiene permiso métricas → redirect.
     Sin miembro = admin/owner → passthrough. */
  if (p && !tieneAcceso(p.permisos, 'metricas')) {
    redirect(await getLandingRoute())
  }

  /* Personalizar el saludo. Prioridad:
     1. Nombre del team_member si lo hay
     2. user_metadata.full_name (Google login)
     3. Primer parte del email
     4. "amigo" fallback */
  let nombreUsuario = 'amigo'
  if (p) {
    nombreUsuario = p.member.nombre.split(/[\s\-]/)[0]
  } else {
    const user = await getUser()
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : null
      if (fullName) nombreUsuario = fullName.split(/[\s\-]/)[0]
      else if (user.email) nombreUsuario = user.email.split('@')[0]
    }
  }
  /* Capitalizar primera letra */
  nombreUsuario = nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1).toLowerCase()

  /* Permiso "finanzas" → Pedro (admin/owner) lo tiene true.
     Lorena/Pieer/etc → false. Si no hay team_member (Pedro entrando
     con Google sin perfil) → asumir admin = true. */
  const puedeVerFinanzas = p
    ? tieneAcceso(p.permisos, 'finanzas' as ModuloPermiso)
    : true  /* admin/owner sin team_member ve todo */

  return <CockpitView nombreUsuario={nombreUsuario} puedeVerFinanzas={puedeVerFinanzas} />
}
