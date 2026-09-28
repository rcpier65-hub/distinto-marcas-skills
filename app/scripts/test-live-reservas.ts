// Explicit controlled integration test. No attendees, no email invitations.
// Creates one temporary event and DB row, verifies idempotence/Meet, cleans up both.
import { randomUUID } from 'node:crypto'
import { db, settings, daySlots, syncBooking, google } from '../lib/reservas/server'
import { limaDate } from '../lib/reservas/slots'
async function main() {
  const config = await settings()
  let slot: string | undefined
  for (let i = 2; i <= 8 && !slot; i++) slot = (await daySlots(limaDate(new Date(Date.now() + i * 86400000)), config))[0]
  if (!slot) throw Error('No slot available for controlled test')
  const id = randomUUID()
  const row = { id, request_hash: 'controlled-test', nombre: 'PRUEBA TEMPORAL DISTINTO — SIN INVITADOS', email: 'test@example.invalid', empresa: 'PRUEBA TEMPORAL', motivo: 'Verificación técnica; se elimina al terminar', starts_at: slot, ends_at: new Date(Date.parse(slot) + config.duration_min * 60000).toISOString(), status: 'pending', google_event_id: 'db' + id.replaceAll('-', ''), calendar_id: config.calendar_id, meet_link: null }
  const inserted = await db().from('web_bookings').insert(row)
  if (inserted.error) throw Error('Test insert failed: ' + inserted.error.code)
  try {
    const first = await syncBooking(row, { sendInvitations: false })
    const second = await syncBooking(row, { sendInvitations: false })
    if (first.id !== second.id) throw Error('Duplicate reservation')
    const response = await google(`/calendars/${encodeURIComponent(row.calendar_id)}/events/${row.google_event_id}`)
    const event = await response.json()
    if (!response.ok || event.attendees?.length) throw Error('Unexpected event or attendees')
    if (!first.meetLink && !second.meetLink && !event.hangoutLink) throw Error('Meet was not generated yet')
    console.log('PASS: Supabase persistence, Google event, Google Meet and idempotent retry. No attendees or invitations.')
  } finally {
    const removed = await google(`/calendars/${encodeURIComponent(row.calendar_id)}/events/${row.google_event_id}?sendUpdates=none`, { method: 'DELETE' })
    if (!removed.ok && ![404,410].includes(removed.status)) throw Error('Test event cleanup requires attention')
    const deleted = await db().from('web_bookings').delete().eq('id',id)
    if (deleted.error) throw Error('Test DB cleanup requires attention')
    console.log('CLEAN: temporary test event and reservation removed.')
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1 })
