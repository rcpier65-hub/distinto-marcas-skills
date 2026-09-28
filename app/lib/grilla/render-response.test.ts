import assert from 'node:assert/strict'
import test from 'node:test'
import { leerGrillaHTML, leerGrillaPNG, solicitarGrillaPNG } from './render-response.ts'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFZkAAAAASUVORK5CYII=', 'base64')
const imageResponse = () => new Response(png, { headers: { 'content-type': 'image/png' } })

test('acepta PNG real sin alterar sus bytes', async () => {
  assert.deepEqual(Buffer.from(await leerGrillaPNG(imageResponse())), png)
})

test('rechaza Inicio, incluso etiquetado como imagen, y no expone HTML en el mensaje', async () => {
  for (const contentType of ['text/html; charset=utf-8', 'image/png', 'image/jpeg']) {
    await assert.rejects(
      leerGrillaPNG(new Response('<!DOCTYPE html><title>Inicio</title>', { headers: { 'content-type': contentType } })),
      error => error instanceof Error && !error.message.includes('<') && /imagen|PNG/.test(error.message),
    )
  }
  await assert.rejects(leerGrillaPNG(new Response(png.subarray(0, 16), { headers: { 'content-type': 'image/png' } })), /incompleta/)
})

test('explica sesiones vencidas y errores del servidor sin copiar sus cuerpos', async () => {
  await assert.rejects(leerGrillaPNG(new Response('privado', { status: 401 })), /sesión venció/)
  await assert.rejects(leerGrillaPNG(new Response('privado', { status: 504 })), /tardó demasiado/)
  await assert.rejects(leerGrillaPNG(new Response('privado', { status: 500 })), /Reintenta/)
  const redirected = imageResponse()
  Object.defineProperty(redirected, 'redirected', { value: true })
  await assert.rejects(leerGrillaPNG(redirected), /redirigida/)
})

test('la vista previa exige la marca del endpoint, nunca acepta el HTML de Inicio', async () => {
  await assert.rejects(leerGrillaHTML(new Response('<title>Inicio</title>', { headers: { 'content-type': 'text/html' } })), /vista previa/)
  const html = '<title>Grilla kintu</title>'
  assert.equal(await leerGrillaHTML(new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-distinto-grilla': '1' } })), html)
})

test('la descarga evita caché y redirecciones conservando la autenticación', async t => {
  const calls: RequestInit[] = []
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    calls.push(options)
    return imageResponse()
  })
  await solicitarGrillaPNG('/api/render-grilla', { credentials: 'same-origin' })
  assert.equal(calls[0].cache, 'no-store')
  assert.equal(calls[0].redirect, 'error')
  assert.equal(calls[0].credentials, 'same-origin')
})

test('fallos de red dejan una indicación recuperable', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(solicitarGrillaPNG('/api/render-grilla'), /Revisa tu conexión/)
})
