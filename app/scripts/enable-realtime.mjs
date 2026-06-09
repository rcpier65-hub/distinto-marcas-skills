// Habilita Supabase Realtime en las tablas core para que los cambios
// se propaguen en vivo a todos los browsers conectados.
//
// Para que un cliente reciba un evento de cambio, la tabla debe estar
// en la publication `supabase_realtime`. Esto es un ALTER PUBLICATION.

import pg from 'pg'

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

const tablas = [
  'publicaciones',       // tareas que crea Ailyn → Lorena ve en /publicaciones
  'comentarios_inbox',   // comentarios que llegan / responde Lorena
  'grabaciones',         // grabaciones pendientes por marca
  'habitos',             // si el dueño edita su lista
  'habitos_completados', // toggle de hoy → se ve en /inicio del dueño
  'team_members',        // alta/edición de miembros
  'marcas',              // alta/edición de marcas
  'notas_personales',    // si alguien guarda nota relevante
]

for (const t of tablas) {
  try {
    await c.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${t}`)
    console.log(`  + ${t} añadida`)
  } catch (e) {
    if (e.message.includes('already member')) console.log(`  = ${t} ya estaba`)
    else if (e.message.includes('does not exist')) console.log(`  ⊘ ${t} no existe (skip)`)
    else console.log(`  ✗ ${t} ERROR: ${e.message}`)
  }
}

const r = await c.query(
  `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename`
)
console.log('\nEstado final de supabase_realtime:')
for (const row of r.rows) console.log('  - ' + row.tablename)

await c.end()
