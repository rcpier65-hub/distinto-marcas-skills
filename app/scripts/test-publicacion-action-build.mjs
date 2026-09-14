import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

// Regression for production digest 2488802915: a type-only re-export was
// registered as a runtime Server Action even though TypeScript/build passed.
const root = path.resolve('.next/server')
let chunks = 0
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) await check(file)
    else if (entry.name.endsWith('.js')) {
      chunks++
      const source = await readFile(file, 'utf8')
      assert.ok(!/\bUpdatePublicacionInput\b/.test(source), `Type leaked into server runtime: ${file}`)
    }
  }
}
await check(root)
assert.ok(chunks > 0, 'Run npm run build before this regression check')
console.log(`PASS: ${chunks} compiled server files contain no runtime reference to UpdatePublicacionInput`)
