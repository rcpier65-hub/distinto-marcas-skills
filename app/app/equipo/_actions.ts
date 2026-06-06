// app/app/equipo/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { Permisos, RolPredefinidoId } from '@/lib/team/types'

type ActionResult<T = void> =
  T extends void
    ? { ok: true } | { ok: false; error: string }
    : { ok: true; data: T } | { ok: false; error: string }

/**
 * Actualiza datos de un miembro: info personal, rol base, permisos
 * override, acceso a marcas, cargo personalizado, etc.
 */
export async function actualizarMiembro(
  id: string,
  patch: {
    nombre?: string
    email?: string
    rol_base?: RolPredefinidoId
    cargo_personalizado?: string | null
    fecha_cumpleanos?: string | null
    avatar_url?: string | null
    permisos_override?: Permisos
    marcas_acceso?: string[] | null
    notas?: string | null
    activo?: boolean
  },
): Promise<ActionResult> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = {}
  if (patch.nombre !== undefined) update.nombre = patch.nombre.trim()
  if (patch.email !== undefined) update.email = patch.email.trim().toLowerCase()
  if (patch.rol_base !== undefined) update.rol_base = patch.rol_base
  if (patch.cargo_personalizado !== undefined) update.cargo_personalizado = patch.cargo_personalizado
  if (patch.fecha_cumpleanos !== undefined) update.fecha_cumpleanos = patch.fecha_cumpleanos
  if (patch.avatar_url !== undefined) update.avatar_url = patch.avatar_url
  if (patch.permisos_override !== undefined) update.permisos_override = patch.permisos_override
  if (patch.marcas_acceso !== undefined) update.marcas_acceso = patch.marcas_acceso
  if (patch.notas !== undefined) update.notas = patch.notas
  if (patch.activo !== undefined) update.activo = patch.activo

  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'Sin cambios para guardar' }
  }

  const { error } = await service.from('team_members').update(update).eq('id', id)
  if (error) {
    console.error('[actualizarMiembro]', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/equipo')
  return { ok: true }
}

/**
 * Crea un miembro nuevo SIN auth (queda como "pendiente" hasta que
 * acepta la invitación). Pedro usa esto para prefabricar el miembro
 * y después genera el link de invitación con invitarMiembro.
 */
export async function crearMiembro(args: {
  nombre: string
  email: string
  rol_base: RolPredefinidoId
  cargo_personalizado?: string | null
  marcas_acceso?: string[] | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = args.nombre.trim()
  const email = args.email.trim().toLowerCase()
  if (!nombre || !email) return { ok: false, error: 'Nombre y email son obligatorios' }
  if (!email.includes('@')) return { ok: false, error: 'Email inválido' }

  const { data, error } = await service
    .from('team_members')
    .insert({
      nombre,
      email,
      rol_base: args.rol_base,
      cargo_personalizado: args.cargo_personalizado ?? null,
      marcas_acceso: args.marcas_acceso ?? null,  // null = todas
      activo: true,
      created_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, error: 'Ya existe un miembro activo con ese email' }
    }
    return { ok: false, error: error?.message ?? 'No se pudo crear' }
  }

  revalidatePath('/equipo')
  return { ok: true, id: data.id }
}

/**
 * Genera un link de invitación para un miembro YA creado. Devuelve la
 * URL completa que Pedro le pasa a la persona por WhatsApp / email
 * manual. El miembro hace clic, ingresa al endpoint /aceptar-invitacion
 * y crea su account de Supabase Auth con email + password.
 *
 * Por ahora NO envía email automático — Pedro pidió pasarlo manual.
 * Email automático sería Fase 2.
 */
export async function generarLinkInvitacion(memberId: string): Promise<
  { ok: true; url: string; expiraEn: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Cargamos el miembro para snapshot del rol + permisos en el momento
     de invitar (si Pedro cambia el rol después, el link conserva los
     permisos originales para que el miembro vea lo que se le prometió). */
  const { data: member, error: e1 } = await service
    .from('team_members')
    .select('email, nombre, rol_base, cargo_personalizado, permisos_override, marcas_acceso, activo')
    .eq('id', memberId)
    .maybeSingle()

  if (e1 || !member) return { ok: false, error: 'Miembro no encontrado' }
  if (!member.activo) return { ok: false, error: 'El miembro está desactivado' }

  /* Token: 32 hex chars (16 bytes random). Suficiente entropía para
     que sea unguessable. */
  const token = generarTokenSeguro(32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error: e2 } = await service.from('team_invitations').insert({
    token,
    email: member.email,
    nombre_sugerido: member.nombre,
    rol_base: member.rol_base,
    cargo_personalizado: member.cargo_personalizado,
    permisos_override: member.permisos_override,
    marcas_acceso: member.marcas_acceso,
    used_by_team_member_id: memberId,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  })

  if (e2) {
    console.error('[generarLinkInvitacion]', e2)
    return { ok: false, error: e2.message }
  }

  /* La URL pública se construye con el dominio actual (env var del
     deploy de Vercel) + path estable /aceptar-invitacion?token=XXX */
  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? 'http://localhost:3000'
  const baseFull = base.startsWith('http') ? base : `https://${base}`
  const url = `${baseFull}/aceptar-invitacion?token=${token}`

  return { ok: true, url, expiraEn: expiresAt.toISOString() }
}

/**
 * Resetea la contraseña de un miembro logueado: Supabase Auth genera
 * un email con link de reset (gestionado por Supabase, no por nosotros).
 *
 * Si el miembro aún no tiene auth_user_id (no aceptó invitación), no
 * podemos resetear nada — devolvemos error y sugerimos re-invitar.
 */
export async function resetearPasswordMiembro(memberId: string): Promise<ActionResult> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: member } = await service
    .from('team_members')
    .select('email, auth_user_id')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) return { ok: false, error: 'Miembro no encontrado' }
  if (!member.auth_user_id) {
    return { ok: false, error: 'El miembro no aceptó la invitación todavía — genera un link de invitación en su lugar.' }
  }

  /* Esto requiere usar el Admin API de Supabase Auth (no el cliente
     normal). En este turno lo dejo como TODO — Fase 2.
     Por ahora devolvemos OK para que el botón funcione visualmente
     mostrando un mensaje. */
  return { ok: false, error: 'Funcionalidad disponible en Fase 2 (requiere setup de email service)' }
}

/**
 * Genera un token criptográficamente seguro (no Math.random).
 * Usamos la Web Crypto API que Node soporta nativamente.
 */
function generarTokenSeguro(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}
