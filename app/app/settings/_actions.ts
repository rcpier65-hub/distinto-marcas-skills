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
import {
  testMetricoolConnection,
  invalidateMetricoolCredsCache,
} from '@/lib/integrations/metricool'
import { getOpenAIApiKey } from '@/lib/integrations/openai'

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

// ============================================================
// Integraciones — tabla singleton (Migration 020)
// ============================================================

/**
 * Lee config de integraciones. Tokens se devuelven MASKED al cliente
 * (••••••••) — el server los usa internamente pero nunca los expone
 * al browser. Si tiene valor, devolvemos `has_value: true` para que la UI
 * sepa si mostrar "configurado" o "sin configurar".
 */
export async function getIntegracionesConfig(): Promise<{
  ok: true
  config: {
    metricool_user_id: string  // safe to show — es un número público
    metricool_has_token: boolean  // never expose el token
    metricool_user_id_set: boolean
    openai_has_key: boolean       // never expose la key — solo si está puesta
    updated_at: string | null
  }
} | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // SELECT * para tolerar que la columna openai_api_key aún no exista
  // (se crea sola en el primer guardado de la key).
  const { data, error } = await service
    .from('integraciones')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    if ((error.message ?? '').includes('does not exist')) {
      return {
        ok: true,
        config: {
          metricool_user_id: '',
          metricool_has_token: false,
          metricool_user_id_set: false,
          openai_has_key: false,
          updated_at: null,
        },
      }
    }
    return { ok: false, error: error.message }
  }
  return {
    ok: true,
    config: {
      metricool_user_id: data?.metricool_user_id ?? '',
      metricool_has_token: !!data?.metricool_user_token,
      metricool_user_id_set: !!data?.metricool_user_id,
      openai_has_key: !!data?.openai_api_key,
      updated_at: data?.updated_at ?? null,
    },
  }
}

// ============================================================
// OpenAI — API key configurable desde Settings (IA)
// ============================================================

/**
 * Crea la columna integraciones.openai_api_key si no existe, con una conexión
 * pg directa usando SUPABASE_DB_URL (válida en el runtime de Vercel). Self-
 * healing: evita tener que aplicar la migración a mano.
 */
async function ensureOpenAIColumn(): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
  if (!dbUrl) throw new Error('SUPABASE_DB_URL no disponible en el runtime')
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
    await client.query('ALTER TABLE integraciones ADD COLUMN IF NOT EXISTS openai_api_key text')
  } finally {
    await client.end()
  }
}

/**
 * Guarda (o borra) la API key de OpenAI en integraciones. Si la columna no
 * existe todavía, la crea al vuelo y reintenta. La key NUNCA vuelve al cliente.
 *
 * @param key  la key (sk-...). Vacío = borrar la key guardada.
 */
export async function updateOpenAIKey(
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const value = key.trim() || null
  if (value && !value.startsWith('sk-')) {
    return { ok: false, error: 'La key de OpenAI debe empezar con "sk-". Revisa que la copiaste completa.' }
  }

  const doUpdate = () =>
    service.from('integraciones').update({ openai_api_key: value, updated_by_user_id: user.id }).eq('id', 1)

  let { error } = await doUpdate()
  // Columna inexistente (42703 / mensaje "column") → crearla y reintentar.
  if (error && (error.code === '42703' || /openai_api_key|column/i.test(error.message ?? ''))) {
    try {
      await ensureOpenAIColumn()
    } catch (e) {
      return { ok: false, error: `No pude crear la columna openai_api_key: ${(e as Error).message}` }
    }
    ;({ error } = await doUpdate())
  }
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}

/**
 * Prueba la API key de OpenAI con una llamada mínima (1 token). Confirma que la
 * key es válida y tiene saldo.
 */
export async function probarOpenAI(): Promise<
  { ok: true; modelo: string } | { ok: false; error: string }
> {
  await requireUser()
  const apiKey = await getOpenAIApiKey()
  if (!apiKey) return { ok: false, error: 'No hay API key configurada todavía.' }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) return { ok: true, modelo: 'gpt-4o-mini' }
    const body = await res.json().catch(() => null)
    if (res.status === 401) return { ok: false, error: 'Key inválida (401). Revisa que la copiaste bien.' }
    if (res.status === 429) return { ok: false, error: 'Sin saldo o límite alcanzado (429). Carga crédito en OpenAI.' }
    return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: `Error de red: ${(e as Error).message}` }
  }
}

/**
 * Actualiza metricool_user_id + metricool_user_token (ambos opcional).
 * Si token viene vacío y ya había uno, NO se borra (preserva el existente
 * — la UI manda token sólo si Pedro lo está cambiando).
 */
export async function updateMetricoolConfig(args: {
  metricool_user_id?: string
  metricool_user_token?: string  // si undefined, no cambiar; si '', borrar
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { updated_by_user_id: user.id }
  if (args.metricool_user_id !== undefined) {
    payload.metricool_user_id = args.metricool_user_id.trim() || null
  }
  if (args.metricool_user_token !== undefined) {
    payload.metricool_user_token = args.metricool_user_token.trim() || null
  }

  const { error } = await service.from('integraciones').update(payload).eq('id', 1)
  if (error) return { ok: false, error: error.message }

  // Invalidar cache en el cliente metricool — próximo callMetricool() lee BD fresh
  invalidateMetricoolCredsCache()
  revalidatePath('/settings')
  return { ok: true }
}

/**
 * Probar conexión Metricool. Hace un GET /api/v2/brands real para validar
 * que las credenciales funcionan. Útil para botón "Probar conexión" en UI.
 */
export async function probarMetricool(): Promise<
  { ok: true; brandsCount: number; sampleBrand: string } | { ok: false; error: string }
> {
  await requireUser()
  const r = await testMetricoolConnection()
  if (!r.ok) return r
  return { ok: true, brandsCount: r.data.brandsCount, sampleBrand: r.data.sampleBrand }
}

// ============================================================
// MARCA_FACTS — Migration 022 — datos canon por marca
// ============================================================
// Consumidos por la Routine antes de redactar respuestas. Decisión:
// el operador (Pedro) los carga una sola vez por marca en /settings.
// La Routine los lee vía GET /api/v1/marcas/{slug}/facts.

export type MarcaFactsForm = {
  nombre_comercial: string
  web_principal: string
  whatsapp_principal: string
  puntos_venta: string[]         // chips editables
  proximamente: string[]         // chips editables
  productos_datos_json: string   // textarea con JSON crudo (validamos al guardar)
  frases_prohibidas: string[]
  frases_canon: string[]
  notas: string
}

/**
 * Lee facts actuales para hidratar el form. Si no hay row, devuelve defaults.
 */
export async function getMarcaFacts(
  slug: string,
): Promise<{ ok: true; data: MarcaFactsForm; hasFacts: boolean } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca, error: errM } = await service
    .from('marcas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (errM) return { ok: false, error: errM.message }
  if (!marca) return { ok: false, error: `marca '${slug}' no existe` }

  const { data: row } = await service
    .from('marca_facts')
    .select('*')
    .eq('marca_id', marca.id)
    .maybeSingle()

  const hasFacts = row !== null
  return {
    ok: true,
    hasFacts,
    data: {
      nombre_comercial: row?.nombre_comercial ?? '',
      web_principal: row?.web_principal ?? '',
      whatsapp_principal: row?.whatsapp_principal ?? '',
      puntos_venta: row?.puntos_venta ?? [],
      proximamente: row?.proximamente ?? [],
      productos_datos_json: row?.productos_datos
        ? JSON.stringify(row.productos_datos, null, 2)
        : '{}',
      frases_prohibidas: row?.frases_prohibidas ?? [],
      frases_canon: row?.frases_canon ?? [],
      notas: row?.notas ?? '',
    },
  }
}

/**
 * Upsert de marca_facts. Valida que productos_datos_json sea JSON parseable
 * antes de persistir — si está mal, devuelve error sin tocar la BD.
 *
 * Strings vacíos se convierten a NULL (no a "") para queries más limpias
 * del lado de la Routine ("if (facts.web_principal) { ... }").
 */
export async function updateMarcaFacts(
  slug: string,
  form: MarcaFactsForm,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Validar JSON de productos_datos antes de cualquier write
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let productosDatos: Record<string, any> = {}
  try {
    productosDatos = JSON.parse(form.productos_datos_json || '{}')
    if (typeof productosDatos !== 'object' || Array.isArray(productosDatos)) {
      return { ok: false, error: 'productos_datos debe ser un objeto JSON {}' }
    }
  } catch (err) {
    return {
      ok: false,
      error: `JSON inválido en productos_datos: ${(err as Error).message}`,
    }
  }

  // Resolver marca_id
  const { data: marca, error: errM } = await service
    .from('marcas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (errM) return { ok: false, error: errM.message }
  if (!marca) return { ok: false, error: `marca '${slug}' no existe` }

  // Normalizar: trim strings, vacíos → null, arrays con strings vacíos out
  const cleanString = (s: string): string | null => {
    const t = s?.trim()
    return t ? t : null
  }
  const cleanArr = (arr: string[]): string[] =>
    (arr ?? []).map(s => s.trim()).filter(Boolean)

  const payload = {
    marca_id: marca.id,
    nombre_comercial: cleanString(form.nombre_comercial),
    web_principal: cleanString(form.web_principal),
    whatsapp_principal: cleanString(form.whatsapp_principal),
    puntos_venta: cleanArr(form.puntos_venta),
    proximamente: cleanArr(form.proximamente),
    productos_datos: productosDatos,
    frases_prohibidas: cleanArr(form.frases_prohibidas),
    frases_canon: cleanArr(form.frases_canon),
    notas: cleanString(form.notas),
  }

  const { error } = await service
    .from('marca_facts')
    .upsert(payload, { onConflict: 'marca_id' })

  if (error) {
    console.error('[updateMarcaFacts] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/settings')
  return { ok: true }
}
