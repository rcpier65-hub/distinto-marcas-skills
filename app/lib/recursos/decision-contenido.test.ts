import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnoseContent, type ContentMetrics } from './decision-contenido.ts'

const base: ContentMetrics = {
  title: 'Prueba', platform: 'Instagram Reels', objective: 'leads', duration: 30, views: 1_000,
  averageWatch: 18, completion: 42, saves: 20, shares: 15, profileVisits: 30, clicks: 18,
  leads: 4, sales: 1, attempts: 1, baselineViews: 700, baselineWatch: 12, baselineCompletion: 28,
  baselineSaves: 8, baselineShares: 6, baselineClicks: 7,
}

test('recomienda repetir cuando supera su referencia y genera negocio', () => {
  const result = diagnoseContent(base)
  assert.equal(result.decision, 'repetir')
  assert.equal(result.confidence, 'alta')
  assert.ok(result.score >= 70)
})

test('corrige el empaque cuando la retención falla pero existe intención', () => {
  const result = diagnoseContent({ ...base, averageWatch: 4, completion: 8, baselineWatch: 13, baselineCompletion: 35, leads: 3, sales: 0 })
  assert.equal(result.decision, 'corregir')
  assert.match(result.nextTest, /resultado primero/i)
})

test('no descarta una idea por una sola publicación débil', () => {
  const weak = { ...base, baselineViews: undefined, baselineWatch: undefined, baselineCompletion: undefined, views: 80, averageWatch: 2, completion: 4, saves: 0, shares: 0, profileVisits: 0, clicks: 0, leads: 0, sales: 0, attempts: 1 }
  assert.notEqual(diagnoseContent(weak).decision, 'archivar')
  assert.equal(diagnoseContent({ ...weak, attempts: 3 }).decision, 'archivar')
})
