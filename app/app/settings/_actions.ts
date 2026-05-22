// app/app/settings/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import {
  listWhatsAppGroups,
  sendWhatsAppWithMentions,
  type WhatsAppGroup,
} from '@/lib/integrations/rubi'

/**
 * Actualiza el logo_url de una marca.
 * Pedro pega aquí la URL pública del logo (Drive, Imgur, CDN).
 * Drive URLs se normalizan automáticamente en el endpoint render-grilla.
 */
export async function updateMarcaLogoUrl(
  slug: string,
  logoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const value = logoUrl.trim() || null
  const { error } = await service
    .from('marcas')
    .update({ logo_url: value })
    .eq('slug', slug)

  if (error) {
    console.error('[updateMarcaLogoUrl] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/settings')
  return { ok: true }
}

// ============================================================
// WhatsApp config por marca (Migration 015)
// ============================================================

export type WhatsappConfig = {
  grupo_whatsapp_chatid: string | null
  grupo_whatsapp_nombre: string | null
  mention_number: string | null
  decisor_tratamiento: string | null
  decisor_nombre: string | null
  envio_real_habilitado: boolean
}

/**
 * Lista los grupos disponibles vía Rubi MCP (live fetch).
 * Decisión UX de Pedro: siempre fresh, sin cache local. Trade-off: +1-2s
 * latencia al cargar Settings, pero garantiza que veas los grupos reales
 * que tiene Rubi (si agregás uno nuevo, aparece sin refresh manual).
 */
export async function listGruposDisponibles(): Promise<
  { ok: true; groups: WhatsAppGroup[] } | { ok: false; error: string }
> {
  await requireUser()
  return listWhatsAppGroups()
}

/**
 * Upsert de la configuración WhatsApp de una marca.
 * Atomic: o se actualiza todo o nada. Si Pedro deja un campo vacío, se
 * persiste como NULL (no como string vacío) para que el server action
 * de envío pueda chequear con `?? fallback`.
 *
 * IMPORTANTE: si envio_real_habilitado=true por primera vez, exige que
 * grupo_whatsapp_chatid Y decisor_nombre estén llenos. No tiene sentido
 * habilitar envío sin esos datos mínimos.
 */
export async function updateMarcaWhatsappConfig(
  slug: string,
  config: Partial<WhatsappConfig>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Validación: si pedís habilitar envío real, los campos mínimos deben estar
  if (config.envio_real_habilitado === true) {
    // Necesitamos chequear contra la BD si los campos vienen omitidos.
    const { data: current } = await service
      .from('marcas')
      .select('grupo_whatsapp_chatid, decisor_nombre')
      .eq('slug', slug)
      .maybeSingle()

    const finalChatId = config.grupo_whatsapp_chatid ?? current?.grupo_whatsapp_chatid
    const finalDecisor = config.decisor_nombre ?? current?.decisor_nombre
    if (!finalChatId || !finalDecisor) {
      return {
        ok: false,
        error: 'Para habilitar envío real necesitás llenar primero: grupo WhatsApp + nombre del decisor.',
      }
    }
  }

  // Normalizar strings vacíos a null para consistencia con BD.
  const payload: Partial<WhatsappConfig> = {}
  if (config.grupo_whatsapp_chatid !== undefined) {
    payload.grupo_whatsapp_chatid = config.grupo_whatsapp_chatid?.trim() || null
  }
  if (config.grupo_whatsapp_nombre !== undefined) {
    payload.grupo_whatsapp_nombre = config.grupo_whatsapp_nombre?.trim() || null
  }
  if (config.mention_number !== undefined) {
    // Stripear todo lo que no sea dígito (Pedro puede pegar "+51 902 414 745")
    const digits = (config.mention_number ?? '').replace(/\D/g, '')
    payload.mention_number = digits || null
  }
  if (config.decisor_tratamiento !== undefined) {
    payload.decisor_tratamiento = config.decisor_tratamiento?.trim() || null
  }
  if (config.decisor_nombre !== undefined) {
    payload.decisor_nombre = config.decisor_nombre?.trim() || null
  }
  if (config.envio_real_habilitado !== undefined) {
    payload.envio_real_habilitado = config.envio_real_habilitado
  }

  const { error } = await service.from('marcas').update(payload).eq('slug', slug)
  if (error) {
    console.error('[updateMarcaWhatsappConfig] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath(`/grilla/${slug}`)
  return { ok: true }
}

/**
 * Envía un mensaje de prueba al grupo configurado de una marca, mencionando
 * al `mention_number` actual. Útil ANTES de habilitar envio_real_habilitado:
 * Pedro confirma que el chatId y la mención son correctos sin riesgo de
 * mandar la grilla completa.
 *
 * Si la marca no tiene chatId configurado, falla. Si no tiene mention_number,
 * manda sin mention (con un disclaimer en el texto).
 */
export async function probarMencionMarca(
  slug: string,
): Promise<{ ok: true; messageId?: string; grupo: string } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca } = await service
    .from('marcas')
    .select('nombre, grupo_whatsapp_chatid, grupo_whatsapp_nombre, mention_number, decisor_tratamiento, decisor_nombre')
    .eq('slug', slug)
    .maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  const chatId = marca.grupo_whatsapp_chatid as string | null
  const groupName = marca.grupo_whatsapp_nombre as string | null
  if (!chatId && !groupName) {
    return { ok: false, error: 'Marca no tiene chatId ni nombre de grupo configurado' }
  }

  const num = marca.mention_number as string | null
  const saludo = marca.decisor_tratamiento && marca.decisor_nombre
    ? `${marca.decisor_tratamiento} ${marca.decisor_nombre}`
    : (marca.decisor_nombre ?? '👋')

  const text = num
    ? `🧪 *Prueba de configuración — ${marca.nombre}*\n\n@${num} Hola ${saludo}, esto es una prueba de conexión desde Distinto App. Si ves este mensaje y la mención está clickeable, la configuración es correcta.\n\n_(Ignorá este mensaje — sin contenido real)_`
    : `🧪 *Prueba de configuración — ${marca.nombre}*\n\nHola ${saludo}, esto es una prueba de conexión desde Distinto App.\n\n_(No hay número de mención configurado — sólo se prueba el chat. Ignorá este mensaje.)_`

  const result = await sendWhatsAppWithMentions({
    ...(chatId ? { chatId } : { group_name: groupName! }),
    text,
    mentions: num ? [num] : ['51983852191'], // fallback mention a Pedro
  })

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, grupo: marca.nombre as string }
}
