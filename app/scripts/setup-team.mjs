// Script de bootstrap del equipo para la reunión de inducción
// Configura Pieer (Editor + grilla) y crea Ailyn (Diseñadora)
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { randomFillSync } from 'crypto'

const SUPA_URL = process.env.SUPA_URL
const SUPA_KEY = process.env.SUPA_KEY
const APP_URL = 'https://distinto-app.vercel.app'

function genPass() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const arr = new Uint8Array(12)
  randomFillSync(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

async function ensureAccount(supa, pgc, member, password, nombreUserMeta) {
  let authId = member.auth_user_id
  if (!authId) {
    const r = await supa.auth.admin.createUser({
      email: member.email,
      password,
      email_confirm: true,
      user_metadata: { nombre: nombreUserMeta, team_member_id: member.id }
    })
    if (r.error) {
      const { data: list } = await supa.auth.admin.listUsers()
      const existing = list.users.find(u => u.email && u.email.toLowerCase() === member.email.toLowerCase())
      if (existing) {
        authId = existing.id
        await supa.auth.admin.updateUserById(existing.id, { password })
        console.log(`  ${member.email}: ya existía en Auth, password actualizada`)
      } else {
        throw new Error('Auth error: ' + r.error.message)
      }
    } else {
      authId = r.data.user.id
      console.log(`  ${member.email}: cuenta nueva creada (${authId})`)
    }
  } else {
    await supa.auth.admin.updateUserById(authId, { password })
    console.log(`  ${member.email}: password actualizada`)
  }
  return authId
}

const supa = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const pgc = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await pgc.connect()

// ===== PIEER (Editor + override grilla) =====
console.log('=== PIEER (Editor) ===')
const pieerPass = genPass()
const { rows: pieerRows } = await pgc.query(
  "SELECT id, email, auth_user_id FROM team_members WHERE LOWER(nombre)='pieer' OR email='pieer@agenciadistinto.com' LIMIT 1"
)
if (!pieerRows[0]) throw new Error('Pieer no encontrado')
const pieer = pieerRows[0]

const pieerAuthId = await ensureAccount(supa, pgc, pieer, pieerPass, 'PIEER')

await pgc.query(
  `UPDATE team_members
   SET auth_user_id = $1,
       password_inicial = $2,
       permisos_override = jsonb_build_object('grilla', jsonb_build_object('acceso', true))
   WHERE id = $3`,
  [pieerAuthId, pieerPass, pieer.id]
)
console.log('  override de grilla aplicado + password_inicial guardada')

// ===== AILYN (Diseñadora) =====
console.log('')
console.log('=== AILYN (Diseñadora) ===')
const ailynEmail = 'ailyn@agenciadistinto.com'
const ailynPass = genPass()

const { rows: ailynRows } = await pgc.query(
  'SELECT id, email, auth_user_id FROM team_members WHERE email = $1',
  [ailynEmail]
)

let ailyn
if (ailynRows[0]) {
  ailyn = ailynRows[0]
  console.log(`  miembro ya existía: ${ailyn.id}`)
} else {
  const ins = await pgc.query(
    `INSERT INTO team_members (nombre, email, rol_base, cargo_personalizado, marcas_acceso, activo, permisos_override)
     VALUES ('Ailyn', $1, 'disenador', 'Diseñadora', null, true, '{}'::jsonb)
     RETURNING id, email, auth_user_id`,
    [ailynEmail]
  )
  ailyn = ins.rows[0]
  console.log(`  team_member nueva creada: ${ailyn.id}`)
}

const ailynAuthId = await ensureAccount(supa, pgc, ailyn, ailynPass, 'Ailyn')

await pgc.query(
  'UPDATE team_members SET auth_user_id = $1, password_inicial = $2 WHERE id = $3',
  [ailynAuthId, ailynPass, ailyn.id]
)
console.log('  password_inicial guardada (rol disenador, sin overrides)')

// ===== Mensajes para WhatsApp =====
console.log('')
console.log('==================================================================')
console.log(' MENSAJES LISTOS PARA WHATSAPP')
console.log('==================================================================')
console.log('')
console.log('────────  PIEER  ────────')
console.log('')
console.log('¡Hola Pieer! 👋')
console.log('')
console.log('Bienvenido a tu nueva casa de trabajo en Distinto Agencia. 🎉')
console.log('Acabo de crear tu acceso al sistema, te dejo los datos abajo:')
console.log('')
console.log('🔗 Entra aquí:')
console.log(APP_URL + '/login')
console.log('')
console.log('📧 Email:')
console.log(pieer.email)
console.log('')
console.log('🔑 Contraseña:')
console.log(pieerPass)
console.log('')
console.log('Cuando entres puedes cambiarla por una tuya. Cualquier cosa, escríbeme por aquí.')
console.log('')
console.log('— Pedro')
console.log('')
console.log('────────  AILYN  ────────')
console.log('')
console.log('¡Hola Ailyn! 👋')
console.log('')
console.log('Bienvenida a tu nueva casa de trabajo en Distinto Agencia. 🎉')
console.log('Acabo de crear tu acceso al sistema, te dejo los datos abajo:')
console.log('')
console.log('🔗 Entra aquí:')
console.log(APP_URL + '/login')
console.log('')
console.log('📧 Email:')
console.log(ailynEmail)
console.log('')
console.log('🔑 Contraseña:')
console.log(ailynPass)
console.log('')
console.log('Cuando entres puedes cambiarla por una tuya. Cualquier cosa, escríbeme por aquí.')
console.log('')
console.log('— Pedro')
console.log('')

await pgc.end()
