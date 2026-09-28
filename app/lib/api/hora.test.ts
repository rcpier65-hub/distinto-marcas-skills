import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizarHoraAgenda } from './hora.ts'

test('normaliza 24h y am/pm al formato de agendar', () => {
  assert.equal(normalizarHoraAgenda('11:00'), '11:00')
  assert.equal(normalizarHoraAgenda('9:05'), '09:05')
  assert.equal(normalizarHoraAgenda('10am'), '10:00')
  assert.equal(normalizarHoraAgenda('10:30 pm'), '22:30')
  assert.equal(normalizarHoraAgenda('12am'), '00:00')
  assert.equal(normalizarHoraAgenda('12pm'), '12:00')
  assert.equal(normalizarHoraAgenda('25:00'), null)
  assert.equal(normalizarHoraAgenda(''), null)
  assert.equal(normalizarHoraAgenda(11), null)
})
