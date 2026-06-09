/* /cockpit ahora redirige a /inicio.
 * Pedro pidió fusionar Cockpit con Inicio porque 'es lo mismo'. El
 * contenido del cockpit ejecutivo se renderiza embebido dentro de
 * /inicio para users con permiso 'metricas'. Mantenemos esta ruta
 * solo como redirect para no romper links viejos del CommandPalette,
 * historial, bookmarks, etc. */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CockpitPage() {
  redirect('/inicio')
}
