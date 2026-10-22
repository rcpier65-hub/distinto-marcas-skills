// Run from app/. Read {slug,codigo,catalogos,reclamos} from private stdin, never arguments.
// Requires existing DB credentials and CLIENT_ACCESS_ENCRYPTION_KEY in server environment.
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import env from '@next/env'
import pg from 'pg'
import { encryptAccess, decryptAccess, hashAccessPin, verifyAccessPin } from '../lib/cliente/access-crypto.ts'
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
let db
try {
  process.stdout.write('Ready for private input.\n')
  const input = createInterface({ input: process.stdin, terminal: false })
  const line = await new Promise(resolve => input.once('line', resolve)); input.close()
  const data = JSON.parse(line)
  if (data.slug !== 'little-joe' || !/^\d{4,16}$/.test(data.codigo) || !['catalogos', 'reclamos'].every(k => typeof data[k] === 'string' && data[k].length >= 12 && data[k].length <= 256) || data.catalogos === data.reclamos) throw new Error()
  const u = new URL(process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT)
  db = new pg.Client({ user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), host: u.hostname, port: Number(u.port) || 5432, database: u.pathname.slice(1), ssl: { rejectUnauthorized: false } })
  await db.connect()
  await db.query('BEGIN')
  await db.query(await readFile('supabase/migrations/20261022180000_client_portal_access.sql', 'utf8'))
  const { rows } = await db.query('select id from marcas where slug=$1 and activa=true', [data.slug])
  if (rows.length !== 1) throw new Error()
  const brand = rows[0].id
  for (const resource of ['catalogos', 'reclamos']) {
    const ciphertext = encryptAccess(data[resource], brand, resource), hash = hashAccessPin(data.codigo)
    if (decryptAccess(ciphertext, brand, resource) !== data[resource] || !verifyAccessPin(data.codigo, hash)) throw new Error()
    await db.query(`insert into client_portal_access(marca_id,resource,ciphertext,pin_hash) values($1,$2,$3,$4)
      on conflict(marca_id,resource) do update set ciphertext=excluded.ciphertext,pin_hash=excluded.pin_hash,updated_at=now()`, [brand, resource, ciphertext, hash])
  }
  await db.query('COMMIT')
  console.log('Stored and verified: 2 encrypted resources for TypHouse. No external passwords changed.')
} catch {
  if (db) await db.query('ROLLBACK').catch(() => {})
  console.error('Provisioning failed; no private values logged.'); process.exitCode = 1
} finally { if (db) await db.end() }
