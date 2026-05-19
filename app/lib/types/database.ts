// Tipos TypeScript del schema Supabase
// Generado manualmente — para regenerar automáticamente:
//   1. Instalar Docker Desktop
//   2. Correr: npx supabase gen types typescript --db-url "$SUPABASE_DB_URL" > lib/types/database.ts
//
// Schema version: 2026-05-18 (post-migración 008)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================

export type EstadoGrilla =
  | 'pendiente'
  | 'procesando'
  | 'esperando_aprobacion'
  | 'aprobada'
  | 'enviada'
  | 'cancelada'
  | 'regenerar'

export type AccionAprobacion = 'solicitar' | 'aprobar' | 'rechazar' | 'regenerar'

export type ViaAprobacion = 'whatsapp' | 'dashboard' | 'api'

export type TipoEnvio = 'whatsapp_grupo' | 'whatsapp_dm' | 'email'

export type RolUsuario = 'admin' | 'colaborador' | 'cliente'

export type EstadoPublicacion =
  | 'tareas'
  | 'idear'
  | 'editando'
  | 'editar'
  | 'disenar'
  | 'enviado'
  | 'aprobar'
  | 'programar'
  | 'programar_anuncios'
  | 'archivado'

export type EstadoTarea = 'sin_empezar' | 'en_progreso' | 'listo'

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  sin_empezar: 'Sin empezar',
  en_progreso: 'En progreso',
  listo: 'Listo',
}

// Labels en español para UI
export const ESTADO_PUBLICACION_LABEL: Record<EstadoPublicacion, string> = {
  tareas: 'Tareas',
  idear: 'Idear',
  editando: 'Editando',
  editar: 'Editar',
  disenar: 'Diseñar',
  enviado: 'Enviado',
  aprobar: 'Aprobar',
  programar: 'Programar',
  programar_anuncios: 'Programar anuncios',
  archivado: 'Archivado',
}

// ============================================================
// TABLAS — Row, Insert y Update types
// ============================================================

export interface MarcaRow {
  id: string
  slug: string
  nombre: string
  decisor_nombre: string | null
  decisor_tratamiento: string | null
  decisor_whatsapp: string | null
  grupo_whatsapp_nombre: string | null
  grupo_whatsapp_alias: string | null
  tono_voz: Json | null
  color_primario_hex: string | null
  emoji_marca: string | null
  activa: boolean
  notion_proyecto_id: string | null
  created_at: string
  updated_at: string
}

export interface MarcaInsert {
  id?: string
  slug: string
  nombre: string
  decisor_nombre?: string | null
  decisor_tratamiento?: string | null
  decisor_whatsapp?: string | null
  grupo_whatsapp_nombre?: string | null
  grupo_whatsapp_alias?: string | null
  tono_voz?: Json | null
  color_primario_hex?: string | null
  emoji_marca?: string | null
  activa?: boolean
  notion_proyecto_id?: string | null
  created_at?: string
  updated_at?: string
}

export type MarcaUpdate = Partial<MarcaRow>

// --------------------------------------------------------

export interface PublicacionRow {
  id: string
  marca_id: string
  nombre: string
  estado: EstadoPublicacion
  fecha_publicacion: string | null  // date ISO YYYY-MM-DD
  fecha_edicion: string | null
  fecha_diseno: string | null
  plataformas: string[]
  tipo_contenido: string[]
  objetivos: string[]
  copy: string | null
  guion: string | null
  enlace_tomas: string | null
  enlace_musica: string | null
  portada_cruda_url: string | null
  portada_editada_url: string | null
  copy_listo: boolean
  musica_lista: boolean
  portada_lista: boolean
  disenado: boolean
  editado: boolean
  video_aprobado: boolean
  editor_nombre: string | null
  editor_id: string | null
  estado_tarea: EstadoTarea
  opcion_2: string | null
  notion_original_id: string | null
  notion_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface PublicacionInsert {
  id?: string
  marca_id: string
  nombre: string
  estado?: EstadoPublicacion
  fecha_publicacion?: string | null
  fecha_edicion?: string | null
  fecha_diseno?: string | null
  plataformas?: string[]
  tipo_contenido?: string[]
  objetivos?: string[]
  copy?: string | null
  guion?: string | null
  enlace_tomas?: string | null
  enlace_musica?: string | null
  portada_cruda_url?: string | null
  portada_editada_url?: string | null
  copy_listo?: boolean
  musica_lista?: boolean
  portada_lista?: boolean
  disenado?: boolean
  editado?: boolean
  video_aprobado?: boolean
  editor_nombre?: string | null
  editor_id?: string | null
  estado_tarea?: EstadoTarea
  opcion_2?: string | null
  notion_original_id?: string | null
  notion_url?: string | null
  notas?: string | null
  created_at?: string
  updated_at?: string
  created_by?: string | null
  updated_by?: string | null
}

export type PublicacionUpdate = Partial<PublicacionRow>

// --------------------------------------------------------

export interface EditorRow {
  id: string
  nombre: string
  activo: boolean
  created_at: string
}

export interface EditorInsert {
  id?: string
  nombre: string
  activo?: boolean
  created_at?: string
}

// --------------------------------------------------------

export interface GrillaPendienteRow {
  id: string
  marca_id: string
  semana_inicio: string  // date ISO YYYY-MM-DD
  semana_fin: string
  estado: EstadoGrilla
  pedida_por: string | null
  pedida_at: string
  procesada_at: string | null
  aprobada_at: string | null
  enviada_at: string | null
  cancelada_at: string | null
  png_url: string | null
  png_storage_path: string | null
  caption: string | null
  mensaje_id_pedro: string | null
  mensaje_id_cliente: string | null
  publicaciones_count: number | null
  notion_grilla_ids: Json | null
  notas: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface GrillaPendienteInsert {
  id?: string
  marca_id: string
  semana_inicio: string
  semana_fin: string
  estado?: EstadoGrilla
  pedida_por?: string | null
  pedida_at?: string
  procesada_at?: string | null
  aprobada_at?: string | null
  enviada_at?: string | null
  cancelada_at?: string | null
  png_url?: string | null
  png_storage_path?: string | null
  caption?: string | null
  mensaje_id_pedro?: string | null
  mensaje_id_cliente?: string | null
  publicaciones_count?: number | null
  notion_grilla_ids?: Json | null
  notas?: string | null
  error?: string | null
  created_at?: string
  updated_at?: string
}

export type GrillaPendienteUpdate = Partial<GrillaPendienteRow>

// --------------------------------------------------------

export interface AprobacionRow {
  id: string
  grilla_id: string
  usuario_id: string | null
  accion: AccionAprobacion
  via: ViaAprobacion
  comentario: string | null
  metadata: Json | null
  created_at: string
}

export interface AprobacionInsert {
  id?: string
  grilla_id: string
  usuario_id?: string | null
  accion: AccionAprobacion
  via: ViaAprobacion
  comentario?: string | null
  metadata?: Json | null
  created_at?: string
}

export type AprobacionUpdate = Partial<AprobacionRow>

// --------------------------------------------------------

export interface EnvioRow {
  id: string
  grilla_id: string
  marca_id: string
  tipo: TipoEnvio
  destino: string
  caption: string | null
  mensaje_id: string | null
  success: boolean
  error: string | null
  metadata: Json | null
  created_at: string
}

export interface EnvioInsert {
  id?: string
  grilla_id: string
  marca_id: string
  tipo: TipoEnvio
  destino: string
  caption?: string | null
  mensaje_id?: string | null
  success?: boolean
  error?: string | null
  metadata?: Json | null
  created_at?: string
}

export type EnvioUpdate = Partial<EnvioRow>

// ============================================================
// DATABASE — formato compat con @supabase/supabase-js typed client
// ============================================================

export interface Database {
  public: {
    Tables: {
      marcas: {
        Row: MarcaRow
        Insert: MarcaInsert
        Update: MarcaUpdate
        Relationships: []
      }
      grillas_pendientes: {
        Row: GrillaPendienteRow
        Insert: GrillaPendienteInsert
        Update: GrillaPendienteUpdate
        Relationships: []
      }
      aprobaciones: {
        Row: AprobacionRow
        Insert: AprobacionInsert
        Update: AprobacionUpdate
        Relationships: []
      }
      envios: {
        Row: EnvioRow
        Insert: EnvioInsert
        Update: EnvioUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      estado_grilla: EstadoGrilla
      accion_aprobacion: AccionAprobacion
      via_aprobacion: ViaAprobacion
      tipo_envio: TipoEnvio
      rol_usuario: RolUsuario
    }
  }
}
