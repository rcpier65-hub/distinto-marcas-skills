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
import { ArrowUpRight, CalendarDays, CalendarRange, Globe, List } from 'lucide-react'
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo, getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { cargarAgendaCalendario } from '@/lib/calendario/cargar-agenda'
import { GoogleCalendarConnect } from '../_components/gcal-connect'
import { AgendarReunionBox } from '@/app/inicio/_components/agendar-reunion-box'
import { AgendaCalendar } from './_components/agenda-calendar'
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

  /* Solo directores ven el asistente agendador (la action igual valida server-side). */
  const permisos = await getCurrentMemberPermisos()
  const esDirector = !permisos || permisos.member.rol_base === 'director' || permisos.member.rol_base === 'admin'

  /* Mismo armado que GET /api/v1/grabaciones/calendario. */
  const agenda = await cargarAgendaCalendario({
    desde,
    hasta,
    marcasAcceso: permisos?.marcasAcceso ?? null,
  })
  const eventos = agenda.eventos
  const marcasMes = agenda.marcasMes
  const gcalStatus = agenda.gcal


  const nGrab = eventos.filter((e) => e.tipo === 'grabacion').length
  const nReu = eventos.filter((e) => e.tipo === 'reunion').length

  return (
    <main className="container mx-auto p-6 max-w-7xl space-y-4">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)', boxShadow: '0 6px 16px -6px rgba(113,112,255,0.6)' }}
            >
              <CalendarDays className="w-5 h-5" strokeWidth={2.2} />
            </span>
            Calendario
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {rangoLabel} · {nGrab} grabaciones · {nReu} reuniones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {esDirector && (
            <Link
              href="/grabaciones/calendario/reservas"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Globe className="w-4 h-4 text-[#7170ff]" /> Reservas de la web <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          )}
          <GoogleCalendarConnect connected={gcalStatus.connected} email={gcalStatus.email} />
          <RangoNav vista={vista} desde={desde} />
        </div>
      </header>

      {/* TABS */}
      <nav className="flex items-center gap-1 border-b border-border">
        <Link
          href="/grabaciones/calendario"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 border-[#ba41f7] text-foreground"
        >
          <CalendarRange className="w-4 h-4" /> Calendario
        </Link>
        <Link
          href="/grabaciones"
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground"
        >
          <List className="w-4 h-4" /> Por marca
        </Link>
      </nav>

      {/* ASISTENTE AGENDADOR (solo directores) — "agéndame una reunión a las
          3:30 con Vid Natur" → detecta correos de la marca y Google manda la
          invitación + recordatorio. */}
      {esDirector && <AgendarReunionBox />}

      {agenda.grabError && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠️ {agenda.grabError}
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
        marcasTodas={agenda.marcasTodas}
      />

      <p className="text-xs text-muted-foreground text-center">
        💡 Toca un día para ver su detalle. Las grabaciones se editan en la vista{' '}
        <Link href="/grabaciones" className="underline">Por marca</Link>.
      </p>
    </main>
  )
}
