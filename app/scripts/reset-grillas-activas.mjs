// Reset: borra todas las grillas activas (no enviadas ni canceladas)
// del mes de mayo 2026 para forzar regeneración fresh desde el sistema.
import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

console.log('🗑️  Borrando grillas activas (esperando_aprobacion / procesando / pendiente)...')

const del = await c.query(`
  DELETE FROM grillas_pendientes
  WHERE estado IN ('pendiente', 'procesando', 'esperando_aprobacion')
    AND semana_inicio >= '2026-05-01'
  RETURNING id, marca_id, estado
`)

console.log(`✅ Borradas ${del.rows.length} grillas:`)
for (const r of del.rows) {
  console.log(`   • ${r.id.slice(0, 8)} (marca=${r.marca_id.slice(0, 8)}, estado=${r.estado})`)
}

console.log('\n💡 Ahora podés hacer "Pedir grilla" desde el dashboard y se regenera con las plantillas nuevas.')

await c.end()
