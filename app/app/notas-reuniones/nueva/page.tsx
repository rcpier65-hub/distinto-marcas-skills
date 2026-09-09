// Crea una nota borrador y redirige al editor.

import { crearNotaYRedirigir } from '../_actions'

export const dynamic = 'force-dynamic'

export default async function NuevaNotaPage() {
  await crearNotaYRedirigir()
}
