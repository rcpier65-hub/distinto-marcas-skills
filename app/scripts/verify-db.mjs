// Verificar estado actual de la BD después de las migraciones
import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx',
  password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()

  // 1. Listar tablas creadas
  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `)
  console.log('📊 Tablas creadas:')
  tables.rows.forEach(r => console.log('  -', r.tablename))

  // 2. Listar enums
  const enums = await client.query(`
    SELECT typname FROM pg_type WHERE typtype = 'e' AND typname NOT LIKE 'pg_%'
    ORDER BY typname;
  `)
  console.log('\n📋 Enums creados:')
  enums.rows.forEach(r => console.log('  -', r.typname))

  // 3. Marcas seedadas
  const marcas = await client.query(`
    SELECT slug, nombre, emoji_marca, activa FROM marcas ORDER BY slug;
  `)
  console.log('\n🏢 Marcas en BD:', marcas.rowCount)
  marcas.rows.forEach(m => console.log(`  ${m.emoji_marca || '  '} ${m.slug.padEnd(25)} → ${m.nombre} (activa: ${m.activa})`))

  // 4. Storage bucket
  const bucket = await client.query(`SELECT id, name, public FROM storage.buckets WHERE id = 'grillas-png';`)
  console.log('\n📦 Storage bucket:', bucket.rowCount > 0 ? `✅ ${bucket.rows[0].id}` : '❌ NO existe')

  // 5. RLS activo
  const rls = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public' AND tablename IN ('marcas','grillas_pendientes','aprobaciones','envios')
    ORDER BY tablename;
  `)
  console.log('\n🔒 RLS:')
  rls.rows.forEach(r => console.log(`  ${r.rowsecurity ? '✅' : '❌'} ${r.tablename}`))

  await client.end()
  console.log('\n✅ Verificación completa')
} catch (e) {
  console.error('❌ Error:', e.message)
  process.exit(1)
}
