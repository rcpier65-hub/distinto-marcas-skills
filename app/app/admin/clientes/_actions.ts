// app/app/admin/clientes/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

/* Pueden gestionar accesos de cliente: el director (Pedro) y Erick (Pedro pidió
   que Erick se encargue). NO cualquier admin (jimena queda fuera a propósito). */
async function puedeGestionarClientes(): Promise<boolean> {
  const permisos = await getCurrentMemberPermisos()
  if (!permisos) return false
  return permisos.member.rol_base === 'director' || permisos.member.nombre === 'Erick'
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
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso para crear accesos de cliente' }

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

/* Cambiar el NOMBRE del contacto del cliente (lo que aparece como
   "Hola, {nombre} 👋" en su portal). Lo puede hacer Erick o el director.
   Pedro 14-jul-2026. */
export async function actualizarNombreCliente(id: string, nombre: string): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }
  const nuevo = (nombre ?? '').trim()
  if (!nuevo) return { ok: false, error: 'El nombre no puede estar vacío' }
  if (nuevo.length > 80) return { ok: false, error: 'El nombre es demasiado largo' }
  const service = createServiceClient() as Service
  const { error } = await service.from('marca_clientes').update({ nombre: nuevo }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/clientes')
  revalidatePath('/cliente')
  return { ok: true }
}

export async function eliminarAccesoCliente(id: string): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }
  const service = createServiceClient() as Service
  const { data: row } = await service.from('marca_clientes').select('auth_user_id').eq('id', id).maybeSingle()
  await service.from('marca_clientes').delete().eq('id', id)
  if (row?.auth_user_id) { try { await service.auth.admin.deleteUser(row.auth_user_id) } catch { /* noop */ } }
  revalidatePath('/admin/clientes')
  return { ok: true }
}
