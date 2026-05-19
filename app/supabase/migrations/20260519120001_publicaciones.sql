-- Migración 011 — Tabla publicaciones (reemplaza Notion como source-of-truth)
-- Replicar las propiedades clave de la DB "📅 GRILLA DE CONTENIDO" de Notion
-- para que el sistema sea autosuficiente.

-- ============================================================
-- ENUM estado_publicacion
-- ============================================================
DO $$ BEGIN
  CREATE TYPE estado_publicacion AS ENUM (
    'tareas',
    'idear',
    'editando',
    'editar',
    'disenar',
    'enviado',
    'aprobar',
    'programar',
    'programar_anuncios',
    'archivado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Tabla publicaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS publicaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,

  -- Identidad básica
  nombre text NOT NULL,
  estado estado_publicacion DEFAULT 'tareas' NOT NULL,

  -- Fechas
  fecha_publicacion date,           -- "Grilla de FIT" en Notion
  fecha_edicion date,
  fecha_diseno date,

  -- Categorización (multi-select)
  plataformas text[] DEFAULT ARRAY[]::text[] NOT NULL,
  tipo_contenido text[] DEFAULT ARRAY[]::text[] NOT NULL,
  objetivos text[] DEFAULT ARRAY[]::text[] NOT NULL,

  -- Contenido editorial
  copy text,                        -- Texto que se publicará
  guion text,                       -- Indicaciones / guión para grabación

  -- Recursos externos
  enlace_tomas text,                -- Google Drive con tomas crudas
  enlace_musica text,               -- TikTok music link
  portada_cruda_url text,
  portada_editada_url text,

  -- Checklist de progreso (booleans del workflow Notion)
  copy_listo boolean DEFAULT false NOT NULL,
  musica_lista boolean DEFAULT false NOT NULL,
  portada_lista boolean DEFAULT false NOT NULL,
  disenado boolean DEFAULT false NOT NULL,
  editado boolean DEFAULT false NOT NULL,
  video_aprobado boolean DEFAULT false NOT NULL,

  -- Asignaciones (free text por ahora; en futuro FK a usuarios)
  editor_nombre text,

  -- Sync Notion (idempotencia + trazabilidad histórica)
  notion_original_id text UNIQUE,   -- UUID de la página Notion (sin dashes)
  notion_url text,                  -- URL original notion.so/...

  -- Misc
  notas text,

  -- Auditoría
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE publicaciones IS
  'Contenido programado por marca. Reemplaza la DB de Notion "📅 GRILLA DE CONTENIDO". Source-of-truth del sistema.';

COMMENT ON COLUMN publicaciones.fecha_publicacion IS
  'Fecha en la que la pieza se publica en redes (equivale a "Grilla de FIT" en Notion).';

COMMENT ON COLUMN publicaciones.notion_original_id IS
  'UUID de la página Notion original (sin dashes). Usado por el importer para upsert idempotente. NULL si la publicación se creó directamente en el sistema (no vino de Notion).';

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pub_marca ON publicaciones(marca_id);
CREATE INDEX IF NOT EXISTS idx_pub_fecha ON publicaciones(fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_pub_estado ON publicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_pub_marca_fecha ON publicaciones(marca_id, fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_pub_notion ON publicaciones(notion_original_id)
  WHERE notion_original_id IS NOT NULL;

-- ============================================================
-- Trigger updated_at (usa función existente de migraciones previas)
-- ============================================================
DROP TRIGGER IF EXISTS pub_set_updated_at ON publicaciones;
CREATE TRIGGER pub_set_updated_at
  BEFORE UPDATE ON publicaciones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE publicaciones ENABLE ROW LEVEL SECURITY;

-- Service role (importer, cron, server actions con createServiceClient) — bypass
DROP POLICY IF EXISTS pub_service_all ON publicaciones;
CREATE POLICY pub_service_all ON publicaciones
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuarios autenticados: pueden ver/editar publicaciones de marcas a las que tienen acceso vía marca_usuarios
DROP POLICY IF EXISTS pub_authenticated_marca ON publicaciones;
CREATE POLICY pub_authenticated_marca ON publicaciones
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marca_usuarios mu
      WHERE mu.marca_id = publicaciones.marca_id
        AND mu.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marca_usuarios mu
      WHERE mu.marca_id = publicaciones.marca_id
        AND mu.usuario_id = auth.uid()
        AND mu.rol IN ('admin', 'colaborador')
    )
  );
