// Presentaciones comerciales (Pedro 21-oct-2026): lista y nueva reunión.
import { soloDireccion } from '@/lib/presentacion/server'
import { ListaPresentaciones } from '@/components/presentacion/lista'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presentaciones' }

export default async function PresentacionesPage() {
  await soloDireccion()
  return <ListaPresentaciones />
}
