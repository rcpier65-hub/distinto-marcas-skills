// app/app/cliente/page.tsx
// Portal del CLIENTE (por marca). Ve sus publicaciones publicadas y por
// publicar, y activa notificaciones push para recibir aviso cuando se publica.
// Pedro 09-jul-2026 — prueba con Mil Ideas.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { ClientePortalView, type PubCliente } from './_components/cliente-portal-view'
import { getReporteBySlug } from '@/lib/reportes/registry'
import { pinReportesOk } from '@/app/reportes/_actions'

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

  const COLS = `id, nombre, copy, guion, fecha_publicacion, fecha_entrega, estado, estado_tarea, es_tarea_diseno, plataformas, publicado_at, aprobado_cliente_at, portada_editada_url, portada_cruda_url, video_con_musica_url, drive_resultado_url, link_tiktok, link_instagram`

  // Traemos TODAS las publicaciones de la marca (con y sin publicar). El
  // calendario del portal las agrupa por día; la vista lista las separa en
  // "por publicar" y "publicadas".
  /* CORTE del portal: el cliente solo ve contenido de AGOSTO 2026 en adelante.
     Limpia el backlog viejo (videos antiguos sin publicar acumulados desde el
     inicio) sin borrar nada — solo deja de mostrarlos. Corte FIJO (no rueda por
     mes) para conservar el historial de aquí en adelante. Pedro 5-ago-2026. */
  const PORTAL_DESDE = '2026-08-01'
  const { data } = await service
    .from('publicaciones')
    .select(COLS)
    .eq('marca_id', cliente.marcaId)
    .or(`fecha_publicacion.gte.${PORTAL_DESDE},publicado_at.gte.${PORTAL_DESDE}`)
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
    fechaEntrega: r.fecha_entrega ?? null,
    esDiseno: !!r.es_tarea_diseno,
    estadoTarea: r.estado_tarea ?? null,
    copy: r.copy ?? null,
    guion: r.guion ?? null,
    estado: r.estado ?? null,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubs = (((data as any) ?? []) as any[]).map(mapRow)

  const { getObservacionesMarca, getReunionesMarca, getGrabacionesMarca } = await import('@/lib/portal/coordinacion')
  const [observaciones, reuniones, grabaciones, fechasRes] = await Promise.all([
    getObservacionesMarca(service, cliente.marcaId).catch(() => []),
    getReunionesMarca(service, cliente.marcaId).catch(() => []),
    getGrabacionesMarca(service, cliente.marcaId).catch(() => []),
    // Fechas importantes de la marca (idea de Lorena) — el cliente las ve en su
    // portal (solo lectura). Pedro 24-jul-2026.
    service.from('fechas_importantes')
      .select('id, titulo, fecha, nota, categoria')
      .eq('marca_id', cliente.marcaId)
      .order('fecha', { ascending: true })
      .then((r: unknown) => r, () => ({ data: [] })),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fechasImportantes = ((((fechasRes as any)?.data) ?? []) as any[]).map((f) => ({
    id: f.id as string,
    titulo: (f.titulo ?? '—') as string,
    fecha: (typeof f.fecha === 'string' ? f.fecha.slice(0, 10) : f.fecha) as string,
    nota: (f.nota ?? null) as string | null,
    categoria: (f.categoria ?? 'otro') as string,
  }))

  /* Reporte mensual de SU marca (si existe) — protegido por código.
     El desbloqueo (cookie 12h) se decide en el server: la data del reporte
     solo se envía al navegador si ya ingresó el código. */
  const reporte = getReporteBySlug(cliente.marcaSlug)
  const reporteDesbloqueado = reporte ? await pinReportesOk() : false

  return (
    <ClientePortalView
      marcaId={cliente.marcaId}
      observaciones={observaciones}
      reuniones={reuniones}
      grabaciones={grabaciones}
      marcaNombre={cliente.marcaNombre}
      marcaSlug={cliente.marcaSlug}
      marcaEmoji={cliente.marcaEmoji}
      marcaColor={cliente.marcaColor}
      marcaLogoUrl={cliente.marcaLogoUrl}
      driveUrl={cliente.driveUrl}
      contacto={cliente.nombre}
      hoy={hoy}
      pubs={pubs}
      fechasImportantes={fechasImportantes}
      reporteNombre={reporte?.nombre ?? null}
      reporteMeses={reporte && reporteDesbloqueado ? reporte.meses : null}
    />
  )
}
