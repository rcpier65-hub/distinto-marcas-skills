// app/app/dashboard/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Convierte un nombre en un slug URL-safe.
 *   "Oral Beauty"  → "oral-beauty"
 *   "Dra. Noemí"   → "dra-noemi"
 * Quita tildes, baja a minúsculas, reemplaza no-alfanuméricos por guiones.
 */
function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos (í → i)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')   // todo lo no alfanumérico → guion
    .replace(/-{2,}/g, '-')        // colapsa guiones repetidos
    .replace(/^-+|-+$/g, '')       // recorta guiones de los extremos
}

/**
 * Crea una marca nueva en la base (fuente única). Al insertarla acá, aparece
 * automáticamente en grabaciones, dashboard, sidebar, command palette y demás
 * espacios que leen de la tabla `marcas`.
 *
 * El objetivo de grabaciones es opcional (default 0 = "graba cuando haya, sin
 * meta fija", como Oral Beauty). Igual la marca tiene todas las opciones.
 */
export async function createMarca(input: {
  nombre: string
  emoji?: string
  color?: string
  objetivo?: number
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = input.nombre?.trim()
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio' }
  if (nombre.length > 80) return { ok: false, error: 'El nombre es demasiado largo (máx. 80)' }

  let slug = slugify(nombre)
  if (!slug) return { ok: false, error: 'No pude generar un identificador del nombre — usa letras o números' }

  // Asegurar slug único: si ya existe "oral-beauty", probar "oral-beauty-2", etc.
  const { data: existing } = await service
    .from('marcas')
    .select('slug')
    .like('slug', `${slug}%`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taken = new Set((existing ?? []).map((r: any) => r.slug as string))
  if (taken.has(slug)) {
    let i = 2
    while (taken.has(`${slug}-${i}`)) i++
    slug = `${slug}-${i}`
  }

  // Objetivo mensual: entero entre 0 y 100. 0 = sin meta fija.
  const objetivo = Math.max(0, Math.min(100, Math.round(input.objetivo ?? 0)))

  const { error } = await service.from('marcas').insert({
    slug,
    nombre,
    emoji_marca: input.emoji?.trim() || '🏷️',
    color_primario_hex: input.color || '#ba41f7',
    grabaciones_objetivo_mensual: objetivo,
    activa: true,
  })
  if (error) return { ok: false, error: error.message }

  // Refrescar el dashboard, grabaciones y — clave — el LAYOUT raíz, que es quien
  // alimenta el sidebar/command palette en TODAS las rutas.
  revalidatePath('/dashboard')
  revalidatePath('/grabaciones')
  revalidatePath('/', 'layout')

  return { ok: true, slug }
}
