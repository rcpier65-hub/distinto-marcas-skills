import assert from 'node:assert/strict'
import { generateSlots, validDate, limaDate } from '../lib/reservas/slots.ts'
import { bookingHtml } from '../lib/reservas/widget.ts'
import { Script } from 'node:vm'
const config = {enabled:true,duration_min:60,notice_hours:24,horizon_days:45,start_hour:9,end_hour:18,weekdays:[1,2,3,4,5],calendar_id:'primary'}
const now = Date.parse('2026-09-13T14:00:00Z')
assert.equal(validDate('2026-02-30'),false)
assert.equal(validDate('2026-99-01'),false)
assert.equal(limaDate(new Date('2026-09-14T02:00:00Z')),'2026-09-13')
assert.equal(generateSlots('2026-09-13',config,[],now).length,0)
assert.equal(generateSlots('2026-09-14',{...config,enabled:false},[],now).length,0)
const busy=[{start:'2026-09-14T15:00:00Z',end:'2026-09-14T16:00:00Z'}]
const slots=generateSlots('2026-09-14',config,busy,now)
assert(slots.includes('2026-09-14T14:00:00.000Z')) // adjacent is allowed
assert(!slots.includes('2026-09-14T14:30:00.000Z')) // overlap
assert(!slots.includes('2026-09-14T15:30:00.000Z'))
assert(slots.includes('2026-09-14T16:00:00.000Z'))
assert.equal(generateSlots('2026-09-14',config,[{start:'2026-09-14T00:00:00-05:00',end:'2026-09-15T00:00:00-05:00'}],now).length,0)
assert.equal(generateSlots('2026-12-14',config,[],now).length,0)
new Script(bookingHtml.match(/<script>([\s\S]*?)<\/script>/)[1])
console.log('OK: fechas inválidas, Lima, días cerrados, pausa, anticipación, solapamientos, horizonte y sintaxis del widget.')
