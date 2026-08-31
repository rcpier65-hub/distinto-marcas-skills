// app/app/grabaciones/calendario/page.tsx
//
// Vista CALENDARIO unificada del módulo "Grabaciones y Reuniones" — server
// component. Pedro 31-ago-2026: la vista principal del módulo es un calendario
// tipo Google Calendar (no por marcas), con filtros de grabaciones/reuniones,
// sincronizado con Google Calendar y con el asistente agendador embebido.
//
// Fuentes de eventos:
//   1. Tabla `grabaciones` (con hora_planeada) — color por marca
//   2. Tabla `marca_reuniones` (agendadas con clientes, con link de Meet)
//   3. Google Calendar de Pedro (lectura) — lo agendado FUERA de la app
//      (dedup: se saltan los eventos que la propia app creó)

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo, getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { createServiceClient } from '@/lib/supabase/service'
import { getGoogleCalendarStatus, listCalendarEvents } from '@/lib/integrations/google-calendar'
import { listGrabaciones } from '../_actions'
import { GoogleCalendarConnect } from '../_components/gcal-connect'
import { AgendarReunionBox } from '@/app/inicio/_components/agendar-reunion-box'
import { AgendaCalendar, type AgendaEvento } from './_components/agenda-calendar'
import { RangoNav, type VistaAgenda } from './_components/rango-nav'

export const dynamic = 'force-dynamic'

type SP = { desde?: string; hasta?: string; vista?: string }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* Fecha/hora Lima desde un timestamptz ISO (marca_reuniones.fecha_hora). */
function tsALima(iso: string): { ymd: string; hm: string } {
  const d = new Date(iso)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { ymd, hm }
}

export default async function GrabacionesCalendarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  await ensureAccesoModulo('publicaciones')
  const sp = await searchParams

  /* Vista: Día / Semana / Mes — SEMANA por defecto al abrir (Pedro
     31-ago-2026: "siempre semanalmente debe mostrar el calendario"). */
  const vista: VistaAgenda = sp.vista === 'dia' || sp.vista === 'mes' ? sp.vista : 'semana'

  /* El rango por defecto se deriva de la fecha en LIMA, no del reloj UTC del
     server — si no, en la noche del último día del mes/semana la vista
     aterriza en el rango equivocado (mismo bug ya corregido en /grabaciones). */
  const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const [hoyY, hoyM] = hoyLima.split('-').map(Number)
  /* El querystring se valida — una URL compartida truncada o con typo
     ("2026-8-31") produciría Invalid Date y rompería el render. */
  const esYmd = (s?: string): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T12:00:00Z'))
  let desde: string
  let hasta: string
  if (esYmd(sp.desde) && esYmd(sp.hasta)) {
    desde = sp.desde
    hasta = sp.hasta
  } else if (vista === 'dia') {
    desde = hoyLima
    hasta = hoyLima
  } else if (vista === 'semana') {
    const dowHoy = new Date(hoyLima + 'T12:00:00Z').getUTCDay()
    desde = addDias(hoyLima, -(dowHoy === 0 ? 6 : dowHoy - 1))  // lunes de esta semana
    hasta = addDias(desde, 6)
  } else {
    desde = `${hoyY}-${String(hoyM).padStart(2, '0')}-01`
    hasta = new Date(Date.UTC(hoyY, hoyM, 0)).toISOString().slice(0, 10)
  }

  /* Etiqueta del rango para el header, según la vista. */
  const monthDate = new Date(desde + 'T12:00:00Z')
  const fmtCorto = (ymd: string) =>
    new Date(ymd + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })
  const rangoLabel =
    vista === 'dia'
      ? new Date(desde + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' })
      : vista === 'semana'
        ? `semana del ${fmtCorto(desde)} al ${fmtCorto(hasta)}`
        : `${MESES[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Solo directores ven el asistente agendador (la action igual valida server-side). */
  const permisos = await getCurrentMemberPermisos()
  const esDirector = !permisos || permisos.member.rol_base === 'director' || permisos.member.rol_base === 'admin'

  /* Todo en paralelo — incluida la lectura del Google Calendar de Pedro
     (solo directores; devuelve [] sola si no está conectado). */
  const [grabRes, marcasRes, gcalStatus, gcalEvents] = await Promise.all([
    listGrabaciones(desde, hasta),
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_calendario'),
    getGoogleCalendarStatus(),
    esDirector ? listCalendarEvents(desde, hasta) : Promise.resolve([]),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasById = new Map<string, any>(((marcasRes.data ?? []) as any[]).map((m) => [m.id as string, m]))

  /* Reuniones del mes (rango sobre timestamptz, en horario Lima). Defensivo:
     si la tabla/columna no existe todavía, la vista sigue sin reuniones. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reunionesRows: any[] = []
  try {
    let r = await service
      .from('marca_reuniones')
      .select('id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado')
      .gte('fecha_hora', `${desde}T00:00:00-05:00`)
      .lte('fecha_hora', `${hasta}T23:59:59-05:00`)
      .order('fecha_hora', { ascending: true })
    if (r.error && /estado/i.test(r.error.message ?? '')) {
      r = await service
        .from('marca_reuniones')
        .select('id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas')
        .gte('fecha_hora', `${desde}T00:00:00-05:00`)
        .lte('fecha_hora', `${hasta}T23:59:59-05:00`)
        .order('fecha_hora', { ascending: true })
    }
    if (!r.error) reunionesRows = r.data ?? []
  } catch { /* sin reuniones */ }

  /* ===== Unificar todo en AgendaEvento[] ===== */
  /* Miembros con acceso restringido a ciertas marcas solo ven los eventos de
     SUS marcas (mismo criterio que el sidebar). marcasAcceso null = todas. */
  const marcasPermitidas = permisos?.marcasAcceso ? new Set(permisos.marcasAcceso) : null
  const eventos: AgendaEvento[] = []
  const grabRows = (grabRes.ok ? grabRes.rows : []).filter((g) => !marcasPermitidas || marcasPermitidas.has(g.marca_id))
  reunionesRows = reunionesRows.filter((r) => !marcasPermitidas || marcasPermitidas.has(r.marca_id))
  const idsDeLaApp = new Set(grabRows.map((g) => g.google_event_id).filter(Boolean) as string[])
  /* Dedup robusto de reuniones vs GCal: link de Meet (sobrevive a renombres
     en Google) y clave fecha|hora. Un evento 📌 SIN fila espejo en
     marca_reuniones (insert fallido) NO se salta — se muestra como evento
     de Google en vez de desaparecer del calendario. */
  const meetsDeReuniones = new Set(reunionesRows.map((r) => r.lugar_enlace).filter(Boolean) as string[])
  const clavesReuniones = new Set(reunionesRows.map((r) => {
    const { ymd, hm } = tsALima(r.fecha_hora)
    return `${ymd}|${hm}`
  }))

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
    })
  }

  /* GCal externo: saltar lo que la app misma creó (grabaciones por event_id;
     reuniones por el prefijo 📌 con el que la app titula sus eventos). */
  for (const ev of gcalEvents) {
    if (idsDeLaApp.has(ev.id)) continue
    if (ev.meetLink && meetsDeReuniones.has(ev.meetLink)) continue
    if (ev.summary.startsWith('🎬')) continue
    if (ev.summary.startsWith('📌') && clavesReuniones.has(`${ev.fecha}|${ev.hora}`)) continue
    eventos.push({
      id: ev.id,
      tipo: 'gcal',
      fecha: ev.fecha,
      hora: ev.hora,
      titulo: ev.summary,
      marcaSlug: null,
      marcaNombre: null,
      marcaEmoji: null,
      color: '#3b82f6',
      estado: null,
      meetLink: ev.meetLink,
      videosGrabados: null,
      notas: null,
    })
  }

  /* Marcas para filtro + leyenda: solo las presentes en el mes. */
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

  const nGrab = eventos.filter((e) => e.tipo === 'grabacion').length
  const nReu = eventos.filter((e) => e.tipo === 'reunion').length

  return (
    <main className="container mx-auto p-6 max-w-7xl space-y-4">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">📅 Grabaciones y Reuniones</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {rangoLabel} · {nGrab} grabaciones · {nReu} reuniones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GoogleCalendarConnect connected={gcalStatus.connected} email={gcalStatus.email} />
          <RangoNav vista={vista} desde={desde} />
        </div>
      </header>

      {/* TABS */}
      <nav className="flex items-center gap-1 border-b border-border">
        <Link
          href="/grabaciones/calendario"
          className="px-3 py-2 text-sm font-medium border-b-2 border-primary text-foreground"
        >
          📅 Calendario
        </Link>
        <Link
          href="/grabaciones"
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground"
        >
          📋 Por marca
        </Link>
      </nav>

      {/* ASISTENTE AGENDADOR (solo directores) — "agéndame una reunión a las
          3:30 con Vid Natur" → detecta correos de la marca y Google manda la
          invitación + recordatorio. */}
      {esDirector && <AgendarReunionBox />}

      {grabRes.ok === false && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠️ {grabRes.error}
        </div>
      )}

      {/* CALENDARIO UNIFICADO — key remonta el componente al cambiar de rango
          o vista: si no, el filtro de marca y el día seleccionado anteriores
          quedan pegados y pueden dejar la grilla vacía en silencio. */}
      <AgendaCalendar key={`${vista}-${desde}`} vista={vista} desde={desde} eventos={eventos} marcas={marcasMes} hoy={hoyLima} />

      <p className="text-xs text-muted-foreground text-center">
        💡 Toca un día para ver su detalle. Las grabaciones se editan en la vista{' '}
        <Link href="/grabaciones" className="underline">Por marca</Link>.
      </p>
    </main>
  )
}
