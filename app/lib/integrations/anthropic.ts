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
  // 1) PostgREST (rápido). Puede fallar con 42703 si la columna se creó por SQL
  //    directo y el schema cache de PostgREST está viejo — por eso el fallback #2.
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
    /* seguimos al fallback directo */
  }

  // 2) Conexión directa a Postgres (misma vía por la que Settings GUARDA la key).
  //    Lee contra la base real, sin depender del schema cache de PostgREST.
  //    Además reintenta el reload del cache para que la vía #1 sirva a futuro.
  try {
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
    if (dbUrl) {
      const { Client } = await import('pg')
      const u = new URL(dbUrl)
      const client = new Client({
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        host: u.hostname,
        port: parseInt(u.port || '5432', 10),
        database: u.pathname.replace(/^\//, '') || 'postgres',
        ssl: { rejectUnauthorized: false },
      })
      await client.connect()
      try {
        const r = await client.query('SELECT anthropic_api_key FROM integraciones WHERE id = 1')
        const v = r.rows?.[0]?.anthropic_api_key
        // Empujamos un reload del cache (best-effort) para sanar la vía PostgREST.
        try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* ignora */ }
        if (v) return String(v)
      } finally {
        await client.end()
      }
    }
  } catch {
    /* seguimos al env */
  }

  // 3) Fallback final: variable de entorno.
  return process.env.ANTHROPIC_API_KEY || null
}
