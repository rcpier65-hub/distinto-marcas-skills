import assert from 'node:assert/strict'
import { parseAgenda } from '../lib/reuniones/parse-agenda'

async function main() {
  const originalKey = process.env.OPENAI_API_KEY
  const originalFetch = globalThis.fetch
  const marcas = [{ slug: 'manrique', nombre: 'Manrique' }]
  const now = new Date('2026-09-22T15:00:00Z')
  try {
    delete process.env.OPENAI_API_KEY
    const cases: [string, string | null][] = [
      ['jueves 01 de octubre grabacion manrique 10am', '2026-10-01'],
      ['manrique 1 octubre 10am', '2026-10-01'],
      ['manrique 01/10 10am', '2026-10-01'],
      ['manrique 2026-10-01 10am', '2026-10-01'],
      ['jueves 01 de octubre de 2027 manrique 10am', '2027-10-01'],
      ['manrique 5 de enero 10am', '2027-01-05'],
      ['manrique 22 de setiembre 10am', '2026-09-22'],
      ['jueves manrique 10am', '2026-09-24'],
      ['mañana manrique 10am', '2026-09-23'],
      ['pasado mañana manrique 10am', '2026-09-24'],
      ['jueves 31 de septiembre manrique 10am', null],
      ['jueves 29 de febrero de 2027 manrique 10am', null],
      ['manrique 29 de febrero de 2028 10am', '2028-02-29'],
    ]
    for (const [text, expected] of cases) {
      const parsed = await parseAgenda(text, marcas, now)
      assert.equal(parsed.fecha, expected, text)
      assert.equal(parsed.hora, '10:00', text)
      assert.equal(parsed.marcaSlug, 'manrique', text)
    }
    assert.equal((await parseAgenda('hoy manrique 10am', marcas, new Date('2026-10-01T02:00:00Z'))).fecha, '2026-09-30', 'Reference day uses Lima, not UTC')
    process.env.OPENAI_API_KEY = 'mock-test-key'
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({
      marcaSlug: 'manrique', fecha: '2026-09-24', hora: '10:00', durationMin: 60, titulo: 'Grabación Manrique',
    }) } }] })
    const withAI = await parseAgenda(cases[0][0], marcas, now)
    assert.equal(withAI.fecha, '2026-10-01', 'Explicit month overrides even a complete AI response')
    assert.equal(withAI.titulo, 'Grabación Manrique')
    assert.equal(withAI.durationMin, 60)
    assert.equal((await parseAgenda('jueves 31 de septiembre manrique 10am', marcas, now)).fecha, null)
    globalThis.fetch = async () => new Response('unavailable', { status: 503 })
    assert.equal((await parseAgenda(cases[0][0], marcas, now)).fecha, '2026-10-01', 'Explicit date survives provider failure')
    console.log('PASS: explicit dates, month/year boundaries, invalid dates, Lima timezone, relative dates, AI conflict and provider failure. No events created.')
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
