// app/app/perfil/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Actualiza datos personales del miembro logueado. Solo deja editar
 * los campos que tiene sentido que la persona maneje ella misma:
 * nombre, cargo personalizado, fecha cumpleaños, fecha de pago,
 * avatar. NO permite cambiar email, rol, permisos, ni activo
 * (eso lo gestiona Pedro desde /equipo).
 */
export async function actualizarMiPerfil(patch: {
  nombre?: string
  cargo_personalizado?: string | null
  fecha_cumpleanos?: string | null
  fecha_pago?: string | null
  avatar_url?: string | null
}): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Buscamos el team_member por auth_user_id. Si no hay (admin sin
     perfil) → error claro porque el flujo de "mi perfil" requiere
     team_member. */
  const { data: member } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { ok: false, error: 'No tienes un perfil de equipo asociado todavía' }
  }

  const update: Record<string, unknown> = {}
  if (patch.nombre !== undefined) update.nombre = patch.nombre.trim()
  if (patch.cargo_personalizado !== undefined) update.cargo_personalizado = patch.cargo_personalizado
  if (patch.fecha_cumpleanos !== undefined) update.fecha_cumpleanos = patch.fecha_cumpleanos
  if (patch.fecha_pago !== undefined) update.fecha_pago = patch.fecha_pago
  if (patch.avatar_url !== undefined) update.avatar_url = patch.avatar_url

  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'Sin cambios para guardar' }
  }

  const { error } = await service
    .from('team_members')
    .update(update)
    .eq('id', member.id)

  if (error) {
    console.error('[actualizarMiPerfil]', error)
    return { ok: false, error: error.message }
  }

  /* Revalidar el layout entero — el sidebar lee avatar_url, nombre, etc.
     del usuario logueado y necesita refrescar en todas las páginas. */
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * Sube un avatar al bucket Storage `avatars` y devuelve la URL pública.
 * El archivo va a la ruta `{member_id}/{timestamp}.{ext}` así cada
 * miembro tiene su carpeta y se pueden tener varios uploads sin
 * pisarse (útil si quieres historial; por ahora solo el último importa).
 *
 * Recibe el archivo como FormData del cliente. El componente perfil
 * llama esto y guarda la URL retornada en avatar_url via
 * actualizarMiPerfil.
 */
export async function subirAvatar(formData: FormData): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, error: 'No se recibió ningún archivo' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'La imagen debe pesar menos de 2 MB' }
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Formato no soportado. Usá JPG, PNG, WebP o GIF' }
  }

  /* Resolver member.id para la ruta. */
  const { data: member } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { ok: false, error: 'No tienes un perfil de equipo asociado' }
  }

  /* Path: <member_id>/<timestamp>.<ext>. Usamos crypto.randomUUID en
     lugar de timestamp para evitar colisión si se sube 2 veces el
     mismo segundo. */
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${member.id}/${crypto.randomUUID()}.${ext}`

  /* Convertir File → ArrayBuffer para el upload. */
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await service.storage
    .from('avatars')
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    })

  if (upErr) {
    console.error('[subirAvatar] upload', upErr)
    return { ok: false, error: upErr.message }
  }

  /* Bucket es público → getPublicUrl da URL accesible sin token */
  const { data: urlData } = service.storage.from('avatars').getPublicUrl(path)
  const publicUrl = urlData?.publicUrl as string | undefined

  if (!publicUrl) {
    return { ok: false, error: 'No se pudo obtener la URL pública' }
  }

  return { ok: true, url: publicUrl }
}
