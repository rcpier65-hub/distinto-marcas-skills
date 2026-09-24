// app/lib/calendario/gcal-sync.ts
//
// Sincronizador automático Calendario → Google Calendar.
// Pedro 24-sep-2026: "el calendario debe sincronizar todos los eventos con
// google calendar" — del mes actual en adelante + todo lo que se agende.
//
// Qué cubre (lo que antes NO se sincronizaba solo):
//   - 📣 Publicaciones (antes: solo con el botón manual por marca, y sin
//     actualizar cambios ni borrar)
//   - ⭐ Fechas importantes (antes: nunca)
//   - 📌 Reuniones sin evento en Google (las de Admin → Clientes)
// Grabaciones y reuniones del asistente ya se sincronizan en sus actions.
//
// Cómo: compara cada fila con lo último que se escribió en Google (tabla
// gcal_sync, columna `firma`) y solo llama a Google para lo que cambió.
// Corre (1) después de cualquier página del equipo, con un mínimo de 2 min
// entre corridas, (2) al instante tras crear/borrar fechas o reuniones, y
// (3) en el cron diario como red de seguridad. Un solo proceso a la vez
// (gcal_sync_tomar_turno).
//
// Invitados: NO se invita a clientes, salvo marcas que ya lo tenían activado
// con el botón (marcas.sync_pubs_gcal) y solo para fechas de hoy en adelante —
// así la sincronización masiva no le manda decenas de correos a nadie.

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createCalendarEvent, createTimedEvent, deleteCalendarEvent,
  getGoogleCalendarStatus, updateCalendarEvent, updateTimedCalendarEvent,
} from '@/lib/integrations/google-calendar'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

const TZ = 'America/Lima'
/* Publicaciones: ventana fija 6–8 pm (igual que lib/publicaciones/gcal-sync). */
const HORA_PUB = '18:00'
const DURACION_PUB_MIN = 120
const PUB_COLOR_ID = '7'     // azul "peacock"
const FECHA_COLOR_ID = '5'   // amarillo "banana"
const REUNION_DURACION_MIN = 45
/* Tope de llamadas a Google por corrida: el backfill inicial (~230 eventos)
   se completa en varias corridas sin pasarse del tiempo de la función. */
const MAX_ESCRITURAS = 60
const INTERVALO_MIN_SEG = 120

export type ResultadoSync = {
  ok: boolean
  motivo?: string
  creados: number
  actualizados: number
  borrados: number
  fallidos: number
  pendientes: boolean
  errores: string[]
}

function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}
/* Primer día del mes actual en Lima: desde ahí se sincroniza. */
function inicioMesLima(): string {
  return `${hoyLima().slice(0, 7)}-01`
}
function tsALima(iso: string): { ymd: string; hm: string } {
  const d = new Date(iso)
  return {
    ymd: new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d),
    hm: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
  }
}
function es404(error: string): boolean {
  return /404|not found/i.test(error)
}

function descripcionPub(p: { estado?: string | null; plataformas?: string[] | null; copy?: string | null; guion?: string | null }): string {
  const partes: string[] = []
  if (p.plataformas?.length) partes.push(`Redes: ${p.plataformas.join(', ')}`)
  if (p.estado) partes.push(`Estado: ${p.estado}`)
  const detalle = (p.copy?.trim() || p.guion?.trim() || '').slice(0, 400)
  if (detalle) partes.push(`\n${detalle}`)
  partes.push('\n— Publicación programada · Agencia Distinto (ventana 6–8 pm)')
  return partes.join('\n')
}

/**
 * Corre una sincronización completa si toca. `forzar` ignora el intervalo
 * mínimo (se usa justo después de crear/borrar algo), pero nunca corre dos
 * a la vez.
 */
export async function sincronizarCalendario(opts: { forzar?: boolean } = {}): Promise<ResultadoSync> {
  const r: ResultadoSync = { ok: true, creados: 0, actualizados: 0, borrados: 0, fallidos: 0, pendientes: false, errores: [] }
  const service = createServiceClient() as Service

  const { data: turno, error: turnoErr } = await service.rpc('gcal_sync_tomar_turno', {
    intervalo_min_seg: opts.forzar ? 0 : INTERVALO_MIN_SEG,
  })
  if (turnoErr) return { ...r, ok: false, motivo: `turno: ${turnoErr.message}` }
  if (!turno) return { ...r, ok: true, motivo: 'no_toca' }

  try {
    const status = await getGoogleCalendarStatus()
    if (!status.connected) return { ...r, ok: false, motivo: 'google_no_conectado' }

    const desde = inicioMesLima()
    const hoy = hoyLima()
    let escrituras = 0
    const puedeEscribir = () => {
      if (escrituras >= MAX_ESCRITURAS) { r.pendientes = true; return false }
      escrituras++
      return true
    }
    const fallo = (que: string, error: string) => {
      r.fallidos++
      if (r.errores.length < 10) r.errores.push(`${que}: ${error}`)
    }

    const { data: marcas } = await service.from('marcas').select('id, nombre, correos_clientes, sync_pubs_gcal')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marcaPorId = new Map<string, any>(((marcas ?? []) as any[]).map((m) => [m.id, m]))

    const { data: mapeo } = await service.from('gcal_sync').select('tipo, ref_id, event_id, firma')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapa = new Map<string, any>(((mapeo ?? []) as any[]).map((m) => [`${m.tipo}:${m.ref_id}`, m]))

    const guardar = async (tipo: 'publicacion' | 'fecha', refId: string, eventId: string | null, firma: string | null, error: string | null) => {
      await service.from('gcal_sync').upsert(
        { tipo, ref_id: refId, event_id: eventId, firma, error, synced_at: new Date().toISOString() },
        { onConflict: 'tipo,ref_id' },
      )
    }

    /* ---------------- 📣 PUBLICACIONES ---------------- */
    const { data: pubs, error: pubsErr } = await service
      .from('publicaciones')
      .select('id, nombre, marca_id, estado, fecha_publicacion, plataformas, copy, guion, gcal_pub_event_id, archived_at')
      .gte('fecha_publicacion', desde)
      .is('archived_at', null)
      .order('fecha_publicacion', { ascending: true })
      .limit(1000)
    if (pubsErr) fallo('publicaciones', pubsErr.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pubsVivas = (pubs ?? []) as any[]
    const idsPubsVivas = new Set(pubsVivas.map((p) => p.id as string))

    for (const p of pubsVivas) {
      const marca = marcaPorId.get(p.marca_id)
      const summary = `📣 ${p.nombre ?? 'Publicación'}${marca ? ` · ${marca.nombre}` : ''}`
      const firma = `${p.fecha_publicacion}|${summary}|${p.estado ?? ''}`
      const previo = mapa.get(`publicacion:${p.id}`)
      const eventId: string | null = previo?.event_id ?? p.gcal_pub_event_id ?? null
      if (eventId && previo?.firma === firma) continue
      if (!puedeEscribir()) break

      const evento = {
        summary, description: descripcionPub(p),
        fecha: p.fecha_publicacion as string, hora: HORA_PUB, durationMin: DURACION_PUB_MIN, colorId: PUB_COLOR_ID,
      }
      const crear = async () => {
        const invitar = marca?.sync_pubs_gcal === true && p.fecha_publicacion >= hoy
        const correos = invitar
          ? ((marca.correos_clientes ?? []) as string[]).map((c) => String(c).trim().toLowerCase()).filter((c) => /@.+\./.test(c))
          : []
        const c = await createTimedEvent({ ...evento, attendees: correos })
        if (!c.ok) { fallo(`📣 ${p.nombre}`, c.error); await guardar('publicacion', p.id, null, null, c.error); return }
        await service.from('publicaciones').update({ gcal_pub_event_id: c.eventId }).eq('id', p.id)
        await guardar('publicacion', p.id, c.eventId, firma, null)
        r.creados++
      }

      if (!eventId) { await crear(); continue }
      const u = await updateTimedCalendarEvent(eventId, evento)
      if (u.ok) { await guardar('publicacion', p.id, eventId, firma, null); r.actualizados++ }
      else if (es404(u.error)) await crear()  // lo borraron en Google → recrear
      else { fallo(`📣 ${p.nombre}`, u.error); await guardar('publicacion', p.id, eventId, previo?.firma ?? null, u.error) }
    }

    /* Publicaciones borradas o archivadas → borrar su evento. */
    const pubsMapeadas = [...mapa.values()].filter((m) => m.tipo === 'publicacion' && m.event_id && !idsPubsVivas.has(m.ref_id))
    if (pubsMapeadas.length) {
      const { data: aun } = await service
        .from('publicaciones').select('id, fecha_publicacion, archived_at')
        .in('id', pubsMapeadas.map((m) => m.ref_id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aunPorId = new Map<string, any>(((aun ?? []) as any[]).map((x) => [x.id, x]))
      for (const m of pubsMapeadas) {
        const fila = aunPorId.get(m.ref_id)
        /* Si solo quedó en un mes anterior, se deja en Google tal cual. */
        if (fila && !fila.archived_at) continue
        if (!puedeEscribir()) break
        const d = await deleteCalendarEvent(m.event_id)
        if (!d.ok) { fallo('📣 borrar', d.error); continue }
        await service.from('gcal_sync').delete().eq('tipo', 'publicacion').eq('ref_id', m.ref_id)
        if (fila) await service.from('publicaciones').update({ gcal_pub_event_id: null }).eq('id', m.ref_id)
        r.borrados++
      }
    }

    /* ---------------- ⭐ FECHAS IMPORTANTES ---------------- */
    const { data: fechas, error: fechasErr } = await service
      .from('fechas_importantes')
      .select('id, marca_id, titulo, fecha, nota, categoria')
      .gte('fecha', desde)
      .order('fecha', { ascending: true })
      .limit(1000)
    if (fechasErr) fallo('fechas', fechasErr.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fechasVivas = (fechas ?? []) as any[]
    const idsFechasVivas = new Set(fechasVivas.map((f) => f.id as string))

    for (const f of fechasVivas) {
      const marca = f.marca_id ? marcaPorId.get(f.marca_id) : null
      const summary = `⭐ ${f.titulo ?? 'Fecha importante'}${marca ? ` · ${marca.nombre}` : ''}`
      const description = [f.categoria, f.nota].filter(Boolean).join(' · ') || undefined
      const firma = `${f.fecha}|${summary}|${description ?? ''}`
      const previo = mapa.get(`fecha:${f.id}`)
      if (previo?.event_id && previo.firma === firma) continue
      if (!puedeEscribir()) break

      const evento = { summary, description, date: f.fecha as string, colorId: FECHA_COLOR_ID }
      const crear = async () => {
        const c = await createCalendarEvent(evento)
        if (!c.ok) { fallo(`⭐ ${f.titulo}`, c.error); await guardar('fecha', f.id, null, null, c.error); return }
        await guardar('fecha', f.id, c.eventId, firma, null)
        r.creados++
      }

      if (!previo?.event_id) { await crear(); continue }
      const u = await updateCalendarEvent(previo.event_id, evento)
      if (u.ok) { await guardar('fecha', f.id, previo.event_id, firma, null); r.actualizados++ }
      else if (es404(u.error)) await crear()
      else { fallo(`⭐ ${f.titulo}`, u.error); await guardar('fecha', f.id, previo.event_id, previo.firma, u.error) }
    }

    /* Fechas borradas → borrar su evento. */
    const fechasHuerfanas = [...mapa.values()].filter((m) => m.tipo === 'fecha' && m.event_id && !idsFechasVivas.has(m.ref_id))
    if (fechasHuerfanas.length) {
      const { data: aun } = await service.from('fechas_importantes').select('id').in('id', fechasHuerfanas.map((m) => m.ref_id))
      const existen = new Set(((aun ?? []) as { id: string }[]).map((x) => x.id))
      for (const m of fechasHuerfanas) {
        if (existen.has(m.ref_id)) continue  // pasó a un mes anterior: se deja
        if (!puedeEscribir()) break
        const d = await deleteCalendarEvent(m.event_id)
        if (!d.ok) { fallo('⭐ borrar', d.error); continue }
        await service.from('gcal_sync').delete().eq('tipo', 'fecha').eq('ref_id', m.ref_id)
        r.borrados++
      }
    }

    /* ---------------- 📌 REUNIONES SIN EVENTO ---------------- */
    const { data: reuniones } = await service
      .from('marca_reuniones')
      .select('id, marca_id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado')
      .is('google_event_id', null)
      .gte('fecha_hora', `${desde}T00:00:00-05:00`)
      .limit(200)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const reu of ((reuniones ?? []) as any[])) {
      if (reu.estado === 'cancelada') continue
      if (!puedeEscribir()) break
      const marca = marcaPorId.get(reu.marca_id)
      const { ymd, hm } = tsALima(reu.fecha_hora)
      const lugar = reu.lugar_enlace ? `${reu.modalidad === 'presencial' ? 'Lugar' : 'Enlace'}: ${reu.lugar_enlace}` : null
      const c = await createTimedEvent({
        summary: `📌 ${reu.titulo || `Reunión${marca ? ` con ${marca.nombre}` : ''}`}`,
        description: [lugar, reu.notas].filter(Boolean).join('\n') || undefined,
        fecha: ymd, hora: hm, durationMin: REUNION_DURACION_MIN,
      })
      if (!c.ok) { fallo(`📌 ${reu.titulo}`, c.error); continue }
      await service.from('marca_reuniones').update({ google_event_id: c.eventId }).eq('id', reu.id)
      r.creados++
    }

    return r
  } catch (e) {
    return { ...r, ok: false, motivo: e instanceof Error ? e.message : String(e) }
  } finally {
    await service.from('gcal_sync_estado').update({
      corriendo_desde: null,
      ultimo_fin: new Date().toISOString(),
      ultimo_resultado: r,
    }).eq('id', 1)
  }
}

/* Throttle en memoria por instancia: evita pedirle turno a la base en cada
   request. La base igual decide (intervalo mínimo de 2 min). */
let ultimoIntentoMs = 0
export function debeIntentarSync(): boolean {
  const ahora = Date.now()
  if (ahora - ultimoIntentoMs < 60_000) return false
  ultimoIntentoMs = ahora
  return true
}
