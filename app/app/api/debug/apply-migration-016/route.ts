// app/app/api/debug/apply-migration-016/route.ts
// One-shot endpoint para verificar si Migration 016 (grabaciones) está aplicada.
// Idempotente. Si NO está, devuelve el SQL para correr manualmente en Supabase Studio.
// Si SÍ está, confirma con un sample row.
//
// Uso:
//   curl "https://distinto-app.vercel.app/api/debug/apply-migration-016?debug_key=tp-debug-2026-05-22-grilla-fix"

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DEBUG_KEY = 'tp-debug-2026-05-22-grilla-fix'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('debug_key') !== DEBUG_KEY && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Test 1: tabla grabaciones existe?
  const tablaCheck = await service
    .from('grabaciones')
    .select('id, estado')
    .limit(1)

  // Test 2: columna marcas.grabaciones_objetivo_mensual existe?
  const colCheck = await service
    .from('marcas')
    .select('slug, grabaciones_objetivo_mensual')
    .limit(1)

  const tablaOk = !tablaCheck.error
  const colOk = !colCheck.error

  if (tablaOk && colOk) {
    return NextResponse.json({
      ok: true,
      status: 'already_applied',
      message: 'Migration 016 ya está aplicada (tabla grabaciones + columna marcas.grabaciones_objetivo_mensual existen).',
      sample_marca: colCheck.data?.[0] ?? null,
      sample_grabacion: tablaCheck.data?.[0] ?? null,
    })
  }

  const sql = `CREATE TABLE IF NOT EXISTS grabaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  fecha_planeada date NOT NULL,
  fecha_real date,
  estado text NOT NULL DEFAULT 'planeada' CHECK (estado IN ('planeada', 'cumplida', 'cancelada')),
  videos_grabados integer,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grabaciones_marca_fecha ON grabaciones(marca_id, fecha_planeada DESC);
CREATE INDEX IF NOT EXISTS idx_grabaciones_estado_fecha ON grabaciones(estado, fecha_planeada DESC);

ALTER TABLE marcas ADD COLUMN IF NOT EXISTS grabaciones_objetivo_mensual integer NOT NULL DEFAULT 0;

ALTER TABLE grabaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users full access grabaciones" ON grabaciones;
CREATE POLICY "auth users full access grabaciones" ON grabaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);`

  return NextResponse.json(
    {
      ok: false,
      status: 'needs_manual_apply',
      message: 'Migration 016 NO está aplicada. Pegá este SQL en Supabase Studio → SQL Editor:',
      sql,
      checks: {
        tabla_grabaciones: tablaOk ? 'EXISTS' : tablaCheck.error?.message,
        col_grabaciones_objetivo: colOk ? 'EXISTS' : colCheck.error?.message,
      },
    },
    { status: 422 },
  )
}
