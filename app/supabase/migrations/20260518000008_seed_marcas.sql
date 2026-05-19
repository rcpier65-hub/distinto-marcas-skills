-- Migración 008 — Seed inicial: 7 marcas activas
-- Aplicada: 2026-05-18 (Task 13 Plan 1)

INSERT INTO marcas (slug, nombre, decisor_tratamiento, decisor_nombre, decisor_whatsapp,
                    grupo_whatsapp_nombre, color_primario_hex, emoji_marca, activa, tono_voz)
VALUES
  ('manrique', 'Centro Psicológico Manrique ABA',
   'Dr.', 'Daniel Manrique', NULL,
   'Marketing Manrique ABA', '#283B6F', '💙', true,
   '{"arquetipo": "Sage + Caregiver", "emojis_on_brand": ["🌿","🌱","💙","✨"], "emojis_vetados": ["😂","🔥","🤣"], "tono": "Cálida, profesional, rigurosa"}'::jsonb),

  ('lozano', 'Muebles Lozano',
   'Sr.', 'Lozano', '969630299',
   NULL, '#DCC32C', '🪑', true,
   '{"tono": "Profesional comercial", "emoji": "🪑"}'::jsonb),

  ('distribuidora-fitness', 'Distribuidora Fitness Marketing',
   NULL, NULL, '973991208',
   NULL, NULL, '💪', true,
   '{"tono": "Motivacional, energético"}'::jsonb),

  ('little-joe', 'Little Joe',
   NULL, NULL, NULL,
   'New team', '#61B3D1', '💙', true,
   '{"tono": "Cálido juguetón premium italiano", "arquetipo": "Lover + Innocent + Caregiver"}'::jsonb),

  ('kintu', 'Kintu',
   NULL, NULL, '017369840',
   NULL, NULL, '🌿', true,
   '{"tono": "Natural wellness"}'::jsonb),

  ('novalamps', 'NovaLamps',
   NULL, NULL, '949462622',
   NULL, NULL, '💡', true,
   '{"tono": "Diseño iluminación"}'::jsonb),

  ('la-victoria', 'La Victoria',
   NULL, NULL, '973991208',
   NULL, NULL, '🏗️', true,
   '{"tono": "Profesional construcción"}'::jsonb);
