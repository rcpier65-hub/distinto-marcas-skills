// GET /api/v1/marcas/:slug
//
// Branding + datos canon (marca_facts) + carpeta de Drive.
// folder_id se parsea de drive_url (/folders/ID o open?id=ID).
// Auth: Bearer JWT o dst_live_ con alcance owner. Respeta marcas_acceso.
// No acepta CRON_SECRET (las rutinas siguen en GET /facts). No incluye tokens.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiJsonError, denyMarcaAcceso, requireSessionMember } from '@/lib/api/session-member'
import { shapeFacts } from '@/lib/api/marca-facts-write'
import { driveFolderId } from '@/lib/integrations/google-drive'
import { colorDeMarca } from '@/lib/marcas/branding'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

type DbErr = { code?: string; message?: string } | null

function missingColumn(error: DbErr, column: string): boolean {
  if (!error) return false
  const message = error.message ?? ''
  return message.includes(column) && (
    error.code === '42703' || error.code === 'PGRST204' || /does not exist|schema cache/i.test(message)
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response

  const { slug } = await params
  if (!slug || !/^[a-z0-9-]{1,80}$/i.test(slug)) {
    return apiJsonError('slug inválido', 400)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const columns = 'id, slug, nombre, emoji_marca, color_primario_hex, logo_url, activa, drive_url'
  let marcaRes = await service.from('marcas').select(columns).eq('slug', slug).maybeSingle()
  if (missingColumn(marcaRes.error, 'drive_url')) {
    marcaRes = await service
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, color_primario_hex, logo_url, activa')
      .eq('slug', slug)
      .maybeSingle()
  }
  if (marcaRes.error) return apiJsonError(marcaRes.error.message, 500)
  if (!marcaRes.data) return apiJsonError(`marca '${slug}' no existe`, 404)

  const marca = marcaRes.data as Record<string, unknown>
  const marcaId = String(marca.id)
  const denied = denyMarcaAcceso(auth.member, marcaId)
  if (denied) return denied

  const { data: facts, error: factsErr } = await service
    .from('marca_facts')
    .select(`
      nombre_comercial, web_principal, whatsapp_principal, puntos_venta, proximamente,
      productos_datos, frases_prohibidas, frases_canon, notas, updated_at
    `)
    .eq('marca_id', marcaId)
    .maybeSingle()
  if (factsErr) return apiJsonError(factsErr.message, 500)

  const nombre = typeof marca.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : slug
  const driveUrl = typeof marca.drive_url === 'string' && marca.drive_url.trim() ? marca.drive_url.trim() : null
  const hasFacts = facts !== null

  return NextResponse.json({
    ok: true,
    has_facts: hasFacts,
    marca: {
      slug: typeof marca.slug === 'string' ? marca.slug : slug,
      nombre,
      emoji: typeof marca.emoji_marca === 'string' ? marca.emoji_marca : null,
      color: colorDeMarca(slug, typeof marca.color_primario_hex === 'string' ? marca.color_primario_hex : null),
      logo_url: typeof marca.logo_url === 'string' ? marca.logo_url : null,
      activa: marca.activa !== false,
      drive: {
        drive_url: driveUrl,
        folder_id: driveFolderId(driveUrl),
      },
    },
    facts: shapeFacts(hasFacts ? facts as Record<string, unknown> : null, nombre),
  })
}
