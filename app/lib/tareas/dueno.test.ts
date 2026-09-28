import assert from 'node:assert/strict'
import test from 'node:test'
import { esDirectorDeAgenda, esDuenoDelTablero } from './dueno.ts'

test('dueño del tablero: sin fila o el miembro Pedro', () => {
  assert.equal(esDuenoDelTablero(true, null), true)
  assert.equal(esDuenoDelTablero(false, 'Pedro'), true)
  assert.equal(esDuenoDelTablero(false, ' pedro '), true)
  assert.equal(esDuenoDelTablero(false, 'Erick'), false)
})

test('director de agenda: sin fila, director o admin', () => {
  assert.equal(esDirectorDeAgenda(true, null), true)
  assert.equal(esDirectorDeAgenda(false, 'director'), true)
  assert.equal(esDirectorDeAgenda(false, 'admin'), true)
  assert.equal(esDirectorDeAgenda(false, 'editor'), false)
})
