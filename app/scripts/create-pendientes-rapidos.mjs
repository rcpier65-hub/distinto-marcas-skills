// Crea la tabla pendientes_rapidos para el chat-tipo-ChatGPT de la home.
// Pedro: cada miembro tiene un mini-asistente donde escribe tareas en
// lenguaje natural, la IA las parsea y categoriza, y aparecen agrupadas
// en su dashboard.

import pg from 'pg'

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

await c.query(`
  CREATE TABLE IF NOT EXISTS pendientes_rapidos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id  uuid REFERENCES team_members(id) ON DELETE CASCADE,
    texto_original  text NOT NULL,
    titulo          text NOT NULL,
    descripcion     text,
    categoria       text NOT NULL DEFAULT 'Otro',
    prioridad       smallint NOT NULL DEFAULT 2,
    completado      boolean NOT NULL DEFAULT false,
    completado_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )
`)
console.log('  ✓ tabla pendientes_rapidos lista')

await c.query(`
  CREATE INDEX IF NOT EXISTS ix_pendientes_member
  ON pendientes_rapidos(team_member_id, completado, created_at DESC)
`)
console.log('  ✓ index ix_pendientes_member')

await c.query(`
  CREATE INDEX IF NOT EXISTS ix_pendientes_admin
  ON pendientes_rapidos(team_member_id NULLS FIRST, completado, created_at DESC)
  WHERE team_member_id IS NULL
`)
console.log('  ✓ index parcial para admin/owner (team_member_id IS NULL)')

/* Trigger para actualizar updated_at automáticamente */
await c.query(`
  CREATE OR REPLACE FUNCTION update_pendientes_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`)
await c.query(`
  DROP TRIGGER IF EXISTS trg_pendientes_updated_at ON pendientes_rapidos
`)
await c.query(`
  CREATE TRIGGER trg_pendientes_updated_at
  BEFORE UPDATE ON pendientes_rapidos
  FOR EACH ROW EXECUTE FUNCTION update_pendientes_updated_at()
`)
console.log('  ✓ trigger updated_at')

/* Agregar a supabase_realtime para live updates entre tabs del mismo user */
try {
  await c.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.pendientes_rapidos`)
  console.log('  ✓ tabla añadida a supabase_realtime')
} catch (e) {
  if (e.message.includes('already member')) console.log('  = ya estaba en supabase_realtime')
  else throw e
}

/* Validar */
const r = await c.query(`SELECT COUNT(*) FROM pendientes_rapidos`)
console.log(`\nTabla operativa: ${r.rows[0].count} filas`)

await c.end()
