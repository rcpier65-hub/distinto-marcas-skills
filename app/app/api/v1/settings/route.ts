// GET /api/v1/settings
// Preferencias que la web ya muestra, sin secretos: ni token de Metricool,
// ni keys de OpenAI/Anthropic, ni chat ids de WhatsApp.
// Auth: Bearer JWT o dst_live_ con alcance owner. Módulo settings.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { texto, textoOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function filled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedeSettings) return apiJsonError('No tienes acceso a Settings', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [integRes, marcasRes] = await Promise.all([
    service.from('integraciones').select('metricool_user_id, metricool_user_token, openai_api_key, anthropic_api_key').eq('id', 1).maybeSingle(),
    service
      .from('marcas')
      .select('slug, nombre, emoji_marca, activa, logo_url, grupo_whatsapp_nombre, envio_real_habilitado, decisor_nombre, correos_clientes')
      .order('nombre'),
  ])
  let marcasRows = marcasRes.data
  if (marcasRes.error) {
    const fallback = await service.from('marcas').select('slug, nombre, emoji_marca, activa').order('nombre')
    marcasRows = fallback.error ? [] : fallback.data
  }

  let integraciones = {
    metricool_configurado: false,
    openai_configurado: false,
    anthropic_configurado: false,
  }
  if (!integRes.error && integRes.data) {
    const row = integRes.data
    integraciones = {
      metricool_configurado: filled(row.metricool_user_id) || filled(row.metricool_user_token),
      openai_configurado: filled(row.openai_api_key),
      anthropic_configurado: filled(row.anthropic_api_key),
    }
  }

  let marcas: {
    slug: string
    nombre: string
    emoji: string | null
    activa: boolean
    tiene_logo: boolean
    whatsapp_grupo: string | null
    envio_real: boolean
    decisor: string | null
    correos: number
  }[] = []
  if (marcasRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcas = (marcasRows as any[]).map((marca) => ({
      slug: texto(marca.slug),
      nombre: texto(marca.nombre),
      emoji: textoOrNull(marca.emoji_marca),
      activa: marca.activa !== false,
      tiene_logo: filled(marca.logo_url),
      whatsapp_grupo: textoOrNull(marca.grupo_whatsapp_nombre),
      envio_real: marca.envio_real_habilitado === true,
      decisor: textoOrNull(marca.decisor_nombre),
      correos: Array.isArray(marca.correos_clientes) ? marca.correos_clientes.length : 0,
    }))
  }

  return NextResponse.json({
    ok: true,
    cuenta: {
      email: member.email,
      nombre: member.nombre,
      rol: member.rol,
    },
    integraciones,
    total: marcas.length,
    marcas,
    link: `${appBase()}/settings`,
  })
}
