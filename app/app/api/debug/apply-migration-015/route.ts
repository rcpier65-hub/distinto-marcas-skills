// app/app/api/debug/apply-migration-015/route.ts
// One-shot endpoint para aplicar Migration 015 (whatsapp_config columns).
// Requiere auth Bearer = CRON_SECRET. Borrar después de aplicar exitosamente.
//
// Uso (desde curl o navegador autenticado):
//   curl -H "Authorization: Bearer $CRON_SECRET" https://distinto-app.vercel.app/api/debug/apply-migration-015
//
// O simplemente entrar a /api/debug/apply-migration-015?debug_key=tp-debug-2026-05-22-grilla-fix
//
// Aplica IF NOT EXISTS, así que es idempotente (correrlo dos veces no rompe).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEBUG_KEY = 'tp-debug-2026-05-22-grilla-fix'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  const hasCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const hasDebug = url.searchParams.get('debug_key') === DEBUG_KEY
  if (!hasCron && !hasDebug) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Supabase JS no expone raw SQL, así que usamos rpc('exec_sql') si existe.
  // Si no, el fallback es chequear con un SELECT y devolver error útil para
  // que Pedro corra el SQL manualmente en Supabase Studio.
  const checkSelect = await service
    .from('marcas')
    .select('grupo_whatsapp_chatid, mention_number, envio_real_habilitado')
    .limit(1)

  if (!checkSelect.error) {
    return NextResponse.json({
      ok: true,
      status: 'already_applied',
      message: 'Migration 015 ya está aplicada (las columnas existen).',
      sample_row: checkSelect.data?.[0] ?? null,
    })
  }

  // Las columnas no existen — devolvemos las instrucciones al usuario.
  // Por seguridad de Supabase free tier no exponemos un endpoint de exec_sql
  // arbitrario. Pedro debe aplicar la migration via Supabase Studio o CLI.
  const sql = `ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS grupo_whatsapp_chatid text,
  ADD COLUMN IF NOT EXISTS mention_number       text,
  ADD COLUMN IF NOT EXISTS envio_real_habilitado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN marcas.grupo_whatsapp_chatid IS
  'chatId directo del grupo WhatsApp del cliente (formato 12036...@g.us).';
COMMENT ON COLUMN marcas.mention_number IS
  'Número a mencionar en el caption real (sin @, formato internacional ej. 51902414745).';
COMMENT ON COLUMN marcas.envio_real_habilitado IS
  'SAFETY LOCK. Cuando false (default), el server action rechaza envíos al cliente real.';`

  return NextResponse.json(
    {
      ok: false,
      status: 'needs_manual_apply',
      message: 'Las columnas no existen. Aplicá esta SQL en Supabase Studio → SQL Editor:',
      sql,
      check_error: checkSelect.error.message,
    },
    { status: 422 },
  )
}
