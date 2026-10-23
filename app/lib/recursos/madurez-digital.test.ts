import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnoseMaturity, maturityQuestions } from './madurez-digital.ts'

test('un negocio sin procesos recibe nivel desconectado y tres prioridades', () => {
  const answers = Object.fromEntries(maturityQuestions.map((question) => [question.id, 0]))
  const result = diagnoseMaturity(answers, 'eficiencia')
  assert.equal(result.score, 0)
  assert.equal(result.level, 'Desconectado')
  assert.equal(result.priorities.length, 3)
  assert.equal(result.roadmap.length, 3)
  assert.equal(result.roadmap[0].period, '0–30 días')
})

test('un perfil integrado conserva el puntaje por dimensión', () => {
  const answers = Object.fromEntries(maturityQuestions.map((question) => [question.id, 2]))
  const result = diagnoseMaturity(answers, 'ventas')
  assert.equal(result.score, 50)
  assert.equal(result.level, 'Integrado')
  assert.ok(result.dimensions.every((dimension) => dimension.score === 50))
})

test('la meta comercial desempata prioridades equivalentes', () => {
  const answers = Object.fromEntries(maturityQuestions.map((question) => [question.id, 1]))
  const result = diagnoseMaturity(answers, 'ventas')
  assert.match(result.priorities[0].title, /fugas/i)
})
