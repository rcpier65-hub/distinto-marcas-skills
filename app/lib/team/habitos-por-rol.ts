// app/lib/team/habitos-por-rol.ts
//
// Hábitos default específicos por rol. Pedro pidió que el set inicial
// de un miembro nuevo refleje su área:
//   - Diseñadora: rutinas de inspiración, archivos, portadas
//   - Editor: rutinas de videos, backup, reporte
//   - Community Manager: comentarios, historias, tendencias
//   - Social Media Manager: grilla, métricas, coordinación
//   - Director: cockpit, finanzas, sync, estrategia
//
// Se usa:
//   - En crearMiembro() al insertar un team_member nuevo (clona el set)
//   - En el script scripts/reseed-habitos-por-rol.mjs (re-clonado masivo)
//
// dias_activos: array ISO weekday 1=lun..7=dom

export type HabitoDefault = {
  nombre: string
  icono: string
  color: string
  dias_activos: number[]
  orden: number
}

const TODOS_LOS_DIAS = [1, 2, 3, 4, 5, 6, 7]
const LUN_VIE = [1, 2, 3, 4, 5]

export const HABITOS_POR_ROL: Record<string, HabitoDefault[]> = {
  community_manager: [
    { nombre: 'Responder comentarios',          icono: '💬', color: '#22c55e', dias_activos: TODOS_LOS_DIAS, orden: 10 },
    { nombre: 'Revisar tendencias',             icono: '📈', color: '#06b6d4', dias_activos: LUN_VIE,         orden: 20 },
    { nombre: 'Publicar historias',             icono: '📸', color: '#f59e0b', dias_activos: TODOS_LOS_DIAS, orden: 30 },
    { nombre: 'Informar al grupo',              icono: '📢', color: '#8b5cf6', dias_activos: LUN_VIE,         orden: 40 },
  ],
  disenador: [
    { nombre: 'Revisar inspiración del día',    icono: '🎨', color: '#ec4899', dias_activos: LUN_VIE,         orden: 10 },
    { nombre: 'Avance de portadas asignadas',   icono: '🖼️', color: '#f59e0b', dias_activos: LUN_VIE,         orden: 20 },
    { nombre: 'Organizar archivos del día',     icono: '📁', color: '#06b6d4', dias_activos: LUN_VIE,         orden: 30 },
    { nombre: 'Reportar avances al equipo',     icono: '📢', color: '#8b5cf6', dias_activos: LUN_VIE,         orden: 40 },
  ],
  editor: [
    { nombre: 'Revisar tareas asignadas',       icono: '📋', color: '#22c55e', dias_activos: LUN_VIE,         orden: 10 },
    { nombre: 'Avance de videos del día',       icono: '✂️', color: '#8b5cf6', dias_activos: LUN_VIE,         orden: 20 },
    { nombre: 'Backup de proyectos',            icono: '💾', color: '#06b6d4', dias_activos: LUN_VIE,         orden: 30 },
    { nombre: 'Reportar avances al equipo',     icono: '📢', color: '#f59e0b', dias_activos: LUN_VIE,         orden: 40 },
  ],
  social_media_manager: [
    { nombre: 'Revisar grilla del día',         icono: '📅', color: '#7170ff', dias_activos: LUN_VIE,         orden: 10 },
    { nombre: 'Revisar métricas semanales',     icono: '📊', color: '#06b6d4', dias_activos: [1],              orden: 20 },
    { nombre: 'Coordinar con equipos',          icono: '🤝', color: '#22c55e', dias_activos: LUN_VIE,         orden: 30 },
    { nombre: 'Reporte ejecutivo',              icono: '📈', color: '#f59e0b', dias_activos: [5],              orden: 40 },
  ],
  director: [
    { nombre: 'Revisar cockpit del día',        icono: '🎯', color: '#7170ff', dias_activos: LUN_VIE,         orden: 10 },
    { nombre: 'Revisar finanzas',               icono: '💰', color: '#22c55e', dias_activos: [1, 5],           orden: 20 },
    { nombre: 'Sync con cada área',             icono: '🤝', color: '#06b6d4', dias_activos: LUN_VIE,         orden: 30 },
    { nombre: 'Estrategia semanal',             icono: '🧠', color: '#f59e0b', dias_activos: [1],              orden: 40 },
  ],
}

/* Fallback si el rol_base no está mapeado todavía. */
const HABITOS_DEFAULT_GENERICO: HabitoDefault[] = [
  { nombre: 'Revisar tareas del día', icono: '📋', color: '#22c55e', dias_activos: LUN_VIE, orden: 10 },
  { nombre: 'Reportar avances',       icono: '📢', color: '#8b5cf6', dias_activos: LUN_VIE, orden: 20 },
]

export function getHabitosParaRol(rolBase: string): HabitoDefault[] {
  return HABITOS_POR_ROL[rolBase] ?? HABITOS_DEFAULT_GENERICO
}
