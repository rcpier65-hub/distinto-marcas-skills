-- 20260608120001_marcas_notas_grabaciones.sql
-- Agrega columna libre `notas_grabaciones` a marcas para anotar
-- pendientes específicos de grabación por marca (ej. "pendiente
-- confirmar fecha con Cristal" para Little Joe). NO afecta la
-- generación automática de grabaciones — solo es un espacio
-- editable en la card de cada marca dentro de /grabaciones.
--
-- nullable, default null. Texto libre, sin límite duro a nivel
-- columna (Postgres `text` aguanta cualquier longitud razonable).

ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS notas_grabaciones text DEFAULT NULL;

COMMENT ON COLUMN marcas.notas_grabaciones IS
  'Notas operativas de grabación visibles en /grabaciones (pendientes con cliente, instrucciones especiales, etc.). Editable inline desde la card.';
