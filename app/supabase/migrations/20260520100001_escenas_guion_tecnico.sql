-- Migración 013 — Tabla escenas (guion técnico estructurado)
-- Cada publicación puede tener N escenas ordenadas. Estructura clásica de
-- shooting script: número escena · diálogo · plano · duración · notas.

CREATE TABLE IF NOT EXISTS escenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacion_id uuid NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,

  -- Orden de la escena en el guion (1, 2, 3...)
  escena_num int NOT NULL,

  -- Diálogo / voz en off / parlamento del talent
  dialogo text,

  -- Tipo de plano. Valores comunes:
  --   PG  = Plano General
  --   PM  = Plano Medio
  --   PP  = Primer Plano
  --   PPP = Primerísimo Primer Plano
  --   PD  = Plano Detalle
  --   PE  = Plano Entero
  --   PA  = Plano Americano
  --   AÉREO, CONTRAPICADO, PICADO, ZENITAL, etc.
  -- Se guarda como text libre para flexibilidad (no enum) — la UI sugiere los comunes.
  plano text,

  -- Duración estimada del plano en segundos (opcional)
  duracion_seg int,

  -- Notas: accesorios, vestuario, transiciones, locación
  notas text,

  -- Auditoría
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Unique constraint: dentro de una publicación, el escena_num no se repite
  UNIQUE (publicacion_id, escena_num)
);

COMMENT ON TABLE escenas IS
  'Filas del guion técnico de cada publicación. Estructura: escena_num · diálogo · plano · duración · notas. Reordenable cambiando escena_num.';

CREATE INDEX IF NOT EXISTS idx_escenas_publicacion ON escenas(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_escenas_orden ON escenas(publicacion_id, escena_num);

-- Trigger updated_at
DROP TRIGGER IF EXISTS escenas_set_updated_at ON escenas;
CREATE TRIGGER escenas_set_updated_at
  BEFORE UPDATE ON escenas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- RLS
ALTER TABLE escenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escenas_service_all ON escenas;
CREATE POLICY escenas_service_all ON escenas
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auth: ven/editan escenas de publicaciones cuyas marcas tienen acceso
DROP POLICY IF EXISTS escenas_auth_marca ON escenas;
CREATE POLICY escenas_auth_marca ON escenas
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM publicaciones p
      JOIN marca_usuarios mu ON mu.marca_id = p.marca_id
      WHERE p.id = escenas.publicacion_id
        AND mu.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publicaciones p
      JOIN marca_usuarios mu ON mu.marca_id = p.marca_id
      WHERE p.id = escenas.publicacion_id
        AND mu.usuario_id = auth.uid()
        AND mu.rol IN ('admin', 'colaborador')
    )
  );
