// Crea una nota borrador y redirige al editor. Con ?transcribir=1 (botón
// "Transcribir reunión" o atajo del ícono de la app) la nota arranca a
// transcribir sola.

import { crearNotaYRedirigir } from '../_actions'

export const dynamic = 'force-dynamic'

export default async function NuevaNotaPage({ searchParams }: { searchParams: Promise<{ transcribir?: string }> }) {
  const sp = await searchParams
  await crearNotaYRedirigir(sp.transcribir === '1')
}
