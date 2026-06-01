import { clasificarComentario } from '../lib/comentarios/clasificador.ts'

const TESTS = [
  // 7 reales de Distri Fitness
  { texto: 'Nunca responden el wsp me interesa la Citrulina en polvo', esperado: 'queja' },
  { texto: 'Escribo al wsp y nuncio', esperado: 'queja' },
  { texto: '😂😂😂😂', esperado: 'humor' },
  { texto: 'Jajaaajajaj ganó mi Gloglo con glow up 😂🥹', esperado: 'humor' },
  { texto: 'Jajajajd te queremos Alfredito, pero ganó Jesucito', esperado: 'humor' },
  { texto: 'Yo voto por mi Javier Miley tiernito🤪🤪🤪', esperado: 'humor' },
  { texto: 'Se nos juntaron los tops de los tops', esperado: 'testimonial' },
  // Casos extra para verificar que pregunta_info sigue funcionando
  { texto: 'Hola dónde lo venden', esperado: 'pregunta_info' },
  { texto: 'Precio?', esperado: 'pregunta_info' },
  { texto: 'Dirección', esperado: 'pregunta_info' },
  { texto: 'buenas noches aun tiene citas disponibles', esperado: 'pregunta_info' },
  { texto: 'Hola precio?', esperado: 'pregunta_info' },
  // Reacción pura (no risa)
  { texto: '💪💪', esperado: 'reaccion' },
  { texto: '🔥', esperado: 'reaccion' },
]

let ok = 0, fail = 0
for (const { texto, esperado } of TESTS) {
  const actual = clasificarComentario(texto)
  const status = actual === esperado ? '✅' : '❌'
  if (actual === esperado) ok++; else fail++
  console.log(`${status} ${esperado.padEnd(15)} → ${actual.padEnd(15)} | ${texto.slice(0, 60)}`)
}
console.log(`\n${ok}/${TESTS.length} OK`)
process.exit(fail > 0 ? 1 : 0)
