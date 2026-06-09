// Re-seed de hábitos por rol.
//
// Cuando hice el backfill inicial cloné los hábitos del admin (default
// genéricos, parecidos a Community Manager) a TODOS los miembros. Pedro
// pidió que cada uno tenga rutinas específicas de su área.
//
// Esta migración:
//   1) Borra los hábitos NO completados (sin historial) de cada miembro
//      cuyo rol esté en el mapa
//   2) Inserta los nuevos hábitos del rol
//   3) Hábitos que el miembro ya empezó a usar (con completados) se
//      preservan archivados (activo=false) para no perder su data
//
// Para los miembros que YA tienen hábitos personalizados creados por
// ellos mismos (no parte del seed), también se conservan.
//
// El admin/owner (team_member_id=null) NO se toca — son los originales
// de Pedro.

import pg from 'pg'

const HABITOS_POR_ROL = {
  community_manager: [
    { nombre: 'Responder comentarios',          icono: '💬', color: '#22c55e', dias_activos: [1,2,3,4,5,6,7], orden: 10 },
    { nombre: 'Revisar tendencias',             icono: '📈', color: '#06b6d4', dias_activos: [1,2,3,4,5],     orden: 20 },
    { nombre: 'Publicar historias',             icono: '📸', color: '#f59e0b', dias_activos: [1,2,3,4,5,6,7], orden: 30 },
    { nombre: 'Informar al grupo',              icono: '📢', color: '#8b5cf6', dias_activos: [1,2,3,4,5],     orden: 40 },
  ],
  disenador: [
    { nombre: 'Revisar inspiración del día',    icono: '🎨', color: '#ec4899', dias_activos: [1,2,3,4,5],     orden: 10 },
    { nombre: 'Avance de portadas asignadas',   icono: '🖼️', color: '#f59e0b', dias_activos: [1,2,3,4,5],     orden: 20 },
    { nombre: 'Organizar archivos del día',     icono: '📁', color: '#06b6d4', dias_activos: [1,2,3,4,5],     orden: 30 },
    { nombre: 'Reportar avances al equipo',     icono: '📢', color: '#8b5cf6', dias_activos: [1,2,3,4,5],     orden: 40 },
  ],
  editor: [
    { nombre: 'Revisar tareas asignadas',       icono: '📋', color: '#22c55e', dias_activos: [1,2,3,4,5],     orden: 10 },
    { nombre: 'Avance de videos del día',       icono: '✂️', color: '#8b5cf6', dias_activos: [1,2,3,4,5],     orden: 20 },
    { nombre: 'Backup de proyectos',            icono: '💾', color: '#06b6d4', dias_activos: [1,2,3,4,5],     orden: 30 },
    { nombre: 'Reportar avances al equipo',     icono: '📢', color: '#f59e0b', dias_activos: [1,2,3,4,5],     orden: 40 },
  ],
  social_media_manager: [
    { nombre: 'Revisar grilla del día',         icono: '📅', color: '#7170ff', dias_activos: [1,2,3,4,5],     orden: 10 },
    { nombre: 'Revisar métricas semanales',     icono: '📊', color: '#06b6d4', dias_activos: [1],              orden: 20 },
    { nombre: 'Coordinar con equipos',          icono: '🤝', color: '#22c55e', dias_activos: [1,2,3,4,5],     orden: 30 },
    { nombre: 'Reporte ejecutivo',              icono: '📈', color: '#f59e0b', dias_activos: [5],              orden: 40 },
  ],
  director: [
    { nombre: 'Revisar cockpit del día',        icono: '🎯', color: '#7170ff', dias_activos: [1,2,3,4,5],     orden: 10 },
    { nombre: 'Revisar finanzas',               icono: '💰', color: '#22c55e', dias_activos: [1, 5],           orden: 20 },
    { nombre: 'Sync con cada área',             icono: '🤝', color: '#06b6d4', dias_activos: [1,2,3,4,5],     orden: 30 },
    { nombre: 'Estrategia semanal',             icono: '🧠', color: '#f59e0b', dias_activos: [1],              orden: 40 },
  ],
}

const c = new pg.Client({
  connectionString: 'postgresql://postgres.exhmimlehdisonjvedvx:NPdqIeqAujTFuv1D@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
await c.connect()

const { rows: miembros } = await c.query(
  `SELECT id, nombre, rol_base FROM team_members WHERE activo = true ORDER BY nombre`
)

console.log(`Re-seed para ${miembros.length} miembros activos:\n`)

for (const m of miembros) {
  const set = HABITOS_POR_ROL[m.rol_base]
  if (!set) {
    console.log(`  ⊘ ${m.nombre} (${m.rol_base}): rol sin set definido, skip`)
    continue
  }

  /* Obtener hábitos actuales del miembro */
  const { rows: actuales } = await c.query(
    `SELECT h.id, h.nombre, h.activo,
            (SELECT COUNT(*) FROM habitos_completados hc WHERE hc.habito_id = h.id) as completados
     FROM habitos h
     WHERE h.team_member_id = $1`,
    [m.id]
  )

  const nombresNuevos = new Set(set.map((s) => s.nombre.toLowerCase()))
  /* Hábitos a borrar: activos, SIN historial, y NO están en el nuevo set */
  const aBorrar = actuales.filter(
    (h) => h.activo && Number(h.completados) === 0 && !nombresNuevos.has(h.nombre.toLowerCase())
  )
  /* Hábitos a archivar: tienen historial pero no están en el nuevo set */
  const aArchivar = actuales.filter(
    (h) => h.activo && Number(h.completados) > 0 && !nombresNuevos.has(h.nombre.toLowerCase())
  )
  /* Hábitos del nuevo set que ya existen (por nombre) */
  const yaExisten = new Set(
    actuales.filter((h) => h.activo).map((h) => h.nombre.toLowerCase())
  )

  /* Ejecutar borrados */
  for (const h of aBorrar) {
    await c.query(`DELETE FROM habitos WHERE id = $1`, [h.id])
  }
  /* Ejecutar archivos (preserva historial) */
  for (const h of aArchivar) {
    await c.query(`UPDATE habitos SET activo = false WHERE id = $1`, [h.id])
  }
  /* Insertar los del set que no existían */
  let creados = 0
  for (const s of set) {
    if (yaExisten.has(s.nombre.toLowerCase())) continue
    await c.query(
      `INSERT INTO habitos (nombre, icono, color, dias_activos, orden, activo, team_member_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)`,
      [s.nombre, s.icono, s.color, s.dias_activos, s.orden, m.id]
    )
    creados++
  }

  console.log(
    `  ✓ ${m.nombre.padEnd(12)} (${m.rol_base.padEnd(20)}) ` +
    `borrados=${aBorrar.length} archivados=${aArchivar.length} nuevos=${creados}`
  )
}

/* Resumen final */
console.log('\nEstado final por miembro:')
const final = await c.query(
  `SELECT tm.nombre, tm.rol_base, COUNT(h.id) FILTER (WHERE h.activo) as activos,
          COUNT(h.id) FILTER (WHERE NOT h.activo) as archivados
   FROM team_members tm
   LEFT JOIN habitos h ON h.team_member_id = tm.id
   WHERE tm.activo = true
   GROUP BY tm.nombre, tm.rol_base
   ORDER BY tm.nombre`
)
console.table(final.rows)

await c.end()
