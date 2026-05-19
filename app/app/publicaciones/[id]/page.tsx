// app/app/publicaciones/[id]/page.tsx
// Vista detalle de una publicación con TODAS las variables editables.
// Estilo Notion: title arriba, properties panel, content body.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicacionDetailForm } from './_components/publicacion-detail-form'
import type { PublicacionRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function PublicacionDetailPage({ params }: PageProps) {
  await requireUser()
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: pub, error } = await service
    .from('publicaciones')
    .select(`
      *,
      marca:marcas(id, slug, nombre, emoji_marca, color_primario_hex)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !pub) notFound()

  const marca = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca

  return (
    <main className="container mx-auto p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/publicaciones" className="hover:text-foreground">
          Publicaciones
        </Link>
        <span>/</span>
        {marca && (
          <>
            <Link
              href={`/publicaciones?marca=${marca.slug}`}
              className="hover:text-foreground flex items-center gap-1"
            >
              <span>{marca.emoji_marca}</span>
              <span>{marca.nombre}</span>
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium truncate max-w-[260px]">{pub.nombre}</span>
      </nav>

      <PublicacionDetailForm publicacion={pub as PublicacionRow} marca={marca} />
    </main>
  )
}
