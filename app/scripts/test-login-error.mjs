import assert from 'node:assert/strict'
import { loginErrorMessage } from '../lib/auth/login-error.ts'

const restricted = 'Service for this project is restricted due to the following violations: exceed_egress_quota. The project owner must upgrade their plan or remove spend caps to restore service.'
for (const error of [{ status: 402 }, { message: restricted }, { status: 402, code: 'invalid_credentials' }]) {
  assert.match(loginErrorMessage(error), /restringido/)
  assert.doesNotMatch(loginErrorMessage(error), /incorrectos/)
}
for (const error of [{ code: 'invalid_credentials', status: 400 }, { message: 'Invalid login credentials' }]) {
  assert.equal(loginErrorMessage(error), 'Email o contraseña incorrectos')
}
for (const error of [{ status: 429 }, { code: 'over_request_rate_limit' }]) {
  assert.match(loginErrorMessage(error), /Espera unos minutos/)
}
assert.match(loginErrorMessage({ code: 'email_not_confirmed' }), /confirmar el correo/)
for (const error of [new TypeError('fetch failed'), { status: 503 }, { status: 400, message: 'Other error' }, null]) {
  assert.match(loginErrorMessage(error), /servicio de acceso/)
  assert.doesNotMatch(loginErrorMessage(error), /incorrectos/)
}
assert.doesNotMatch(loginErrorMessage(new Error('private-token-or-account-detail')), /private-token-or-account-detail/)
console.log('PASS login: restriction, credentials, rate limit, network failures and safe messages')
