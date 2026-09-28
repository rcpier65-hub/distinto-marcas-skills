import assert from 'node:assert/strict'
import test from 'node:test'
import { DEVICE_KEY_PREFIX, generateDeviceApiKey, hashDeviceApiKey, isDeviceApiKeyToken } from './device-key-token.ts'

test('dst_live_ se hashea y el plaintext no se repite', () => {
  const a = generateDeviceApiKey()
  const b = generateDeviceApiKey()
  assert.equal(isDeviceApiKeyToken(a.token), true)
  assert.equal(isDeviceApiKeyToken('eyJhbGciOiJIUzI1NiJ9.a.b'), false)
  assert.equal(a.token.startsWith(DEVICE_KEY_PREFIX), true)
  assert.equal(a.prefix.length, DEVICE_KEY_PREFIX.length + 8)
  assert.equal(a.hash, hashDeviceApiKey(a.token))
  assert.notEqual(a.token, b.token)
  assert.match(a.hash, /^[0-9a-f]{64}$/)
})
