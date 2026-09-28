// app/lib/calendario/cargar-agenda.ts
//
// Arma los eventos que pinta /grabaciones/calendario (grabaciones, reuniones,
// publicaciones sincronizadas, fechas importantes y Google Calendar, con el
// mismo dedup). La página y GET /api/v1/grabaciones/calendario llaman aquí.

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { getGoogleCalendarStatus, listCalendarEvents } from '@/lib/integrations/google-calendar'
import { consultarGrabaciones } from '@/lib/grabaciones/consultar'
import type { AgendaEvento } from '@/app/grabaciones/calendario/_components/agenda-calendar'

const COLOR_RESERVA_WEB = '#f97316'

function tsALima(iso: string): { ymd: string; hm: string } {
  const d = new Date(iso)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { ymd, hm }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function marcaPorTitulo(titulo: string, marcas: any[]): any | null {
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const t = norm(titulo)
  let mejor = null
  let mejorScore = 0
  for (const m of marcas) {
    const palabras = [...norm(String(m.nombre ?? '')).split(/\s+/), ...String(m.slug ?? '').split('-')].filter((w) => w.length > 3)
    const score = new Set(palabras.filter((w) => t.includes(w))).size
    if (score > mejorScore) { mejorScore = score; mejor = m }
  }
  return mejor
}

export type AgendaMarcaMes = { slug: string; nombre: string; emoji: string | null; color: string }
export type AgendaMarcaOpcion = { id: string; slug: string; nombre: string; emoji: string | null }

export type AgendaCargada = {
  eventos: AgendaEvento[]
  marcasMes: AgendaMarcaMes[]
  marcasTodas: AgendaMarcaOpcion[]
  grabError: string | null
  gcal: { connected: boolean; email: string | null }
}

export async function cargarAgendaCalendario(opts: {
  desde: string
  hasta: string
  /** null = todas las marcas (owner o marcas_acceso null). */
  marcasAcceso: string[] | null
}): Promise<AgendaCargada> {
  const { desde, hasta } = opts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const [grabRes, marcasRes, gcalStatus, gcalEvents] = await Promise.all([
    consultarGrabaciones(desde, hasta),
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_calendario'),
    getGoogleCalendarStatus(),
    listCalendarEvents(desde, hasta),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasById = new Map<string, any>(((marcasRes.data ?? []) as any[]).map((m) => [m.id as string, m]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reunionesRows: any[] = []
  try {
    const COLS = ['id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado, google_event_id, duracion_min',
                  'id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado, google_event_id',
                  'id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado',
                  'id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas']
    for (const cols of COLS) {
      const r = await service
        .from('marca_reuniones')
        .select(cols)
        .gte('fecha_hora', `${desde}T00:00:00-05:00`)
        .lte('fecha_hora', `${hasta}T23:59:59-05:00`)
        .order('fecha_hora', { ascending: true })
      if (!r.error) { reunionesRows = r.data ?? []; break }
      if (!/estado|google_event_id|duracion_min|schema cache|42703/i.test(r.error.message ?? '')) break
    }
  } catch { /* sin reuniones */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pubsRows: any[] = []
  try {
    const r = await service
      .from('publicaciones')
      .select('id, nombre, marca_id, fecha_publicacion, gcal_pub_event_id')
      .not('gcal_pub_event_id', 'is', null)
      .gte('fecha_publicacion', desde)
      .lte('fecha_publicacion', hasta)
      .order('fecha_publicacion', { ascending: true })
      .limit(200)
    if (!r.error) pubsRows = r.data ?? []
  } catch { /* sin publicaciones sincronizadas */ }

  const marcasPermitidas = opts.marcasAcceso ? new Set(opts.marcasAcceso) : null
  const eventos: AgendaEvento[] = []
  const grabRows = (grabRes.ok ? grabRes.rows : []).filter((g) => !marcasPermitidas || marcasPermitidas.has(g.marca_id))
  reunionesRows = reunionesRows.filter((r) => !marcasPermitidas || marcasPermitidas.has(r.marca_id))
  pubsRows = pubsRows.filter((p) => !marcasPermitidas || marcasPermitidas.has(p.marca_id))
  const idsDeLaApp = new Set([
    ...grabRows.map((g) => g.google_event_id),
    ...reunionesRows.map((r) => r.google_event_id),
    ...pubsRows.map((p) => p.gcal_pub_event_id),
  ].filter(Boolean) as string[])
  const meetsDeReuniones = new Set(reunionesRows.map((r) => r.lugar_enlace).filter(Boolean) as string[])
  const clavesReuniones = new Set(reunionesRows.map((r) => {
    const { ymd, hm } = tsALima(r.fecha_hora)
    return `${ymd}|${hm}`
  }))
  const normTitulo = (s: string) => s.replace(/^[📌🎬🎥🤝]\s*/u, '').trim().toLowerCase()
  const titulosReuniones = new Set(reunionesRows.map((r) => {
    const { ymd } = tsALima(r.fecha_hora)
    return `${ymd}|${normTitulo(String(r.titulo ?? ''))}`
  }))

  const durGoogle = new Map(gcalEvents.map((ev) => [ev.id, ev.durationMin]))
  const durDe = (propia: number | null | undefined, gid: string | null | undefined) =>
    (propia && propia > 0 ? propia : null) ?? (gid ? durGoogle.get(gid) ?? null : null)

  for (const g of grabRows) {
    const marca = marcasById.get(g.marca_id)
    eventos.push({
      id: g.id,
      tipo: 'grabacion',
      fecha: g.fecha_planeada,
      hora: g.hora_planeada ? g.hora_planeada.slice(0, 5) : null,
      titulo: `Grabación · ${g.marca_nombre}`,
      marcaSlug: g.marca_slug,
      marcaNombre: g.marca_nombre,
      marcaEmoji: g.marca_emoji,
      color: marca?.color_calendario ?? '#6366F1',
      estado: g.estado,
      meetLink: null,
      notas: g.notas,
      videosGrabados: g.videos_grabados,
      duracionMin: durDe(g.duracion_min, g.google_event_id),
    })
  }

  for (const r of reunionesRows) {
    const marca = marcasById.get(r.marca_id)
    const { ymd, hm } = tsALima(r.fecha_hora)
    const esLink = typeof r.lugar_enlace === 'string' && /^https?:\/\//.test(r.lugar_enlace)
    eventos.push({
      id: r.id,
      tipo: 'reunion',
      fecha: ymd,
      hora: hm,
      titulo: r.titulo || `Reunión${marca ? ` con ${marca.nombre}` : ''}`,
      marcaSlug: marca?.slug ?? null,
      marcaNombre: marca?.nombre ?? null,
      marcaEmoji: marca?.emoji_marca ?? null,
      color: marca?.color_calendario ?? '#7c3aed',
      estado: r.estado ?? 'agendada',
      meetLink: esLink ? r.lugar_enlace : null,
      notas: r.notas ?? (r.modalidad === 'presencial' && r.lugar_enlace && !esLink ? `Lugar: ${r.lugar_enlace}` : null),
      videosGrabados: null,
      duracionMin: durDe(r.duracion_min, r.google_event_id),
    })
  }

  for (const p of pubsRows) {
    const marca = marcasById.get(p.marca_id)
    eventos.push({
      id: p.id,
      tipo: 'publicacion',
      fecha: p.fecha_publicacion,
      hora: '18:00',
      titulo: p.nombre ?? 'Publicación',
      marcaSlug: marca?.slug ?? null,
      marcaNombre: marca?.nombre ?? null,
      marcaEmoji: marca?.emoji_marca ?? null,
      color: marca?.color_calendario ?? '#e11d48',
      estado: null,
      meetLink: null,
      notas: 'Ventana de publicación 6–8 pm',
      videosGrabados: null,
      href: `/publicaciones/${p.id}`,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fechasRows: any[] = []
  try {
    const r = await service
      .from('fechas_importantes')
      .select('id, marca_id, titulo, fecha, nota, categoria')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: true })
      .limit(200)
    if (!r.error) fechasRows = r.data ?? []
  } catch { /* sin fechas importantes */ }
  fechasRows = fechasRows.filter((f) => !marcasPermitidas || !f.marca_id || marcasPermitidas.has(f.marca_id))

  for (const f of fechasRows) {
    const marca = f.marca_id ? marcasById.get(f.marca_id) : null
    eventos.push({
      id: f.id,
      tipo: 'fecha',
      fecha: f.fecha,
      hora: null,
      titulo: f.titulo ?? 'Fecha importante',
      marcaSlug: marca?.slug ?? null,
      marcaNombre: marca?.nombre ?? null,
      marcaEmoji: marca?.emoji_marca ?? null,
      color: marca?.color_calendario ?? '#f59e0b',
      estado: null,
      meetLink: null,
      notas: [f.categoria, f.nota].filter(Boolean).join(' · ') || null,
      videosGrabados: null,
      href: '/fechas-importantes',
    })
  }

  for (const ev of gcalEvents) {
    if (idsDeLaApp.has(ev.id)) continue
    if (ev.meetLink && meetsDeReuniones.has(ev.meetLink)) continue
    if (ev.summary.startsWith('🎬')) continue
    if (ev.summary.startsWith('📣')) continue
    if (ev.summary.startsWith('⭐')) continue
    if (ev.summary.startsWith('📌') && clavesReuniones.has(`${ev.fecha}|${ev.hora}`)) continue
    if (titulosReuniones.has(`${ev.fecha}|${normTitulo(ev.summary)}`)) continue
    const tipoGoogle = /grabaci|grabar|rodaje/i.test(ev.summary) ? 'grabacion' as const
      : (/reuni|revisi|diagn[oó]stic|llamada|sesi[oó]n|meeting|call\b|entrevista|onboarding|kick.?off/i.test(ev.summary) || !!ev.meetLink) ? 'reunion' as const
      : 'gcal' as const
    const esReservaWeb = /^diagn[oó]stico distinto/i.test(ev.summary.trim())
    const marcaG = tipoGoogle !== 'gcal' && !esReservaWeb ? marcaPorTitulo(ev.summary, [...marcasById.values()]) : null
    if (marcaG && marcasPermitidas && !marcasPermitidas.has(marcaG.id)) continue
    eventos.push({
      id: ev.id,
      tipo: tipoGoogle,
      origenGoogle: true,
      fecha: ev.fecha,
      hora: ev.hora,
      titulo: ev.summary,
      marcaSlug: marcaG?.slug ?? null,
      marcaNombre: marcaG?.nombre ?? null,
      marcaEmoji: marcaG?.emoji_marca ?? null,
      color: esReservaWeb ? COLOR_RESERVA_WEB : marcaG?.color_calendario ?? (tipoGoogle === 'grabacion' ? '#6366F1' : '#3b82f6'),
      estado: null,
      meetLink: ev.meetLink,
      videosGrabados: null,
      notas: esReservaWeb ? '🌐 Cliente nuevo · reservó desde la web (distintostudio.com)' : tipoGoogle !== 'gcal' ? 'Agendado en Google Calendar' : null,
      duracionMin: ev.durationMin,
    })
  }

  const marcasMes = Array.from(
    new Map(
      eventos
        .filter((e) => e.marcaSlug)
        .map((e) => [e.marcaSlug as string, {
          slug: e.marcaSlug as string,
          nombre: e.marcaNombre ?? '',
          emoji: e.marcaEmoji,
          color: e.color,
        }]),
    ).values(),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  return {
    eventos,
    marcasMes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcasTodas: ((marcasRes.data ?? []) as any[]).map((m) => ({
      id: m.id as string,
      slug: m.slug as string,
      nombre: m.nombre as string,
      emoji: (m.emoji_marca ?? null) as string | null,
    })),
    grabError: grabRes.ok ? null : grabRes.error,
    gcal: gcalStatus,
  }
}
