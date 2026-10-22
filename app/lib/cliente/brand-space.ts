import 'server-only'
import { getClienteActual } from './get-cliente'
import { createServiceClient } from '@/lib/supabase/service'
import { getReporteBySlug } from '@/lib/reportes/registry'
import { computeDirecto } from '@/lib/reportes/directo'
import { pinReportesOk } from '@/app/reportes/_actions'
import { notFound } from 'next/navigation'

/** Client projection of the existing brand space. Never serialize loadBrand's staff payload. */
export async function loadClientBrandSpace(slug: string) {
  const client = await getClienteActual()
  // The active brand is selected through the existing, validated client switcher.
  if (!client || client.marcaSlug !== slug) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const active = await db.from('marcas').select('id').eq('id', client.marcaId).eq('activa', true).maybeSingle()
  if (active.error) throw new Error('No se pudo comprobar la marca')
  if (!active.data) notFound()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const month = today.slice(0, 7), start = `${month}-01`
  const next = new Date(`${start}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1)
  const end = next.toISOString().slice(0, 10)
  const pubs = () => db.from('publicaciones').select('id', { count: 'exact', head: true }).eq('marca_id', client.marcaId)
  const [published, scheduled, designs, ready, sheets, meetings, report, unlocked] = await Promise.all([
    pubs().gte('publicado_at', `${start}T00:00:00-05:00`).lt('publicado_at', `${end}T00:00:00-05:00`),
    pubs().is('publicado_at', null).gte('fecha_publicacion', today).lt('fecha_publicacion', end).neq('estado', 'archivado'),
    pubs().eq('es_tarea_diseno', true).neq('estado_tarea', 'archivado'),
    pubs().eq('es_tarea_diseno', true).or('estado_tarea.eq.listo,diseno_terminado_at.not.is.null').neq('estado_tarea', 'archivado'),
    db.from('strategy_records').select('id,title,updated_at').eq('marca_id', client.marcaId).eq('kind', 'sheet').eq('archived', false).eq('data->>sharedWithClient', 'true').order('updated_at', { ascending: false }),
    db.from('marca_reuniones').select('id,titulo,fecha_hora,modalidad').eq('marca_id', client.marcaId).eq('estado', 'agendada').gte('fecha_hora', new Date().toISOString()).order('fecha_hora').limit(4),
    getReporteBySlug(slug, client.marcaNombre), pinReportesOk(),
  ])
  if ([published, scheduled, designs, ready, sheets, meetings].some(r => r.error)) throw new Error('No se pudo cargar el resumen. Intenta actualizarlo.')
  // Only published months reach the browser. Drafts are not hidden with client CSS.
  const authorizedMonths = (report?.meses ?? []).filter(m => computeDirecto(m).publicado)
  return {
    brand: { id: client.marcaId, slug: client.marcaSlug, name: client.marcaNombre, emoji: client.marcaEmoji, color: client.marcaColor, logo: client.marcaLogoUrl },
    today, month,
    counts: { published: published.count ?? 0, scheduled: scheduled.count ?? 0, designs: designs.count ?? 0, ready: ready.count ?? 0 },
    sheets: (sheets.data ?? []) as { id: string; title: string; updated_at: string }[],
    meetings: (meetings.data ?? []) as { id: string; titulo: string; fecha_hora: string; modalidad: string }[],
    report: authorizedMonths.length ? { name: report!.nombre, count: authorizedMonths.length, months: unlocked ? authorizedMonths : null } : null,
  }
}
export type ClientBrandSpaceData = Awaited<ReturnType<typeof loadClientBrandSpace>>
