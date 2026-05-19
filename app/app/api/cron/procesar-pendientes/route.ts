// app/app/api/cron/procesar-pendientes/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsAppToPhone } from '@/lib/integrations/rubi'
import type { GrillaPendienteUpdate, AprobacionInsert } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // segundos (Vercel free permite hasta 60s en route handlers)

const PEDRO_WHATSAPP = '51983852191'

export async function GET(request: Request) {
  // Auth: Vercel cron manda este header automáticamente con el bearer token configurado
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const results = {
    procesadas: [] as string[],
    errores: [] as string[],
  }

  type MarcaRow = { slug: string; nombre: string; emoji_marca: string | null }
  type GrillaRow = {
    id: string
    semana_inicio: string
    semana_fin: string
    pedida_at: string
    marca: MarcaRow | MarcaRow[] | null
  }

  // 1. Buscar grillas en estado pendiente
  const { data: grillasRaw, error } = await supabase
    .from('grillas_pendientes')
    .select(`
      id, semana_inicio, semana_fin, pedida_at,
      marca:marcas(slug, nombre, emoji_marca)
    `)
    .eq('estado', 'pendiente')
    .order('pedida_at', { ascending: true })
    .limit(10)

  const grillas = grillasRaw as GrillaRow[] | null

  if (error) {
    console.error('[cron] Supabase query error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!grillas || grillas.length === 0) {
    return NextResponse.json({
      ok: true,
      procesadas: 0,
      duration_ms: Date.now() - startTime,
    })
  }

  // 2. Procesar cada grilla
  for (const g of grillas) {
    const marca = Array.isArray(g.marca) ? g.marca[0] : g.marca
    if (!marca) {
      results.errores.push(`${g.id}: sin marca relacionada`)
      continue
    }

    // 2a. Marcar como procesando
    const updateProcesando: GrillaPendienteUpdate = { estado: 'procesando', procesada_at: new Date().toISOString() }
    await supabase
      .from('grillas_pendientes')
      .update(updateProcesando)
      .eq('id', g.id)

    // 2b. Construir mensaje
    const text = [
      `${marca.emoji_marca ?? '📊'} *Grilla pendiente — ${marca.nombre}*`,
      `Semana ${g.semana_inicio} → ${g.semana_fin}`,
      ``,
      `Pedida hace ${minutosAtras(g.pedida_at)} minutos.`,
      ``,
      `_Por ahora solo notificación. PNG + envío automático al cliente en Plan 4._`,
      ``,
      `Dashboard: https://distinto-app.vercel.app/marca/${marca.slug}`,
    ].join('\n')

    // 2c. Enviar a Pedro
    const sendResult = await sendWhatsAppToPhone(PEDRO_WHATSAPP, text)

    if (sendResult.ok) {
      // 2d. Marcar como esperando_aprobacion
      const updateEsperando: GrillaPendienteUpdate = { estado: 'esperando_aprobacion' }
      await supabase
        .from('grillas_pendientes')
        .update(updateEsperando)
        .eq('id', g.id)

      // 2e. Log en aprobaciones
      const aprobacionLog: AprobacionInsert = {
        grilla_id: g.id,
        accion: 'solicitar',
        via: 'api',
        comentario: 'Notificación enviada a Pedro DM',
      }
      await supabase.from('aprobaciones').insert(aprobacionLog)

      results.procesadas.push(`${marca.slug}`)
    } else {
      // Revert al estado pendiente si falla envío
      const updateRevert: GrillaPendienteUpdate = { estado: 'pendiente', error: sendResult.error ?? null }
      await supabase
        .from('grillas_pendientes')
        .update(updateRevert)
        .eq('id', g.id)

      results.errores.push(`${marca.slug}: ${sendResult.error}`)
    }
  }

  return NextResponse.json({
    ok: true,
    procesadas: results.procesadas.length,
    marcas: results.procesadas,
    errores: results.errores,
    duration_ms: Date.now() - startTime,
  })
}

function minutosAtras(timestamp: string): number {
  const diff = Date.now() - new Date(timestamp).getTime()
  return Math.round(diff / 60000)
}
