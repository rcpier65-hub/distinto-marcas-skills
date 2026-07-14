// app/app/cliente/page.tsx
// Portal del CLIENTE (por marca). Ve sus publicaciones publicadas y por
// publicar, y activa notificaciones push para recibir aviso cuando se publica.
// Pedro 09-jul-2026 — prueba con Mil Ideas.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { ClientePortalView, type PubCliente } from './_components/cliente-portal-view'

export const dynamic = 'force-dynamic'

function ymdLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
function normalizeRedes(plataformas: string[] | null): string[] {
  return (plataformas ?? []).map((p) => {
    const v = (p ?? '').toLowerCase()
    if (v.includes('insta')) return 'instagram'
    if (v.includes('face')) return 'facebook'
    if (v.includes('tik')) return 'tiktok'
    if (v.includes('linke')) return 'linkedin'
    if (v.includes('you')) return 'youtube'
    return v
  }).filter(Boolean)
}

export default async function ClientePortalPage() {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) redirect('/inicio')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = ymdLima(new Date())

  const COLS = `id, nombre, copy, guion, fecha_publicacion, estado, plataformas, publicado_at, aprobado_cliente_at, portada_editada_url, portada_cruda_url, video_con_musica_url, drive_resultado_url, link_tiktok, link_instagram`

  // Traemos TODAS las publicaciones de la marca (con y sin publicar). El
  // calendario del portal las agrupa por día; la vista lista las separa en
  // "por publicar" y "publicadas".
  const { data } = await service
    .from('publicaciones')
    .select(COLS)
    .eq('marca_id', cliente.marcaId)
    .order('fecha_publicacion', { ascending: false })
    .limit(400)
    .then((r: unknown) => r, () => ({ data: [] }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRow = (r: any): PubCliente => ({
    id: r.id,
    titulo: r.nombre ?? '(sin título)',
    // Fecha del calendario: la programada; si ya se publicó sin fecha, usamos
    // la fecha real de publicación (en horario Lima).
    fecha: r.fecha_publicacion ?? (r.publicado_at ? ymdLima(new Date(r.publicado_at)) : null),
    publicadoAt: r.publicado_at ?? null,
    aprobadoAt: r.aprobado_cliente_at ?? null,
    redes: normalizeRedes(r.plataformas),
    portada: r.portada_editada_url ?? r.portada_cruda_url ?? null,
    video: r.video_con_musica_url ?? null,
    driveResultado: r.drive_resultado_url ?? null,
    linkTiktok: r.link_tiktok ?? null,
    linkInstagram: r.link_instagram ?? null,
    copy: r.copy ?? null,
    guion: r.guion ?? null,
    estado: r.estado ?? null,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubs = (((data as any) ?? []) as any[]).map(mapRow)

  return (
    <ClientePortalView
      marcaId={cliente.marcaId}
      marcaNombre={cliente.marcaNombre}
      marcaSlug={cliente.marcaSlug}
      marcaEmoji={cliente.marcaEmoji}
      marcaColor={cliente.marcaColor}
      contacto={cliente.nombre}
      hoy={hoy}
      pubs={pubs}
    />
  )
}
