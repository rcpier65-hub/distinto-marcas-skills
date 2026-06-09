// Bootstrap Pieer + Ailyn para la reunión de inducción.
// Crea cuentas en auth.users con bcrypt SQL nativo (pgcrypto), sin
// depender del Supabase Auth SDK (las env vars de Vercel CLI vienen
// vacías en pull con esta cuenta — bug conocido).
import pg from 'pg'
import { randomFillSync } from 'crypto'

const APP_URL = 'https://distinto-app.vercel.app'

function genPass() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const arr = new Uint8Array(12)
  randomFillSync(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

async function ensureAuthUser(email, password) {
  const ex = await c.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email])
  if (ex.rows[0]) {
    await c.query(
      `UPDATE auth.users
       SET encrypted_password = crypt($1, gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
       WHERE id = $2`,
      [password, ex.rows[0].id]
    )
    return { id: ex.rows[0].id, existed: true }
  }
  const r = await c.query(
    `INSERT INTO auth.users (
       id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, is_sso_user, is_anonymous
     ) VALUES (
       gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated',
       $1, crypt($2, gen_salt('bf')),
       now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
       now(), now(), false, false
     ) RETURNING id`,
    [email, password]
  )
  return { id: r.rows[0].id, existed: false }
}

// ===== PIEER (Editor + override grilla) =====
console.log('=== PIEER (Editor + acceso a grilla) ===')
const pieerPass = genPass()
const pieerQ = await c.query(
  "SELECT id, email, auth_user_id FROM team_members WHERE LOWER(nombre)='pieer' OR email='pieer@agenciadistinto.com' LIMIT 1"
)
if (!pieerQ.rows[0]) { console.error('Pieer no existe en team_members'); process.exit(1) }
const pieer = pieerQ.rows[0]
const pieerAuth = await ensureAuthUser(pieer.email, pieerPass)
console.log(`  auth.users.id: ${pieerAuth.id} (${pieerAuth.existed ? 'existía, password actualizada' : 'creado nuevo'})`)

await c.query(
  `UPDATE team_members
   SET auth_user_id = $1,
       password_inicial = $2,
       permisos_override = jsonb_build_object('grilla', jsonb_build_object('acceso', true))
   WHERE id = $3`,
  [pieerAuth.id, pieerPass, pieer.id]
)
console.log('  team_members: auth_user_id + password_inicial + override de grilla aplicado')

// ===== AILYN (Diseñadora) =====
console.log('')
console.log('=== AILYN (Diseñadora) ===')
const ailynEmail = 'ailyn@agenciadistinto.com'
const ailynPass = genPass()

const aex = await c.query(
  'SELECT id, email, auth_user_id FROM team_members WHERE LOWER(email) = LOWER($1) LIMIT 1',
  [ailynEmail]
)
let ailynMember
if (aex.rows[0]) {
  ailynMember = aex.rows[0]
  console.log(`  team_member ya existía: ${ailynMember.id}`)
} else {
  const r = await c.query(
    `INSERT INTO team_members (nombre, email, rol_base, cargo_personalizado, marcas_acceso, activo, permisos_override)
     VALUES ('Ailyn', $1, 'disenador', 'Diseñadora', null, true, '{}'::jsonb)
     RETURNING id, email`,
    [ailynEmail]
  )
  ailynMember = r.rows[0]
  console.log(`  team_member nueva creada: ${ailynMember.id}`)
}

const ailynAuth = await ensureAuthUser(ailynEmail, ailynPass)
console.log(`  auth.users.id: ${ailynAuth.id} (${ailynAuth.existed ? 'existía, password actualizada' : 'creado nuevo'})`)

await c.query(
  'UPDATE team_members SET auth_user_id = $1, password_inicial = $2 WHERE id = $3',
  [ailynAuth.id, ailynPass, ailynMember.id]
)
console.log('  team_members: auth_user_id + password_inicial guardado (rol disenador, sin overrides)')

// ===== Mensajes para WhatsApp =====
const sep = '═'.repeat(64)
console.log('')
console.log(sep)
console.log(' MENSAJES LISTOS — COPIA Y PEGA EN WHATSAPP')
console.log(sep)
console.log('')
console.log('───── PIEER ─────')
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
console.log('───── AILYN ─────')
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

await c.end()
