// app/lib/cliente/get-cliente.ts
// Helper server-only: ¿el usuario logueado es un CLIENTE de una marca?
// Si lo es, devolvemos su marca; el ruteo lo manda a /cliente (portal) en vez
// del sistema interno del equipo.

import { cache } from 'react'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

export type ClienteActual = {
  marcaId: string
  marcaSlug: string
  marcaNombre: string
  marcaEmoji: string | null
  marcaColor: string
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
    .select('marca_id, nombre, email, marca:marcas(slug, nombre, emoji_marca, color_primario_hex)')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null
  const m = Array.isArray(data.marca) ? data.marca[0] : data.marca
  return {
    marcaId: data.marca_id,
    marcaSlug: (m?.slug ?? '') as string,
    marcaNombre: (m?.nombre ?? 'Marca') as string,
    marcaEmoji: (m?.emoji_marca ?? null) as string | null,
    marcaColor: (m?.color_primario_hex ?? '#7170ff') as string,
    nombre: (data.nombre ?? null) as string | null,
    email: (data.email ?? null) as string | null,
  }
})
