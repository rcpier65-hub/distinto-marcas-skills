/* Prueba del desfase de reloj (Lorena 19-oct-2026: el cronómetro saltaba ~2 min
   porque su computadora iba adelantada respecto del servidor).
   Ejecutar: npx tsx scripts/test-reloj-servidor.ts */
import assert from 'node:assert/strict'
import { estimarDesfase, segundosTranscurridos } from '../lib/tiempo/reloj'

const servidor = Date.parse('2026-10-19T16:25:00Z')
// PC adelantada 2 min: envía a las 16:27:00.000 local, recibe 200 ms después.
const d = estimarDesfase(servidor + 120_000, servidor + 120_200, 'Mon, 19 Oct 2026 16:25:00 GMT')
assert.ok(Math.abs(d - -120_000) <= 1_000, `desfase esperado ≈ -120 s, salió ${d}`)
// Reloj correcto: diferencias menores a 2 s se ignoran (el encabezado Date tiene 1 s de resolución).
assert.equal(estimarDesfase(servidor, servidor + 300, 'Mon, 19 Oct 2026 16:25:00 GMT'), 0)
// Encabezado ausente o inválido: sin corrección.
assert.equal(estimarDesfase(servidor, servidor + 300, null), 0)
assert.equal(estimarDesfase(servidor, servidor + 300, 'basura'), 0)
// Cronómetro: con la PC adelantada 2 min y el inicio guardado por el servidor,
// a los 30 s reales debe mostrar 30 s (no 2:30).
const desde = '2026-10-19T16:25:00.000Z'
const ahoraLocal = servidor + 30_000 + 120_000
assert.equal(segundosTranscurridos(desde, 1974, ahoraLocal, -120_000), 1974 + 30)
// Sin sesión corriendo: solo lo acumulado. Nunca negativo.
assert.equal(segundosTranscurridos(null, 50, ahoraLocal, 0), 50)
assert.equal(segundosTranscurridos(desde, 10, servidor - 5_000, 0), 10)
console.log('✓ reloj del servidor: 7 comprobaciones')
