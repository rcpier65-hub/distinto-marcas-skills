// app/app/admin/clientes/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

async function soloDirector(): Promise<boolean> {
  const permisos = await getCurrentMemberPermisos()
  return !!permisos && permisos.member.rol_base === 'director'
}

/* Crea el ACCESO de un cliente para una marca. Lo opera Pedro (director) desde
   la app: escribe el correo y la contraseña ACÁ (no en el chat). La app crea el
   usuario de Supabase Auth y lo vincula a la marca. */
export async function crearAccesoCliente(input: {
  marcaSlug: string
  email: string
  password: string
  nombre: string
}): Promise<Result> {
  await requireUser()
  if (!(await soloDirector())) return { ok: false, error: 'Solo el admin puede crear accesos de cliente' }

  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''
  const marcaSlug = (input.marcaSlug ?? '').trim()
  if (!email || !email.includes('@')) return { ok: false, error: 'Correo inválido' }
  if (password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' }
  if (!marcaSlug) return { ok: false, error: 'Elige la marca' }

  const service = createServiceClient() as Service

  const { data: marca } = await service.from('marcas').select('id, nombre').eq('slug', marcaSlug).maybeSingle()
  if (!marca) return { ok: false, error: `Marca "${marcaSlug}" no encontrada` }

  // Crear el usuario de Auth (email ya confirmado para que pueda entrar directo).
  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tipo: 'cliente', marca: marcaSlug },
  })
  if (authErr || !created?.user) {
    return { ok: false, error: authErr?.message ?? 'No se pudo crear el usuario' }
  }

  const { error: linkErr } = await service.from('marca_clientes').insert({
    auth_user_id: created.user.id,
    marca_id: marca.id,
    nombre: (input.nombre ?? '').trim() || marca.nombre,
    email,
  })
  if (linkErr) {
    // Si falla el vínculo, borramos el usuario recién creado para no dejar basura.
    try { await service.auth.admin.deleteUser(created.user.id) } catch { /* noop */ }
    return { ok: false, error: linkErr.message }
  }

  revalidatePath('/admin/clientes')
  return { ok: true }
}

export async function eliminarAccesoCliente(id: string): Promise<Result> {
  await requireUser()
  if (!(await soloDirector())) return { ok: false, error: 'Solo el admin' }
  const service = createServiceClient() as Service
  const { data: row } = await service.from('marca_clientes').select('auth_user_id').eq('id', id).maybeSingle()
  await service.from('marca_clientes').delete().eq('id', id)
  if (row?.auth_user_id) { try { await service.auth.admin.deleteUser(row.auth_user_id) } catch { /* noop */ } }
  revalidatePath('/admin/clientes')
  return { ok: true }
}
