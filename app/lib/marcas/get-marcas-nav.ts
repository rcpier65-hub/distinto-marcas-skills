// app/lib/marcas/get-marcas-nav.ts
//
// Fuente ÚNICA de marcas para la navegación global (sidebar + command palette).
// Lee de la tabla `marcas` (base de datos) — así cualquier marca creada desde el
// Dashboard aparece automáticamente en TODOS los espacios, sin tocar código.
//
// Mantiene los "nombres cortos / colores temáticos / industria" lindos de las
// marcas históricas como METADATA opcional (de mock-marcas), pero la LISTA de
// marcas viene siempre de la base. Marcas nuevas usan su nombre + color reales.

import { createServiceClient } from '@/lib/supabase/service'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'

// Mapa slug → metadata bonita (override opcional) de las marcas históricas.
const META_BY_SLUG: Record<string, MarcaNav> = Object.fromEntries(
  MARCAS_NAV.map((m) => [m.slug, m]),
)

/**
 * Devuelve las marcas activas en formato MarcaNav, listas para el sidebar y el
 * command palette. Defensivo: si la base falla o no devuelve nada, cae a la
 * lista fija (MARCAS_NAV) para que el menú nunca quede vacío.
 */
export async function getMarcasNav(): Promise<MarcaNav[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    /* influencers_activo puede no existir aún (columna auto-creada al activar
       el módulo por primera vez) — retry defensivo sin ella. */
    let res = await service
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, color_primario_hex, influencers_activo')
      .eq('activa', true)
      .order('slug')
    if (res.error && /influencers_activo/i.test(res.error.message ?? '')) {
      res = await service
        .from('marcas')
        .select('id, slug, nombre, emoji_marca, color_primario_hex')
        .eq('activa', true)
        .order('slug')
    }
    const { data, error } = res

    if (error || !data || data.length === 0) return MARCAS_NAV

    // Pendientes REALES del inbox: contamos las filas de comentarios_inbox
    // con status='pending' agrupadas por marca. Antes el badge usaba números
    // de mock (de ahí el "73" fantasma que no coincidía con el inbox vacío).
    // Fix Pedro 15-jun-2026: "el inbox dice 73 y no hay nada, debe estar
    // conectado". Defensivo: si la query falla, todos arrancan en 0 (no mock).
    const pendientesPorMarca = await contarPendientesPorMarca(service)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((m): MarcaNav => {
      const meta = META_BY_SLUG[m.slug]
      return {
        slug: m.slug,
        nombre: m.nombre,
        // Nombre corto: si es marca histórica, usa el lindo; si es nueva, el nombre real.
        nombreCorto: meta?.nombreCorto ?? m.nombre,
        emoji: m.emoji_marca ?? meta?.emoji ?? '🏷️',
        // Color: marca histórica conserva su CSS var temática; marca nueva usa su hex.
        color: meta?.color ?? m.color_primario_hex ?? '#ba41f7',
        industria: meta?.industria ?? 'Marca',
        // Pendientes REALES (status='pending' en comentarios_inbox). 0 = sin badge.
        pendientes: pendientesPorMarca[m.id] ?? 0,
        id: m.id,
        /* Influencers: activo si la columna lo dice; si la columna no existe
           o está NULL, el default histórico es solo TypHouse (little-joe). */
        influencersActivo: m.influencers_activo ?? m.slug === 'little-joe',
      }
    })
  } catch {
    return MARCAS_NAV
  }
}

/**
 * Cuenta comentarios con status='pending' por marca_id. Una sola query (solo
 * trae las filas pendientes, que normalmente son pocas) y agrupamos en JS.
 * Si la tabla no existe o la query falla, devolvemos {} → todos 0 (sin badge).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function contarPendientesPorMarca(service: any): Promise<Record<string, number>> {
  try {
    const { data, error } = await service
      .from('comentarios_inbox')
      .select('marca_id')
      .eq('status', 'pending')
    if (error || !data) return {}
    const counts: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of data as any[]) {
      const id = row.marca_id
      if (!id) continue
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}
