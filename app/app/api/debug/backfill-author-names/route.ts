// app/app/api/debug/backfill-author-names/route.ts
//
// One-shot endpoint para backfill de author_display_name + author_avatar_url
// en comentarios_inbox que se ingresaron ANTES de migration 024.
//
// Re-llama a Metricool por las 8 marcas x 3 redes, usa el wrapper
// actualizado mapRawToComment (que ya extrae name/photo de participants[]),
// y actualiza la columna author_display_name por metricool_comment_id.
//
// Uso:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://distinto-app.vercel.app/api/debug/backfill-author-names"

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { listComentarios } from '@/lib/integrations/metricool'
import type { ComentarioNetwork } from '@/lib/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NETWORKS: ComentarioNetwork[] = ['instagram', 'facebook', 'tiktok']

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Listar marcas activas con metricool_blog_id
  const { data: marcas, error } = await service
    .from('marcas')
    .select('id, slug, metricool_blog_id')
    .eq('activa', true)
    .not('metricool_blog_id', 'is', null)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const summary = {
    marcas_procesadas: 0,
    rows_actualizadas: 0,
    errores: [] as string[],
  }

  // 2. Por cada marca x red, re-fetch y update por metricool_comment_id
  for (const m of marcas ?? []) {
    summary.marcas_procesadas += 1
    for (const network of NETWORKS) {
      const r = await listComentarios({ blogId: m.metricool_blog_id, network, limit: 100 })
      if (!r.ok) {
        summary.errores.push(`${m.slug}/${network}: ${r.error.slice(0, 100)}`)
        continue
      }
      for (const c of r.data) {
        // Solo actualizar si tenemos data nueva. Skip si display_name es null
        // (significa que el comentario no tiene autor identificado — raro pero
        // posible en algunos casos edge de FB).
        if (!c.authorDisplayName && !c.authorAvatarUrl) continue
        const { error: upErr } = await service
          .from('comentarios_inbox')
          .update({
            author_display_name: c.authorDisplayName,
            author_avatar_url: c.authorAvatarUrl,
          })
          .eq('metricool_comment_id', c.id)
          .eq('network', network)
        if (upErr) {
          summary.errores.push(`update ${c.id}: ${upErr.message}`)
        } else {
          summary.rows_actualizadas += 1
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary })
}
