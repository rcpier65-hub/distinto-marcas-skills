// app/lib/cliente/get-cliente.ts
// Helper server-only: ¿el usuario logueado es un CLIENTE de una marca?
// Si lo es, devolvemos su marca; el ruteo lo manda a /cliente (portal) en vez
// del sistema interno del equipo.

import { cache } from 'react'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { colorDeMarca, normalizeLogoUrl } from '@/lib/marcas/branding'

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
}

export const getClienteActual = cache(async (): Promise<ClienteActual | null> => {
  const user = await getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service
    .from('marca_clientes')
    .select('marca_id, nombre, email, marca:marcas(slug, nombre, emoji_marca, color_primario_hex, logo_url, drive_url)')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null
  const m = Array.isArray(data.marca) ? data.marca[0] : data.marca
  const slug = (m?.slug ?? '') as string
  return {
    marcaId: data.marca_id,
    marcaSlug: slug,
    marcaNombre: (m?.nombre ?? 'Marca') as string,
    marcaEmoji: (m?.emoji_marca ?? null) as string | null,
    // La BD manda, salvo que sea un morado por defecto del sistema → identidad real.
    marcaColor: colorDeMarca(slug, m?.color_primario_hex),
    // Logo que Pedro configura en la sección de marcas (mismo que la grilla).
    marcaLogoUrl: normalizeLogoUrl(m?.logo_url as string | null | undefined),
    driveUrl: (m?.drive_url ?? null) as string | null,
    nombre: (data.nombre ?? null) as string | null,
    email: (data.email ?? null) as string | null,
  }
})
