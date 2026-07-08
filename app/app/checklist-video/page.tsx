// app/app/checklist-video/page.tsx
//
// "Checklist de video" — flujo propio de Erick (solo él). Se auto-organiza:
// crea la agenda del video, lo marca editado, lo verifica con la Guía de
// Ganchos (checklist), y al aprobar se agenda en la grilla de Distinto Agencia.
// Pedro 07-jul-2026: "Erick hace todo el trabajo". Solo Erick ve esta pantalla.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { ChecklistVideoView, type VideoErick } from './_components/checklist-video-view'

export const dynamic = 'force-dynamic'

export default async function ChecklistVideoPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: me } = await service
    .from('team_members')
    .select('id, nombre')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Solo Erick. Cualquier otro se va a su inicio.
  if (!me || me.nombre !== 'Erick') redirect('/inicio')

  const [videosRes, marcasRes] = await Promise.all([
    service
      .from('videos_erick')
      .select('id, titulo, cuenta_slug, estado, checklist, fecha_publicacion, publicacion_id, created_at')
      .eq('team_member_id', me.id)
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('marcas').select('slug, nombre').order('nombre'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasRes?.data ?? []) as any[]).map((m) => ({ slug: m.slug as string, nombre: m.nombre as string }))
  const nombrePorSlug = new Map(marcas.map((m) => [m.slug, m.nombre]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos: VideoErick[] = ((videosRes?.data ?? []) as any[]).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    cuentaSlug: r.cuenta_slug ?? 'distinto-agencia',
    cuentaNombre: nombrePorSlug.get(r.cuenta_slug ?? 'distinto-agencia') ?? 'Distinto Agencia',
    estado: (r.estado ?? 'por_editar') as VideoErick['estado'],
    checklist: (r.checklist ?? {}) as Record<string, boolean>,
    fechaPublicacion: r.fecha_publicacion ?? null,
    publicacionId: r.publicacion_id ?? null,
  }))

  return <ChecklistVideoView videos={videos} marcas={marcas} />
}
