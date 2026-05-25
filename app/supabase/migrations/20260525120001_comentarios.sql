-- Migración 019 — Sistema de respuesta de comentarios (Metricool integration)
--
-- Modelo de 3 piezas:
--   1. comentarios_inbox       — cache local de comentarios pendientes desde Metricool
--   2. comentarios_templates    — templates de respuesta por categoría x marca
--   3. marcas.reporte_comentarios_grupo — toggle dónde mandar informe ('cliente'|'interno'|'ninguno')
--
-- Flow:
--   cron diario → fetch Metricool API → upsert en comentarios_inbox (status='pending')
--   → clasificar + sugerir template → Pedro entra a /comentarios → revisa + aprueba batch
--   → server action llama API Metricool send para cada aprobado → status='responded'
--   → manda informe WhatsApp al grupo configurado por marca

-- ============================================================
-- TABLA comentarios_inbox
-- ============================================================
-- Cada row = 1 comentario de Instagram/Facebook/TikTok cacheado para procesar.
-- UNIQUE en metricool_comment_id evita duplicados (idempotent upsert).
-- post_text_preview / post_media_url denormalizados para mostrar contexto en UI
-- sin tener que re-fetch el post desde Metricool.

CREATE TABLE IF NOT EXISTS comentarios_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  network text NOT NULL CHECK (network IN ('instagram', 'facebook', 'tiktok')),
  metricool_comment_id text NOT NULL,
  metricool_thread_id text,         -- root.id si es diferente del comment id
  metricool_post_id text,            -- root.element.id del post original
  author_username text NOT NULL,
  author_name text,
  comment_text text NOT NULL,
  comment_created_at timestamptz NOT NULL,
  post_link text,                    -- URL al post en Instagram/etc
  post_text_preview text,            -- primeras 200 chars del caption
  post_media_url text,
  categoria_sugerida text CHECK (categoria_sugerida IN ('pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion', 'otro')),
  respuesta_sugerida text,
  respuesta_final text,              -- lo que se envió realmente (puede diferir de sugerida si Pedro editó)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'responded', 'skipped', 'failed')),
  metricool_response_id text,        -- ID del reply en Metricool una vez enviado
  failed_reason text,
  responded_at timestamptz,
  responded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, metricool_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comentarios_inbox_marca_status
  ON comentarios_inbox(marca_id, status, comment_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_inbox_status_pending
  ON comentarios_inbox(status, marca_id) WHERE status = 'pending';

-- ============================================================
-- TABLA comentarios_templates
-- ============================================================
-- Templates de respuesta por categoría. marca_id NULL = template global default.
-- Cuando se aplica template, el sistema usa primero el específico de la marca; si no existe, usa global.

CREATE TABLE IF NOT EXISTS comentarios_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid REFERENCES marcas(id) ON DELETE CASCADE,  -- NULL = global default
  categoria text NOT NULL CHECK (categoria IN ('pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion', 'otro')),
  template_text text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marca_id, categoria)  -- 1 template activo por marca x categoría
);

CREATE INDEX IF NOT EXISTS idx_comentarios_templates_marca_cat
  ON comentarios_templates(marca_id, categoria) WHERE activo = true;

-- ============================================================
-- Columna nueva en marcas
-- ============================================================
ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS reporte_comentarios_grupo text DEFAULT 'interno'
    CHECK (reporte_comentarios_grupo IN ('cliente', 'interno', 'ninguno')),
  ADD COLUMN IF NOT EXISTS metricool_blog_id integer;

COMMENT ON COLUMN marcas.reporte_comentarios_grupo IS
  'A qué grupo WhatsApp se manda el informe después de responder comentarios. cliente=grupo del cliente, interno=New team (default seguro), ninguno=sin informe.';

COMMENT ON COLUMN marcas.metricool_blog_id IS
  'ID de la marca en Metricool (devuelto por GET /brands). Se usa para fetchear comentarios pendientes. NULL si la marca no está conectada a Metricool aún.';

-- Seed metricool_blog_id por marca (info real obtenida 25 may 2026)
UPDATE marcas SET metricool_blog_id = 6206473 WHERE slug = 'manrique';
UPDATE marcas SET metricool_blog_id = 6206541 WHERE slug = 'lozano';
UPDATE marcas SET metricool_blog_id = 6206439 WHERE slug = 'distribuidora-fitness';
UPDATE marcas SET metricool_blog_id = 6206349 WHERE slug = 'kintu';
UPDATE marcas SET metricool_blog_id = 5766014 WHERE slug = 'novalamps';
UPDATE marcas SET metricool_blog_id = 6206430 WHERE slug = 'la-victoria';
UPDATE marcas SET metricool_blog_id = 6206449 WHERE slug = 'little-joe';

-- ============================================================
-- RLS + triggers
-- ============================================================
ALTER TABLE comentarios_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth full comentarios_inbox" ON comentarios_inbox;
CREATE POLICY "auth full comentarios_inbox" ON comentarios_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth full comentarios_templates" ON comentarios_templates;
CREATE POLICY "auth full comentarios_templates" ON comentarios_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION trigger_set_comentarios_inbox_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_comentarios_inbox_updated_at ON comentarios_inbox;
CREATE TRIGGER set_comentarios_inbox_updated_at BEFORE UPDATE ON comentarios_inbox
  FOR EACH ROW EXECUTE FUNCTION trigger_set_comentarios_inbox_updated_at();

DROP TRIGGER IF EXISTS set_comentarios_templates_updated_at ON comentarios_templates;
CREATE TRIGGER set_comentarios_templates_updated_at BEFORE UPDATE ON comentarios_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_comentarios_inbox_updated_at();

-- ============================================================
-- Seed: templates GLOBAL default (marca_id NULL)
-- ============================================================
-- Estos son fallback cuando una marca no tiene template propio.
-- Cada marca puede luego personalizar desde Settings.

INSERT INTO comentarios_templates (marca_id, categoria, template_text)
SELECT * FROM (VALUES
  (NULL::uuid, 'pregunta_info', 'Hola 😊 Te escribimos por interno con toda la información que necesitas 🙌'),
  (NULL::uuid, 'testimonial',   'Muchas gracias por tu comentario 💙 Nos motiva a seguir mejorando cada día.'),
  (NULL::uuid, 'empatia',       'Gracias por sumarte a la conversación 💙 Coincidimos contigo.'),
  (NULL::uuid, 'derivar',       'Hola 😊 Te escribimos por DM para resolverte todas las dudas 🙌'),
  (NULL::uuid, 'reaccion',      'Gracias por sumarte 💙'),
  (NULL::uuid, 'otro',          'Hola 😊 Gracias por escribirnos, te respondemos por DM 🙌')
) AS v(marca_id, categoria, template_text)
WHERE NOT EXISTS (
  SELECT 1 FROM comentarios_templates t
  WHERE t.marca_id IS NULL AND t.categoria = v.categoria
);

-- Comentarios documentales
COMMENT ON TABLE comentarios_inbox IS
  'Cache local de comentarios desde Metricool API. status: pending → approved → responded. responded_at + respuesta_final son la prueba de envío.';

COMMENT ON COLUMN comentarios_inbox.categoria_sugerida IS
  'Auto-clasificado por heurística simple (keywords + length): pregunta_info, testimonial, empatia, derivar, reaccion, otro.';

COMMENT ON TABLE comentarios_templates IS
  'Templates de respuesta por categoría. marca_id NULL = global default fallback. Cada marca puede personalizar desde Settings.';
