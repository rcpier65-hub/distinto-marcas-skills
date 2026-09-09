-- Ensure RETOZ appears in active-brand selectors (Diseño crear/editar marca).
-- Ticket Ailyn a312df2d: al editar una tarea creada, RETOZ no aparecía en el
-- selector de marca. Los selectores leen marcas.activa = true; si la fila
-- existía con activa=false (o nunca se insertó), no salía en el dropdown.
-- Idempotente: reactiva si existe; inserta mínima si falta.

INSERT INTO marcas (slug, nombre, color_primario_hex, emoji_marca, activa)
VALUES ('retoz', 'RETOZ', '#D06402', '👟', true)
ON CONFLICT (slug) DO UPDATE
SET
  activa = true,
  color_primario_hex = COALESCE(marcas.color_primario_hex, EXCLUDED.color_primario_hex),
  emoji_marca = COALESCE(marcas.emoji_marca, EXCLUDED.emoji_marca),
  updated_at = now();
