import { NextRequest, NextResponse } from 'next/server'
import { settings, busyTimes, signSlot, rateLimit, BookingError } from '@/lib/reservas/server'
import { generateSlots, limaDate, validDate } from '@/lib/reservas/slots'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('desde') || limaDate()
    if (!validDate(date) || Math.abs(Date.parse(date) - Date.now()) > 100 * 86400000) throw new BookingError('Fecha inválida.', 400)
    await rateLimit('availability:' + (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'local'), 120, 600)
    const config = await settings()
    if (!config.enabled) return NextResponse.json({ enabled: false, days: [], duration: config.duration_min }, { headers: { 'Cache-Control': 'no-store' } })
    const end = new Date(Date.parse(date + 'T12:00:00Z') + 30 * 86400000).toISOString().slice(0,10)
    const busy = await busyTimes(date + 'T00:00:00-05:00', end + 'T23:59:59-05:00', config)
    const days = Array.from({ length: 31 }, (_, index) => {
      const day = new Date(Date.parse(date + 'T12:00:00Z') + index * 86400000).toISOString().slice(0,10)
      return { date: day, slots: generateSlots(day, config, busy).map(start => ({ start, token: signSlot(start, config.duration_min) })) }
    })
    return NextResponse.json({ enabled: true, days, duration: config.duration_min, timezone: 'America/Lima', horizon: config.horizon_days, checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof BookingError ? e.message : 'No pudimos sincronizar la agenda. Intenta nuevamente.' }, { status: e instanceof BookingError ? e.status : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
