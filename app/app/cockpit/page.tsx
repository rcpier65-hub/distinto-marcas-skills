/* /cockpit — la nueva home de Distinto.
   Renderiza dentro del AppShell (sidebar 240px a la izquierda).
   Mientras conectamos Supabase real, usa mock data centralizado.
   Cuando migremos data real (M4 next iteration), reemplazamos
   las constantes mock por queries server. */

import { CockpitView } from '@/components/views/CockpitView'

export const dynamic = 'force-dynamic'

export default function CockpitPage() {
  return <CockpitView />
}
