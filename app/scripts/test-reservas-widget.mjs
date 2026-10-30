import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { bookingHtml } from '../lib/reservas/widget.ts'
import { allowedBookingOrigin } from '../lib/reservas/origin.ts'

const publicOrigin = 'https://app.distintostudio.com'
assert(allowedBookingOrigin(publicOrigin, 'http://localhost:3000', true))
for (const origin of [null, 'null', 'https://evil.example', publicOrigin + '.evil.example',
  'http://app.distintostudio.com', 'https://distinto-app.vercel.app', 'http://localhost:3000']) {
  assert.equal(allowedBookingOrigin(origin, 'http://localhost:3000', true), false)
}
assert(allowedBookingOrigin('http://localhost:3125', 'http://localhost:3125', false))

// Execute the shipped widget with a small DOM fixture, fixed clock and controlled
// availability. These reproduce empty month boundaries without booking anything.
async function widget(now, response) {
  const NativeDate = Date
  class Clock extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return Date.parse(now) }
  }
  const element = () => ({ hidden: false, disabled: false, children: [], attributes: {},
    replaceChildren(...children) { this.children = children },
    append(child) { this.children.push(child) },
    setAttribute(key, value) { this.attributes[key] = value }, focus() {} })
  const elements = new Map()
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id) }
  get('form').elements = { nombre: element() }
  const calls = []
  const context = { Date: Clock, Intl, console, crypto: { randomUUID: () => 'test-request' },
    document: { getElementById: get, createElement: element, createTextNode: text => ({ textContent: text }),
      documentElement: { scrollHeight: 800 }, body: {}, addEventListener() {}, hidden: false },
    parent: { postMessage() {} }, ResizeObserver: class { observe() {} }, setInterval() {},
    fetch: async url => {
      const month = new URL(url, publicOrigin).searchParams.get('desde')
      calls.push(month)
      assert(calls.length <= 8, 'Search must stop at the booking horizon')
      const json = response(month)
      return { ok: !json.error, json: async () => json }
    } }
  runInNewContext(bookingHtml.match(/<script>([\s\S]*?)<\/script>/)[1], context)
  const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate) }
  await flush()
  return { get, calls, flush }
}
const availability = (date, enabled = true) => ({ enabled, duration: 60, horizon: 45,
  days: date ? [{ date, slots: [{ start: date + 'T14:00:00.000Z', token: 'fixture' }] }] : [] })

const october = await widget('2026-10-30T15:00:00Z', month => availability(month === '2026-11-01' ? '2026-11-02' : null))
assert.deepEqual(october.calls, ['2026-10-01', '2026-11-01'])
assert.match(october.get('month').textContent, /noviembre/)
october.get('times').children[0].onclick()
assert.equal(october.get('continue').disabled, false)
october.get('continue').onclick()
assert.equal(october.get('details').hidden, false)
assert.match(october.get('summary').textContent, /noviembre/)
october.get('prev').onclick(); await october.flush()
assert.match(october.get('month').textContent, /octubre/)
assert.equal(october.get('continue').disabled, true)
october.get('times').children.find(e => e.textContent === 'Buscar próximo horario →').onclick()
await october.flush()
assert.match(october.get('month').textContent, /noviembre/)

const year = await widget('2026-12-31T15:00:00Z', month => availability(month === '2027-01-01' ? '2027-01-04' : null))
assert.deepEqual(year.calls, ['2026-12-01', '2027-01-01'])
const available = await widget('2026-10-01T15:00:00Z', () => availability('2026-10-05'))
assert.equal(available.calls.length, 1)
const full = await widget('2026-10-30T15:00:00Z', () => availability(null))
assert.deepEqual(full.calls, ['2026-10-01', '2026-11-01', '2026-12-01'])
assert.equal(full.get('next').disabled, true)
assert.equal(full.get('continue').disabled, true)
const paused = await widget('2026-10-30T15:00:00Z', () => availability(null, false))
assert.equal(paused.calls.length, 1)
assert.equal(paused.get('next').disabled, true)
assert.equal(paused.get('error').hidden, false)
const failure = await widget('2026-10-30T15:00:00Z', () => ({ error: 'Agenda temporalmente inaccesible' }))
assert.equal(failure.calls.length, 1)
assert.equal(failure.get('calendar').hidden, true)
assert.equal(failure.get('continue').disabled, true)
console.log('PASS: VPS origin, rejected foreign origins, month/year boundaries, selection, manual navigation, horizon, pause and API failures.')
