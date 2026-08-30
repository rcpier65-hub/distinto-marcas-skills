// app/app/influencers/page.tsx
// Módulo Influencers — TypHouse (marca little-joe). Kanban de pedidos a
// influencers: Pedido enviado → Pedido entregado → Video enviado, con el
// usuario de IG, enlace del video y la carpeta de Drive de los videos.
import { requireUser } from '@/lib/auth/get-user'
import { leerInfluencersDb } from '@/lib/influencers/db'
import { InfluencersView } from './_components/influencers-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Influencers' }

const MARCA_SLUG = 'little-joe'
const DRIVE_VIDEOS = 'https://drive.google.com/drive/folders/1feYgjVXukpORKqeKbmovzALOrBMYUDFq?usp=drive_link'

export default async function InfluencersPage() {
  await requireUser()
  const filas = await leerInfluencersDb(MARCA_SLUG)
  return (
    <InfluencersView
      marcaSlug={MARCA_SLUG}
      marcaNombre="TypHouse"
      driveUrl={DRIVE_VIDEOS}
      iniciales={filas.map((f) => ({
        id: f.id,
        usuarioIg: f.usuario_ig,
        nombre: f.nombre,
        estado: f.estado,
        videoUrl: f.video_url,
        notas: f.notas,
        creadoEl: f.created_at,
      }))}
    />
  )
}
