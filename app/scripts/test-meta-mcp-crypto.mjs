import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {encrypt,decrypt,nonce,sha256,equalState} from '../lib/meta-mcp/crypto.ts'
process.env.META_MCP_ENCRYPTION_KEY=randomBytes(32).toString('base64')
const secret='test-token-never-real',sealed=encrypt(secret,'brand:one')
assert.equal(decrypt(sealed,'brand:one'),secret)
assert(!sealed.includes(secret))
assert.notEqual(sealed,encrypt(secret,'brand:one'))
assert.throws(()=>decrypt(sealed,'brand:two'),'A token cannot move to a different brand')
const parts=sealed.split('.'),cipher=Buffer.from(parts[3],'base64url');cipher[0]^=1;parts[3]=cipher.toString('base64url')
assert.throws(()=>decrypt(parts.join('.'),'brand:one'),'Tampered ciphertext must fail')
process.env.META_MCP_ENCRYPTION_KEY=randomBytes(32).toString('base64')
assert.throws(()=>decrypt(sealed,'brand:one'),'A different key must fail')
const state=nonce();assert(equalState(state,state));assert(!equalState(state,nonce()));assert(!equalState('',''));assert(!equalState(state,state+'x'))
// RFC 7636, Appendix B: standard interoperable S256 challenge.
assert.equal(sha256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
console.log('PASS encrypted credentials, brand binding, tamper rejection, state comparison and RFC 7636 PKCE')
