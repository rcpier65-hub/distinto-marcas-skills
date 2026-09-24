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
//   3. Google Calendar de la agencia (lectura) — lo agendado FUERA de la app
//      (dedup: se saltan los eventos que la propia app creó)
//
// La escritura hacia Google la hace lib/calendario/gcal-sync.ts (automática).

import Link from 'next/link'
import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo, getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { createServiceClient } from '@/lib/supabase/service'
import { getGoogleCalendarStatus, listCalendarEvents } from '@/lib/integrations/google-calendar'
import { listGrabaciones } from '../_actions'
import { GoogleCalendarConnect } from '../_components/gcal-connect'
import { AgendarReunionBox } from '@/app/inicio/_components/agendar-reunion-box'
import { AgendaCalendar, type AgendaEvento } from './_components/agenda-calendar'
import { COOKIE_FILTROS_CAL, leerFiltrosCalendario } from './_components/filtros'
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

/* Marca de un evento de Google por su título: la que tenga más palabras de
   su nombre/slug (de 4+ letras) presentes. Misma idea que sugerirMarca del
   calendario (VincularGcal). */
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

export default async function GrabacionesCalendarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  await ensureAccesoModulo('publicaciones')
  const sp = await searchParams

  /* Filtros del calendario guardados (chips + marca): se mantienen al cambiar
     de semana/mes y al volver a entrar. Pedro 24-sep-2026. */
  const filtrosGuardados = leerFiltrosCalendario((await cookies()).get(COOKIE_FILTROS_CAL)?.value)

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

  /* Todo en paralelo — incluida la lectura del Google Calendar de la agencia.
     Todo el equipo ve lo agendado directo en Google (Pedro 24-sep-2026; antes
     solo directores). Devuelve [] sola si no está conectado. */
  const [grabRes, marcasRes, gcalStatus, gcalEvents] = await Promise.all([
    listGrabaciones(desde, hasta),
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_calendario'),
    getGoogleCalendarStatus(),
    listCalendarEvents(desde, hasta),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasById = new Map<string, any>(((marcasRes.data ?? []) as any[]).map((m) => [m.id as string, m]))

  /* Reuniones del mes (rango sobre timestamptz, en horario Lima). Defensivo:
     si la tabla/columna no existe todavía, la vista sigue sin reuniones. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reunionesRows: any[] = []
  try {
    const COLS = ['id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado, google_event_id',
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
      if (!/estado|google_event_id|schema cache|42703/i.test(r.error.message ?? '')) break
    }
  } catch { /* sin reuniones */ }

  /* Las tareas de diseño NO salen acá por sí solas — Pedro 31-ago-2026: "el
     calendario es solo para grabaciones y reuniones, no para una tarea sin
     día ni hora". Una tarea entra al calendario únicamente cuando se le
     agenda su reunión de revisión (aparece como 🤝 vía marca_reuniones). */

  /* PUBLICACIONES sincronizadas con Google Calendar (gcal_pub_event_id) —
     filtro 📣 propio, prendible/apagable (Pedro 31-ago-2026). Ventana fija
     de publicación 6–8 pm. */
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

  /* ===== Unificar todo en AgendaEvento[] ===== */
  /* Miembros con acceso restringido a ciertas marcas solo ven los eventos de
     SUS marcas (mismo criterio que el sidebar). marcasAcceso null = todas. */
  const marcasPermitidas = permisos?.marcasAcceso ? new Set(permisos.marcasAcceso) : null
  const eventos: AgendaEvento[] = []
  const grabRows = (grabRes.ok ? grabRes.rows : []).filter((g) => !marcasPermitidas || marcasPermitidas.has(g.marca_id))
  reunionesRows = reunionesRows.filter((r) => !marcasPermitidas || marcasPermitidas.has(r.marca_id))
  pubsRows = pubsRows.filter((p) => !marcasPermitidas || marcasPermitidas.has(p.marca_id))
  const idsDeLaApp = new Set([
    ...grabRows.map((g) => g.google_event_id),
    ...reunionesRows.map((r) => r.google_event_id),
    ...pubsRows.map((p) => p.gcal_pub_event_id),
  ].filter(Boolean) as string[])
  /* Dedup robusto de reuniones vs GCal: link de Meet (sobrevive a renombres
     en Google) y clave fecha|hora. Un evento 📌 SIN fila espejo en
     marca_reuniones (insert fallido) NO se salta — se muestra como evento
     de Google en vez de desaparecer del calendario. */
  const meetsDeReuniones = new Set(reunionesRows.map((r) => r.lugar_enlace).filter(Boolean) as string[])
  const clavesReuniones = new Set(reunionesRows.map((r) => {
    const { ymd, hm } = tsALima(r.fecha_hora)
    return `${ymd}|${hm}`
  }))
  /* Dedup extra por título+fecha: cubre reuniones VINCULADAS en modo
     degradado (sin google_event_id guardado) — el evento GCal no tiene 📌
     ni Meet, pero comparte título y día con la reunión del sistema. */
  const normTitulo = (s: string) => s.replace(/^[📌🎬🎥🤝]\s*/u, '').trim().toLowerCase()
  const titulosReuniones = new Set(reunionesRows.map((r) => {
    const { ymd } = tsALima(r.fecha_hora)
    return `${ymd}|${normTitulo(String(r.titulo ?? ''))}`
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
      duracionMin: g.duracion_min ?? null,
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

  /* FECHAS IMPORTANTES — chip ⭐ APAGADO por defecto (salen como sugerencia
     solo si se prende). Pedro 31-ago-2026: el módulo dejó el menú y vive
     aquí; se gestionan en /fechas-importantes. */
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

  /* GCal externo: saltar lo que la app misma creó (grabaciones por event_id;
     reuniones por el prefijo 📌 con el que la app titula sus eventos). */
  for (const ev of gcalEvents) {
    if (idsDeLaApp.has(ev.id)) continue
    if (ev.meetLink && meetsDeReuniones.has(ev.meetLink)) continue
    if (ev.summary.startsWith('🎬')) continue
    if (ev.summary.startsWith('📣')) continue
    if (ev.summary.startsWith('⭐')) continue  // fechas importantes (lib/calendario/gcal-sync)
    if (ev.summary.startsWith('📌') && clavesReuniones.has(`${ev.fecha}|${ev.hora}`)) continue
    if (titulosReuniones.has(`${ev.fecha}|${normTitulo(ev.summary)}`)) continue
    /* Grabaciones y reuniones agendadas DIRECTO en Google (ej. "GRABACION
       LOZANO") se muestran como grabación/reunión, con la marca adivinada por
       el título — Pedro 24-sep-2026: "tiene grabación el viernes y no sale
       como grabaciones". Siguen siendo de Google: se pueden Vincular. */
    const tipoGoogle = /grabaci|grabar|rodaje/i.test(ev.summary) ? 'grabacion' as const
      : /reuni|revisi/i.test(ev.summary) ? 'reunion' as const
      : 'gcal' as const
    const marcaG = tipoGoogle !== 'gcal' ? marcaPorTitulo(ev.summary, [...marcasById.values()]) : null
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
      color: marcaG?.color_calendario ?? (tipoGoogle === 'grabacion' ? '#6366F1' : '#3b82f6'),
      estado: null,
      meetLink: ev.meetLink,
      videosGrabados: null,
      notas: tipoGoogle !== 'gcal' ? 'Agendado en Google Calendar' : null,
      duracionMin: ev.durationMin,
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
          <h1 className="text-3xl font-bold mb-1">📅 Calendario</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {rangoLabel} · {nGrab} grabaciones · {nReu} reuniones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {esDirector && <Link href="/grabaciones/calendario/reservas" className="text-sm font-medium text-purple-700">Reservas de la web ↗</Link>}
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
      <AgendaCalendar
        key={`${vista}-${desde}`}
        vista={vista}
        desde={desde}
        eventos={eventos}
        marcas={marcasMes}
        hoy={hoyLima}
        esDirector={esDirector}
        filtrosIniciales={filtrosGuardados}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marcasTodas={((marcasRes.data ?? []) as any[]).map((m) => ({ id: m.id as string, slug: m.slug as string, nombre: m.nombre as string, emoji: (m.emoji_marca ?? null) as string | null }))}
      />

      <p className="text-xs text-muted-foreground text-center">
        💡 Toca un día para ver su detalle. Las grabaciones se editan en la vista{' '}
        <Link href="/grabaciones" className="underline">Por marca</Link>.
      </p>
    </main>
  )
}
