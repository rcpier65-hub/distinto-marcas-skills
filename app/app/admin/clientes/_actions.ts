// app/app/admin/clientes/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'

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

/* Cambiar el CORREO con el que entra el cliente. Ojo: el correo vive en DOS
   lados — en `marca_clientes` (lo que se ve) y en Supabase Auth (con lo que
   realmente inicia sesión). Hay que cambiar los dos o el cliente se queda sin
   poder entrar. Primero Auth (que es lo que puede fallar por correo repetido) y
   recién ahí la tabla. Pedro 15-jul-2026. */
export async function actualizarEmailCliente(id: string, email: string): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }

  const nuevo = (email ?? '').trim().toLowerCase()
  if (!nuevo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo)) return { ok: false, error: 'Correo inválido' }

  const service = createServiceClient() as Service
  const { data: row } = await service
    .from('marca_clientes')
    .select('auth_user_id, email')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { ok: false, error: 'No encontré ese acceso' }
  if ((row.email ?? '').toLowerCase() === nuevo) return { ok: true } // sin cambios

  // 1) Auth: es lo que usa para iniciar sesión. email_confirm para que pueda
  //    entrar de una, sin correo de confirmación (igual que al crearlo).
  if (row.auth_user_id) {
    const { error: authErr } = await service.auth.admin.updateUserById(row.auth_user_id, {
      email: nuevo,
      email_confirm: true,
    })
    if (authErr) {
      const msg = /already|registered|exists/i.test(authErr.message ?? '')
        ? 'Ese correo ya está usado por otro usuario'
        : authErr.message
      return { ok: false, error: msg }
    }
  }

  // 2) La tabla (lo que se muestra en el panel).
  const { error } = await service.from('marca_clientes').update({ email: nuevo }).eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/clientes')
  revalidatePath('/cliente')
  return { ok: true }
}

/* El EQUIPO (Erick/director) marca una OBSERVACIÓN del cliente como atendida (o
   la vuelve a pendiente). Pedro 15-jul-2026. */
export async function marcarObservacionAtendida(id: string, atendida: boolean): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }
  const service = createServiceClient() as Service
  const { error } = await service.from('marca_observaciones').update({ atendida }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/clientes')
  return { ok: true }
}

/* El EQUIPO agenda una REUNIÓN para una marca. Se guarda y le llega push al
   cliente, que la ve en su portal (apartado Reuniones). Pedro 15-jul-2026. */
export async function crearReunion(input: {
  marcaId: string
  titulo: string
  fechaHora: string // ISO (datetime-local convertido)
  modalidad: 'virtual' | 'presencial'
  lugarEnlace?: string
  notas?: string
}): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }
  const titulo = (input.titulo ?? '').trim()
  if (!titulo) return { ok: false, error: 'Ponle un título a la reunión' }
  const fecha = new Date(input.fechaHora)
  if (isNaN(fecha.getTime())) return { ok: false, error: 'Fecha y hora inválidas' }
  const modalidad = input.modalidad === 'presencial' ? 'presencial' : 'virtual'
  const service = createServiceClient() as Service
  const { error } = await service.from('marca_reuniones').insert({
    marca_id: input.marcaId,
    titulo,
    fecha_hora: fecha.toISOString(),
    modalidad,
    lugar_enlace: (input.lugarEnlace ?? '').trim() || null,
    notas: (input.notas ?? '').trim() || null,
  })
  if (error) return { ok: false, error: error.message }
  await enviarPushAClientesDeMarca(input.marcaId, {
    title: '📅 Nueva reunión agendada',
    body: titulo,
    url: '/cliente?reunion=1',
    tag: `reunion-${input.marcaId}`,
  })
  revalidatePath('/admin/clientes')
  revalidatePath('/cliente')
  return { ok: true }
}

/* El EQUIPO elimina/cancela una reunión agendada. */
export async function eliminarReunion(id: string): Promise<Result> {
  await requireUser()
  if (!(await puedeGestionarClientes())) return { ok: false, error: 'No tienes permiso' }
  const service = createServiceClient() as Service
  const { error } = await service.from('marca_reuniones').delete().eq('id', id)
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
