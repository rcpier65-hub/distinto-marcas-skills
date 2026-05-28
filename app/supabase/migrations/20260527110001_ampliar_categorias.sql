-- Migration 023 — ampliar ComentarioCategoria con queja, humor, sensible, spam
--
-- En el ejercicio P26-R4 descubrimos que el prompt v2 generaba estas 4
-- categorías nuevas, pero el endpoint /sugerencia y el CHECK constraint
-- de la BD las rechazaban. La Routine fallaba silenciosamente con 400.
--
-- Ampliación:
--   - queja     → cliente se queja (empatía + derivar)
--   - humor     → cliente bromea (espejo de tono + dato si lo hay)
--   - sensible  → consulta médica/salud (derivar profesional)
--   - spam      → hate/ruido (respuesta vacía, skip)
--
-- Migration idempotente: drop + recreate constraints con la nueva lista.

-- 1. comentarios_inbox.categoria_sugerida
ALTER TABLE comentarios_inbox
  DROP CONSTRAINT IF EXISTS comentarios_inbox_categoria_sugerida_check;

ALTER TABLE comentarios_inbox
  ADD CONSTRAINT comentarios_inbox_categoria_sugerida_check
  CHECK (categoria_sugerida IN (
    'pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion',
    'queja', 'humor', 'sensible', 'spam',
    'otro'
  ));

-- 2. respuesta_templates.categoria (tabla de plantillas que también usa el enum)
ALTER TABLE respuesta_templates
  DROP CONSTRAINT IF EXISTS respuesta_templates_categoria_check;

ALTER TABLE respuesta_templates
  ADD CONSTRAINT respuesta_templates_categoria_check
  CHECK (categoria IN (
    'pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion',
    'queja', 'humor', 'sensible', 'spam',
    'otro'
  ));

COMMENT ON CONSTRAINT comentarios_inbox_categoria_sugerida_check ON comentarios_inbox IS
  'Lista oficial de categorías. Ampliada en v2 para soportar queja/humor/sensible/spam que aparecen en el prompt v2 de la Routine.';
