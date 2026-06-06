// app/app/diseno/[id]/page.tsx
//
// Vista detalle de tarea de diseño STANDALONE (marca=interno).
// Pedro pidió: las tareas standalone NO deben mostrar el form completo
// de publicación (Copy, Música, Portada, Tomas, Guion...) — solo lo
// relevante para diseño puro:
//   - Nombre + descripción
//   - Drive de material (input para trabajar)
//   - Drive de resultado (output terminado)
//   - Fecha entrega + fecha diseño
//   - Sub-estado (sin_empezar / en_progreso / listo / archivado)
//   - Reunión si tiene
//
// Las tareas "para publicar" (marca cliente) van a /publicaciones/[id]
// que tiene el form completo. Routing en /diseno → openRow:
//   esInterno → /diseno/[id]
//   else      → /publicaciones/[id]

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { DisenoDetailForm } from './_components/diseno-detail-form'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function DisenoDetailPage({ params }: PageProps) {
  await requireUser()
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: pub, error } = await service
    .from('publicaciones')
    .select(`
      id, nombre, descripcion,
      fecha_diseno, fecha_entrega,
      estado, estado_tarea,
      drive_material_url, drive_resultado_url,
      reunion_hora, invitados_emails,
      started_at, archived_at,
      created_at, updated_at,
      marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !pub) {
    /* Si la pub no existe O es de una marca cliente real, redirige a
       la vista completa de /publicaciones/[id] que SÍ existe y tiene
       el form normal. */
    redirect(`/publicaciones/${id}`)
  }

  const marca = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca

  /* Si la tarea NO es interna (es una marca cliente), redirigimos al
     form completo. Esta página es SOLO para standalone. */
  if (marca?.slug && marca.slug !== 'interno') {
    redirect(`/publicaciones/${id}`)
  }

  return (
    <main className="container mx-auto p-6 max-w-3xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/diseno" className="hover:text-foreground">
          Diseño
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[260px]">{pub.nombre}</span>
      </nav>

      <DisenoDetailForm
        publicacion={{
          id: pub.id,
          nombre: pub.nombre,
          descripcion: pub.descripcion,
          fechaDiseno: pub.fecha_diseno,
          fechaEntrega: pub.fecha_entrega,
          subEstado: pub.estado_tarea ?? 'sin_empezar',
          driveMaterialUrl: pub.drive_material_url,
          driveResultadoUrl: pub.drive_resultado_url,
          horaReunion: pub.reunion_hora,
          invitadosEmails: pub.invitados_emails ?? [],
          startedAt: pub.started_at,
          archivedAt: pub.archived_at,
          createdAt: pub.created_at,
          updatedAt: pub.updated_at,
          marcaEmoji: marca?.emoji_marca ?? '🎨',
          marcaNombre: marca?.nombre ?? 'Distinto · Interno',
          marcaColor: marca?.color_primario_hex ?? '#a78bfa',
        }}
      />
    </main>
  )
}
