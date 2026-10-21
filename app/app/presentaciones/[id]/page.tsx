// Una reunión de venta: la presentación a pantalla completa (Pedro 21-oct-2026).
import { cargarSesion } from '@/lib/presentacion/server'
import { Deck } from '@/components/presentacion/deck'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presentación' }

export default async function PresentacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await cargarSesion(id)
  return <Deck inicial={s} />
}
