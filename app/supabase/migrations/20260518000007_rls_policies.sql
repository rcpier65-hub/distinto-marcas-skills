-- Migración 007 — Row Level Security básico
-- Aplicada: 2026-05-18 (Task 12 Plan 1)

-- Habilitar RLS en todas las tablas
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE grillas_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;

-- MARCAS: authenticated lee, service_role full
CREATE POLICY "Authenticated can read all marcas"
ON marcas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access marcas"
ON marcas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- GRILLAS: authenticated lee + inserta (en Plan 5 limitamos por marca)
CREATE POLICY "Authenticated can read all grillas"
ON grillas_pendientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert grillas"
ON grillas_pendientes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service role full access grillas"
ON grillas_pendientes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- APROBACIONES: authenticated lee, service_role full
CREATE POLICY "Authenticated can read aprobaciones"
ON aprobaciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access aprobaciones"
ON aprobaciones FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ENVIOS: authenticated lee, service_role full
CREATE POLICY "Authenticated can read envios"
ON envios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access envios"
ON envios FOR ALL TO service_role USING (true) WITH CHECK (true);
