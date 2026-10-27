import assert from 'node:assert/strict'
import { getTheme, THEMES } from '../lib/grilla/themes.ts'
import { buildCaptionDefault } from '../lib/grilla/build-caption.ts'

const brand = { nombre: 'Lamparas San Borja', color_primario_hex: '#111827' }
const theme = getTheme('lamparas-san-borja', brand)
assert.equal(theme.brandBig, brand.nombre)
assert.equal(theme.style, 'brand-neutral')
assert.equal(theme.accent, brand.color_primario_hex)
assert.equal(theme.tagline, '')
assert.doesNotMatch(JSON.stringify(theme), /MANRIQUE|PSICOLÓGICO|Novalamps/)
assert.equal(getTheme('nueva-marca', { nombre: 'Nueva marca', color_primario_hex: 'red;}' }).accent, '#111827')
assert.equal(getTheme('constructor').style, 'brand-neutral')
for (const [slug, current] of Object.entries(THEMES)) {
  assert.equal(getTheme(slug, brand), current, `${slug}: conservar su plantilla existente`)
}

const caption = (inicio, fin) => buildCaptionDefault({
  marca: { ...brand, decisor_tratamiento: null, decisor_nombre: null, emoji_marca: null, tono_voz: null },
  semana_inicio: inicio, semana_fin: fin, publicaciones: [],
})
assert.match(caption('2026-10-26', '2026-11-01'), /26 de octubre al 1 de noviembre/i)
assert.match(caption('2026-10-19', '2026-10-25'), /19 al 25 de octubre/i)
assert.match(caption('2026-12-28', '2027-01-03'), /28 de diciembre de 2026 al 3 de enero de 2027/i)
console.log('PASS identidad de Lámparas/nuevas marcas, plantillas anteriores y semanas entre meses/años')
