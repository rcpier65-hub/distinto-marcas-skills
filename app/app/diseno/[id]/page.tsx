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
//   - Sub-estado + reunión
//
// Las tareas "para publicar" (marca cliente) van a /publicaciones/[id]
// que tiene el form completo. Routing en /diseno → openRow.

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
    /* SELECT * para tolerar columnas nuevas (reunion_event_id / reunion_meet_link)
       que se crean al vuelo al sincronizar la reunión. */
    .select('*, marca:marcas(slug, nombre, emoji_marca, color_primario_hex)')
    .eq('id', id)
    .maybeSingle()

  if (error || !pub) {
    /* Si no existe, redirige a /publicaciones/[id] (puede ser una
       publicación normal con el form completo). */
    redirect(`/publicaciones/${id}`)
  }

  const marca = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca

  /* Marcas activas para el selector "cambiar marca" + etiquetas extra. */
  const { data: marcasData } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca')
    .eq('activa', true)
    .order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasRaw = (marcasData ?? []) as any[]
  const marcas = marcasRaw.map((m) => ({
    slug: m.slug as string,
    nombre: m.nombre as string,
    emoji: (m.emoji_marca ?? null) as string | null,
  }))
  /* Etiquetas extra actuales (marcas_extra = uuid[]) resueltas a slugs. */
  const slugById = new Map<string, string>(marcasRaw.map((m) => [m.id as string, m.slug as string]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasExtraSlugs: string[] = ((Array.isArray(pub.marcas_extra) ? pub.marcas_extra : []) as string[])
    .map((eid) => slugById.get(eid))
    .filter(Boolean) as string[]

  /* Solo las tareas "para publicar" (con fecha de publicación) usan el form
     completo de publicación. Las standalone / reunión (sin fecha) se quedan en
     esta vista simple — AUNQUE tengan una marca elegida. */
  if (pub.fecha_publicacion) {
    redirect(`/publicaciones/${id}`)
  }

  return (
    <main className="container mx-auto p-6 max-w-3xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/diseno" className="hover:text-foreground">Diseño</Link>
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
          fechaMarcadaParaDisenar: pub.fecha_marcada_para_disenar ?? null,
          driveMaterialUrl: pub.drive_material_url,
          driveResultadoUrl: pub.drive_resultado_url,
          horaReunion: pub.reunion_hora,
          invitadosEmails: pub.invitados_emails ?? [],
          startedAt: pub.started_at,
          archivedAt: pub.archived_at,
          createdAt: pub.created_at,
          updatedAt: pub.updated_at,
          marcaSlug: marca?.slug ?? 'interno',
          marcaEmoji: marca?.emoji_marca ?? '🎨',
          marcaNombre: marca?.nombre ?? 'Distinto · Interno',
          marcaColor: marca?.color_primario_hex ?? '#a78bfa',
          reunionMeetLink: pub.reunion_meet_link ?? null,
        }}
        marcas={marcas}
        marcasExtraSlugs={marcasExtraSlugs}
      />
    </main>
  )
}
