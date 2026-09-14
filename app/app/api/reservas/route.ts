import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { db, settings, rateLimit, checkSlot, daySlots, syncBooking, BookingError, type Booking } from '@/lib/reservas/server'
import { limaDate } from '@/lib/reservas/slots'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin')
    if (origin !== req.nextUrl.origin && origin !== 'https://distinto-app.vercel.app') throw new BookingError('Origen no permitido.', 403)
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new BookingError('Formato inválido.', 400)
    const text = await req.text()
    if (text.length > 8000) throw new BookingError('Solicitud demasiado extensa.', 413)
    let input
    try { input = JSON.parse(text) } catch { throw new BookingError('Solicitud inválida.', 400) }
    const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
    const nombre = clean(input.nombre, 120), email = clean(input.email, 254).toLowerCase()
    const empresa = clean(input.empresa, 160), motivo = clean(input.motivo, 1500)
    const start = clean(input.start, 40), id = clean(input.id, 36)
    if (input.website || !input.consent || nombre.length < 2 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id) || !Number.isFinite(Date.parse(start))) throw new BookingError('Revisa tu nombre, correo y horario.', 400)
    const config = await settings()
    if (!config.enabled) throw new BookingError('Las reservas están pausadas.', 409)
    const hash = createHash('sha256').update(JSON.stringify({ nombre, email, empresa, motivo, start })).digest('hex')
    const service = db()
    const { data: existing, error: readError } = await service.from('web_bookings').select('*').eq('id', id).maybeSingle()
    if (readError) throw new BookingError('No pudimos verificar tu reserva.')
    const ip = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'local'
    await rateLimit('book-attempt:' + ip, 30, 3600)
    if (existing) {
      if (existing.request_hash !== hash) throw new BookingError('Esta solicitud ya tiene otros datos. Vuelve a seleccionar el horario.', 409)
      if (existing.status === 'cancelled') throw new BookingError('Este horario ya no está reservado. Selecciona otro.', 409)
      return NextResponse.json(await syncBooking(existing as Booking), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (!checkSlot(clean(input.token, 500), start, config.duration_min)) throw new BookingError('Actualiza los horarios para continuar.', 409)
    await rateLimit('book-new:' + ip, 5, 3600)
    await rateLimit('book-email:' + email, 3, 86400)
    const date = limaDate(new Date(start))
    if (!(await daySlots(date, config)).includes(start)) throw new BookingError('Ese horario acaba de ocuparse. Elige otro disponible.', 409)
    const row = { id, request_hash: hash, nombre, email, empresa, motivo, starts_at: start,
      ends_at: new Date(Date.parse(start) + config.duration_min * 60000).toISOString(),
      status: 'pending', google_event_id: 'db' + id.replaceAll('-', ''), calendar_id: config.calendar_id, meet_link: null }
    const { error } = await service.from('web_bookings').insert(row)
    if (error) {
      if (error.code === '23P01') throw new BookingError('Otra persona reservó ese horario. Selecciona otro.', 409)
      if (error.code === '23505') throw new BookingError('La reserva se está procesando. Confirma nuevamente sin cambiar tus datos.', 202)
      throw new BookingError('No pudimos guardar tu reserva. Intenta más tarde.')
    }
    // Re-check after the DB claim, before creating the external event.
    if (!(await daySlots(date, config, id)).includes(start)) {
      await service.from('web_bookings').update({ status: 'cancelled' }).eq('id', id)
      throw new BookingError('Ese horario acaba de ocuparse. Selecciona otro.', 409)
    }
    return NextResponse.json(await syncBooking(row), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof BookingError ? e.message : 'No pudimos completar la confirmación. Intenta de nuevo con los mismos datos.' }, { status: e instanceof BookingError ? e.status : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
