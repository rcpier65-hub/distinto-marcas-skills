-- Migración 010 — Agregar notion_proyecto_id a marcas
-- Cada marca tiene un proyecto Notion (página en la DB "Distinto agencia cuentas").
-- Lo usamos como filtro `relation.contains` en la query de la grilla.
--
-- Mapeo levantado de Notion el 2026-05-19:
--   lozano                 → 1. Muebles Lozano                  b45885410ddd826a941d81171debd1fc
--   manrique               → 2. Centro Psicológico Manrique ABA 2ae885410ddd83ba972681d8063d229c
--   distribuidora-fitness  → 3. Distribuidora Fitness Marketing f18885410ddd827992fa81067ecf324d
--   little-joe             → 4. Little Joe                       811885410ddd83c7928881551fa56355
--   kintu                  → 6. Kintu                            245885410ddd83efa3ef81e5a83b8f32
--   novalamps              → 7. NovaLamps                        fba885410ddd824b8dce01c538c171ea
--   la-victoria            → 8. La Victoria                      6c5885410ddd8278963a01e4b84595fc
--
-- "5. Mil Ideas" y "9. Oral Beauty" existen en Notion pero no en marcas (todavía).

ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS notion_proyecto_id text;

COMMENT ON COLUMN marcas.notion_proyecto_id IS
  'UUID de la página del proyecto en la DB "Distinto agencia cuentas" de Notion. Usado para filtrar la grilla por proyecto via relation.contains.';

-- Backfill con los IDs conocidos
UPDATE marcas SET notion_proyecto_id = 'b45885410ddd826a941d81171debd1fc' WHERE slug = 'lozano';
UPDATE marcas SET notion_proyecto_id = '2ae885410ddd83ba972681d8063d229c' WHERE slug = 'manrique';
UPDATE marcas SET notion_proyecto_id = 'f18885410ddd827992fa81067ecf324d' WHERE slug = 'distribuidora-fitness';
UPDATE marcas SET notion_proyecto_id = '811885410ddd83c7928881551fa56355' WHERE slug = 'little-joe';
UPDATE marcas SET notion_proyecto_id = '245885410ddd83efa3ef81e5a83b8f32' WHERE slug = 'kintu';
UPDATE marcas SET notion_proyecto_id = 'fba885410ddd824b8dce01c538c171ea' WHERE slug = 'novalamps';
UPDATE marcas SET notion_proyecto_id = '6c5885410ddd8278963a01e4b84595fc' WHERE slug = 'la-victoria';
