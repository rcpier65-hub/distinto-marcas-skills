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
    const { data, error } = await service
      .from('marcas')
      .select('slug, nombre, emoji_marca, color_primario_hex')
      .eq('activa', true)
      .order('slug')

    if (error || !data || data.length === 0) return MARCAS_NAV

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
        // Los "pendientes" reales aún no se agregan acá; las históricas mantienen
        // su badge de referencia, las nuevas arrancan en 0 (sin badge).
        pendientes: meta?.pendientes ?? 0,
      }
    })
  } catch {
    return MARCAS_NAV
  }
}
