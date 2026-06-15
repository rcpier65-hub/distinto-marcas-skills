// app/lib/integrations/anthropic.ts
//
// Resolución de la API key de Anthropic (Claude). Mismo patrón que
// lib/integrations/openai.ts: la key se guarda en integraciones.anthropic_api_key
// (configurable desde /settings) y se lee acá en runtime. Nunca vuelve al cliente.
//
// Se usa para generar copys de publicaciones a partir del guion + voz de marca
// (lib/copys/generar.ts), replicando el flujo que Pedro hacía con Claude en Notion.

import { createServiceClient } from '@/lib/supabase/service'

/**
 * Resuelve la API key de Anthropic. Prioridad:
 *   1. integraciones.anthropic_api_key (configurada desde /settings)
 *   2. process.env.ANTHROPIC_API_KEY (fallback Vercel)
 * Devuelve null si no hay ninguna. Tolera que la columna/tabla no exista aún.
 */
export async function getAnthropicApiKey(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data, error } = await service
      .from('integraciones')
      .select('anthropic_api_key')
      .eq('id', 1)
      .maybeSingle()
    if (!error && data?.anthropic_api_key) return String(data.anthropic_api_key)
  } catch {
    /* tabla/columna puede no existir todavía → caemos al env */
  }
  return process.env.ANTHROPIC_API_KEY || null
}
