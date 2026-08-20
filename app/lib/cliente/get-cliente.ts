// app/lib/cliente/get-cliente.ts
// Helper server-only: ¿el usuario logueado es un CLIENTE de una marca?
// Un cliente puede manejar VARIAS marcas (p.ej. Praktico + Retoz shop, mismo
// login). Devolvemos la marca ACTIVA (elegida por cookie, validada contra las
// suyas) + la lista de todas sus marcas para el switcher del portal.

import { cache } from 'react'
import { cookies } from 'next/headers'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { colorDeMarca, normalizeLogoUrl } from '@/lib/marcas/branding'

/* Una marca a la que el cliente tiene acceso (para el selector "Cambiar de marca"). */
export type MarcaCliente = {
  id: string
  slug: string
  nombre: string
  emoji: string | null
  color: string
  logoUrl: string | null
}

export type ClienteActual = {
  marcaId: string
  marcaSlug: string
  marcaNombre: string
  marcaEmoji: string | null
  marcaColor: string
  marcaLogoUrl: string | null
  driveUrl: string | null
  nombre: string | null
  email: string | null
  /* TODAS las marcas de este login. Si tiene >1, el portal muestra el switcher. */
  marcasDisponibles: MarcaCliente[]
}

export const COOKIE_MARCA_CLIENTE = 'cliente_marca'

export const getClienteActual = cache(async (): Promise<ClienteActual | null> => {
  const user = await getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // TODAS las marcas vinculadas a este login (antes era .maybeSingle() = 1 sola).
  const { data: rows } = await service
    .from('marca_clientes')
    .select('marca_id, nombre, email, marca:marcas(slug, nombre, emoji_marca, color_primario_hex, logo_url, drive_url)')
    .eq('auth_user_id', user.id)
  if (!rows || rows.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (rows as any[]).map((r) => {
    const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
    const slug = (m?.slug ?? '') as string
    return {
      id: r.marca_id as string,
      slug,
      nombre: (m?.nombre ?? 'Marca') as string,
      emoji: (m?.emoji_marca ?? null) as string | null,
      color: colorDeMarca(slug, m?.color_primario_hex),
      logoUrl: normalizeLogoUrl(m?.logo_url as string | null | undefined),
      driveUrl: (m?.drive_url ?? null) as string | null,
      contacto: (r.nombre ?? null) as string | null,
      email: (r.email ?? null) as string | null,
    }
  })
  // Orden estable → default consistente cuando no hay cookie.
  marcas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  /* Marca ACTIVA: la de la cookie SOLO si pertenece a este cliente (seguridad:
     nunca puede activar una marca que no sea suya); si no, la primera. */
  const cookieStore = await cookies()
  const deseada = cookieStore.get(COOKIE_MARCA_CLIENTE)?.value
  const activa = marcas.find((m) => m.id === deseada) ?? marcas[0]

  return {
    marcaId: activa.id,
    marcaSlug: activa.slug,
    marcaNombre: activa.nombre,
    marcaEmoji: activa.emoji,
    marcaColor: activa.color,
    marcaLogoUrl: activa.logoUrl,
    driveUrl: activa.driveUrl,
    nombre: activa.contacto,
    email: activa.email,
    marcasDisponibles: marcas.map((m) => ({
      id: m.id, slug: m.slug, nombre: m.nombre, emoji: m.emoji, color: m.color, logoUrl: m.logoUrl,
    })),
  }
})
