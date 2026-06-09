// Da acceso total a pedro@agenciadistinto.com — la cuenta que Pedro
// usa como CEO. Antes era team_member 'editor', cambiamos a 'director'
// con permisos_override = TODO en true para que vea exactamente lo
// mismo que su cuenta admin (rcpier65@gmail.com sin team_member).

import pg from 'pg'

const EMAIL = 'pedro@agenciadistinto.com'

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

/* Estado actual */
const before = await c.query(
  `SELECT id, nombre, rol_base, cargo_personalizado, marcas_acceso, permisos_override, activo
   FROM team_members WHERE LOWER(email) = LOWER($1)`,
  [EMAIL]
)
if (!before.rows[0]) {
  console.error('No se encontró team_member con email', EMAIL)
  process.exit(1)
}
console.log('ANTES:')
console.log(JSON.stringify(before.rows[0], null, 2))

/* Override: TODOS los módulos con acceso true + capacidades plenas.
   Estos overrides se mergean con el rol_base 'director', así si en el
   futuro cambiamos el rol_base, los overrides siguen ganando. */
const overrideTotal = {
  inbox:          { acceso: true },
  diseno:         { acceso: true },
  editor:         { acceso: true, solo_propias: false },
  equipo:         { acceso: true, puede_invitar: true, puede_resetear_passwords: true },
  grilla:         { acceso: true, puede_enviar: true },
  finanzas:       { acceso: true },
  metricas:       { acceso: true },
  settings:       { acceso: true },
  comentarios:    { acceso: true, puede_responder: true },
  publicaciones:  { acceso: true, puede_crear: true, puede_editar: true, puede_borrar: true },
  marcas:         { acceso: true },
}

const r = await c.query(
  `UPDATE team_members SET
     rol_base = 'director',
     cargo_personalizado = 'CEO · Distinto Agencia',
     marcas_acceso = NULL,  -- null = TODAS las marcas
     permisos_override = $1::jsonb,
     activo = true,
     updated_at = now()
   WHERE LOWER(email) = LOWER($2)
   RETURNING id, nombre, rol_base, cargo_personalizado, marcas_acceso, permisos_override, activo`,
  [JSON.stringify(overrideTotal), EMAIL]
)

console.log('\nDESPUÉS:')
console.log(JSON.stringify(r.rows[0], null, 2))

/* Verificar que tenga password_inicial (si no, decirle a Pedro que la
   asigne desde /equipo) */
const pw = await c.query(
  `SELECT password_inicial, auth_user_id FROM team_members WHERE LOWER(email) = LOWER($1)`,
  [EMAIL]
)
console.log('\nPassword status:')
console.log('  auth_user_id:', pw.rows[0].auth_user_id ? '✓ activado' : '✗ NO tiene cuenta Auth todavía')
console.log('  password_inicial:', pw.rows[0].password_inicial ? '✓ asignada (visible en /equipo)' : '✗ NO seteada')

await c.end()
