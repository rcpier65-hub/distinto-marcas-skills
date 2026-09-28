import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://distinto.example'

function serviceWorker({ offline = true, response, cachedPage } = {}) {
  const handlers = {}
  const deleted = []
  const stored = []
  let claimed = false
  const currentCache = {
    match: async request => request.url === `${origin}/grilla/kintu` ? cachedPage?.clone() : undefined,
    put: async (request, value) => stored.push({ request, value }),
  }
  vm.runInNewContext(source, {
    URL, Response,
    self: {
      location: { origin }, addEventListener: (event, handler) => { handlers[event] = handler },
      clients: { claim: async () => { claimed = true } },
    },
    caches: {
      keys: async () => ['distinto-v2-static', 'distinto-v3-static', 'another-app'],
      delete: async name => { deleted.push(name) },
      open: async () => currentCache,
      // Reproduce la caché antigua de Inicio; nunca debe usarse para una API.
      match: async request => request === '/inicio' ? new Response('<title>Inicio</title>') : undefined,
    },
    fetch: async () => {
      if (offline) throw new TypeError('Failed to fetch')
      return response.clone()
    },
  })
  return {
    deleted, stored, claimed: () => claimed,
    async activate() {
      let done
      handlers.activate({ waitUntil: promise => { done = promise } })
      await done
    },
    async request(path, overrides = {}) {
      let result
      handlers.fetch({
        request: { url: `${origin}${path}`, method: 'GET', mode: 'cors', destination: '', cache: 'default', headers: new Headers(), ...overrides },
        respondWith: promise => { result = promise },
      })
      return result
    },
  }
}

test('API de PNG y HTML nunca reciben Inicio al fallar la red', async () => {
  const sw = serviceWorker()
  for (const path of ['/api/render-grilla?slug=kintu', '/api/render-grilla-html?slug=kintu', '/api/build-id']) {
    assert.equal(await sw.request(path), undefined, path)
  }
})

test('RSC, iframes e imágenes conservan la respuesta original de la red', async () => {
  const sw = serviceWorker()
  assert.equal(await sw.request('/grilla/kintu?_rsc=123'), undefined)
  assert.equal(await sw.request('/grilla/kintu', { headers: new Headers({ rsc: '1' }) }), undefined)
  assert.equal(await sw.request('/preview', { mode: 'navigate', destination: 'iframe' }), undefined)
  assert.equal(await sw.request('/image.png', { destination: 'image' }), undefined)
  assert.equal(await sw.request('/grilla/kintu', { cache: 'no-store', mode: 'navigate', destination: 'document' }), undefined)
})

test('sin red, una página desconocida muestra error 503 en vez de Inicio', async () => {
  const response = await serviceWorker().request('/grilla/kintu', { mode: 'navigate', destination: 'document' })
  assert.equal(response.status, 503)
  assert.match(await response.text(), /Sin conexión/)
})

test('el respaldo de navegación solo sirve la misma URL', async () => {
  const sw = serviceWorker({ cachedPage: new Response('<title>Grilla kintu</title>') })
  const kintu = await sw.request('/grilla/kintu', { mode: 'navigate', destination: 'document' })
  assert.match(await kintu.text(), /Grilla kintu/)
  const other = await sw.request('/grilla/otra', { mode: 'navigate', destination: 'document' })
  assert.equal(other.status, 503)
})

test('no almacena HTML privado ni marcado no-store', async () => {
  for (const cacheControl of ['private, max-age=0', 'no-store']) {
    const response = new Response('<title>Grilla</title>', { headers: { 'content-type': 'text/html', 'cache-control': cacheControl } })
    const sw = serviceWorker({ offline: false, response })
    assert.equal((await sw.request('/grilla/kintu', { mode: 'navigate', destination: 'document' })).status, 200)
    assert.equal(sw.stored.length, 0)
  }
})

test('la actualización elimina la caché defectuosa y toma control de las ventanas', async () => {
  const sw = serviceWorker()
  await sw.activate()
  assert.deepEqual(sw.deleted, ['distinto-v2-static'])
  assert.equal(sw.claimed(), true)
})
