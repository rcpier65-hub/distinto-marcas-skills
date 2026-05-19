-- Migración 009 — Permitir lectura anon de marcas activas
-- Razón: la página dashboard pública necesita listar marcas (info no sensible).
-- Datos sensibles como decisor_whatsapp quedan ocultos vía column-level select en queries.
-- Aplicada: 2026-05-18 (Task 15 Plan 1 fix)

CREATE POLICY "Anon can read active marcas"
ON marcas FOR SELECT
TO anon
USING (activa = true);
