// app/lib/team/types.ts
//
// Tipos y helpers del sistema de team_members + permisos.
// Decisión arquitectónica de Pedro: rol base + override individual.
// El override es SPARSE — solo guarda las claves donde el miembro
// difiere del rol. Por eso el merge usa deep-merge selectivo.

export type ModuloPermiso =
  | 'inbox'
  | 'publicaciones'
  | 'editor'
  | 'diseno'
  | 'grilla'
  | 'comentarios'
  | 'metricas'
  | 'settings'
  | 'equipo'
  | 'finanzas'

/* Shape de los permisos. Notar que cada módulo es opcional y dentro
   los campos pueden ser undefined: el merge respeta el rol base si
   el override no setea la clave. */
export type Permisos = {
  inbox?: { acceso?: boolean }
  publicaciones?: { acceso?: boolean; puede_crear?: boolean; puede_editar?: boolean; puede_borrar?: boolean }
  editor?: { acceso?: boolean; solo_propias?: boolean }
  diseno?: { acceso?: boolean }
  grilla?: { acceso?: boolean; puede_enviar?: boolean }
  comentarios?: { acceso?: boolean; puede_responder?: boolean }
  metricas?: { acceso?: boolean }
  settings?: { acceso?: boolean }
  equipo?: { acceso?: boolean; puede_invitar?: boolean; puede_resetear_passwords?: boolean }
  finanzas?: { acceso?: boolean }
}

export type RolPredefinidoId =
  | 'admin' | 'director' | 'social_media_manager'
  | 'community_manager' | 'editor' | 'disenador'

export type RolPredefinido = {
  id: RolPredefinidoId
  nombre: string
  descripcion: string | null
  permisos_default: Permisos
  orden: number
}

export type TeamMember = {
  id: string
  auth_user_id: string | null
  email: string
  nombre: string
  rol_base: RolPredefinidoId
  cargo_personalizado: string | null
  fecha_cumpleanos: string | null  // ISO YYYY-MM-DD
  avatar_url: string | null
  permisos_override: Permisos
  marcas_acceso: string[] | null   // null = todas las marcas
  editor_legacy_id: string | null
  activo: boolean
  notas: string | null
  /* Contraseña inicial asignada por Pedro. Visible en /equipo para
     que pueda copiarla y pasarla manualmente al miembro. NO se usa
     para validar login (eso vive hasheado en auth.users). */
  password_inicial: string | null
  created_at: string
  updated_at: string
}

/**
 * Combina rol_base.permisos_default con permisos_override. El override
 * gana ÚNICAMENTE en los campos que define — los demás vienen del rol.
 *
 * Ejemplo:
 *   rol_base = editor → editor.acceso=true, inbox.acceso=false
 *   override = { inbox: { acceso: true } }
 *   result   = { editor: {acceso:true,...}, inbox: {acceso:true} }
 *
 * Esto significa que cambiar un rol predefinido propaga a TODOS sus
 * miembros automáticamente, salvo donde tienen override explícito.
 */
export function mergePermisos(rolBase: Permisos, override: Permisos | null | undefined): Permisos {
  if (!override) return rolBase
  const out: Permisos = {}
  /* Recorremos todos los módulos posibles para garantizar que ninguna
     clave del rol se pierda si el override solo redefine algunos. */
  const todosModulos = new Set<ModuloPermiso>([
    ...Object.keys(rolBase) as ModuloPermiso[],
    ...Object.keys(override) as ModuloPermiso[],
  ])
  for (const mod of todosModulos) {
    const base = rolBase[mod] ?? {}
    const ovr = override[mod] ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(out as any)[mod] = { ...base, ...ovr }
  }
  return out
}

/**
 * Helper: ¿este miembro puede ver este módulo?
 * Recibe los permisos YA mergeados (output de mergePermisos).
 */
export function tieneAcceso(permisos: Permisos, modulo: ModuloPermiso): boolean {
  const m = permisos[modulo]
  if (!m) return false
  return !!(m as { acceso?: boolean }).acceso
}

/**
 * Helper: ¿este miembro puede ver la marca X? Si marcas_acceso es null,
 * ve todas. Si es array, debe contener el uuid.
 */
export function tieneAccesoMarca(marcasAcceso: string[] | null, marcaId: string): boolean {
  if (marcasAcceso === null) return true
  return marcasAcceso.includes(marcaId)
}

/**
 * Resumen humano de los permisos efectivos: cuántos módulos puede ver,
 * cuáles. Útil para mostrar en cards "5 módulos · 3 marcas" sin
 * desglosar.
 */
export function resumenPermisos(permisos: Permisos): {
  modulosAccesibles: ModuloPermiso[]
  totalModulos: number
} {
  const todos: ModuloPermiso[] = [
    'inbox', 'publicaciones', 'editor', 'diseno', 'grilla',
    'comentarios', 'metricas', 'settings', 'equipo', 'finanzas',
  ]
  const modulosAccesibles = todos.filter((m) => tieneAcceso(permisos, m))
  return { modulosAccesibles, totalModulos: todos.length }
}

/* Labels humanos por módulo para el UI */
export const MODULO_LABEL: Record<ModuloPermiso, string> = {
  inbox: 'Inbox global',
  publicaciones: 'Publicaciones',
  editor: 'Editor de video',
  diseno: 'Diseño',
  grilla: 'Grilla semanal',
  comentarios: 'Comentarios',
  metricas: 'Métricas',
  settings: 'Configuración',
  equipo: 'Mi equipo',
  finanzas: 'Finanzas',
}

/* Color de chip por rol — alineado con el branding morado/violeta
   de Distinto. Editor (rol más numeroso del equipo) usa el lavanda
   #8b5cf6 que pertenece a la familia morada. */
export const ROL_COLOR: Record<RolPredefinidoId, string> = {
  admin: '#dc2626',                 // rojo (alerta admin)
  director: '#7c3aed',              // morado intenso (jerarquía alta)
  social_media_manager: '#3b82f6',  // azul (contenido planificación)
  community_manager: '#06b6d4',     // cyan (atención clientes)
  editor: '#8b5cf6',                // violeta-lavanda (familia morada Distinto)
  disenador: '#ec4899',             // rosa (creativo)
}
