// app/app/equipo/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { Permisos, RolPredefinidoId } from '@/lib/team/types'
import { getHabitosParaRol } from '@/lib/team/habitos-por-rol'

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
    fecha_pago?: string | null
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
  if (patch.fecha_pago !== undefined) update.fecha_pago = patch.fecha_pago
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

  /* Clonar hábitos default específicos del rol al miembro recién creado.
     Cada rol tiene su set propio (diseñadora ve hábitos de diseño,
     editor ve hábitos de edición, etc.). Si esto falla, NO bloqueamos
     la creación — el miembro puede crear sus hábitos manualmente. */
  const habitosTemplate = getHabitosParaRol(args.rol_base)
  if (habitosTemplate.length > 0) {
    const habitosInsert = habitosTemplate.map((h) => ({
      nombre: h.nombre,
      icono: h.icono,
      color: h.color,
      dias_activos: h.dias_activos,
      orden: h.orden,
      activo: true,
      team_member_id: data.id,
    }))
    const { error: errHab } = await service.from('habitos').insert(habitosInsert)
    if (errHab) {
      console.error(`[crearMiembro] No se pudieron clonar hábitos de "${args.rol_base}":`, errHab.message)
    }
  }

  revalidatePath('/equipo')
  revalidatePath('/habitos')
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
 * Asigna o cambia la contraseña de un miembro. Pedro pidió tener
 * control total — tú asignas la contraseña, se guarda en
 * `password_inicial` (visible solo en /equipo para que la puedas
 * copiar y pasar al miembro por WhatsApp), Y se sincroniza con
 * Supabase Auth para que el login funcione.
 *
 * Flow:
 *   1. Si el miembro NO tiene auth_user_id → crea cuenta en Supabase
 *      Auth con email + password (email_confirm=true así no requiere
 *      verificación) y setea auth_user_id en team_members.
 *   2. Si YA tiene auth_user_id → updateUserById con la nueva pass.
 *   3. Guarda la pass en `password_inicial` para que la veas.
 */
export async function setPasswordMiembro(
  memberId: string,
  password: string,
): Promise<ActionResult> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!password || password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const { data: member, error: e1 } = await service
    .from('team_members')
    .select('id, email, nombre, auth_user_id, activo')
    .eq('id', memberId)
    .maybeSingle()

  if (e1 || !member) return { ok: false, error: 'Miembro no encontrado' }
  if (!member.activo) return { ok: false, error: 'El miembro está desactivado' }
  if (!member.email || !member.email.includes('@')) {
    return { ok: false, error: 'El miembro necesita un email válido (tab Información)' }
  }

  let authUserId = member.auth_user_id

  if (!authUserId) {
    /* CREAR cuenta nueva en Supabase Auth */
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: member.email,
      password,
      email_confirm: true,  /* lo damos por verificado — Pedro controla */
      user_metadata: { nombre: member.nombre, team_member_id: memberId },
    })
    if (createErr || !created?.user) {
      /* Si el email ya existe en auth.users (por otro flow), tratamos
         de updatear esa cuenta directamente. */
      if (/already.*registered|already.*exists/i.test(createErr?.message ?? '')) {
        const { data: list } = await service.auth.admin.listUsers()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = (list?.users ?? []).find((u: any) => u.email?.toLowerCase() === member.email.toLowerCase())
        if (existing) {
          authUserId = existing.id
          await service.auth.admin.updateUserById(existing.id, { password })
        } else {
          return { ok: false, error: createErr?.message ?? 'No se pudo crear el usuario' }
        }
      } else {
        return { ok: false, error: createErr?.message ?? 'No se pudo crear el usuario' }
      }
    } else {
      authUserId = created.user.id
    }
  } else {
    /* ACTUALIZAR password de cuenta existente */
    const { error: updErr } = await service.auth.admin.updateUserById(authUserId, { password })
    if (updErr) return { ok: false, error: updErr.message }
  }

  /* Persistir en team_members: auth_user_id (si era null) + password
     inicial visible. */
  const { error: e2 } = await service
    .from('team_members')
    .update({ auth_user_id: authUserId, password_inicial: password })
    .eq('id', memberId)

  if (e2) {
    console.error('[setPasswordMiembro] persist:', e2)
    return { ok: false, error: e2.message }
  }

  revalidatePath('/equipo')
  return { ok: true }
}

/**
 * Alias mantenido por compatibilidad con la UI existente (botón
 * "Resetear password" en el tab Seguridad). Ahora simplemente delega
 * a setPasswordMiembro con un password random generado.
 */
export async function resetearPasswordMiembro(memberId: string): Promise<
  { ok: true; nuevaPassword: string } | { ok: false; error: string }
> {
  const nueva = generarPasswordSimple()
  const r = await setPasswordMiembro(memberId, nueva)
  if (!r.ok) return r
  return { ok: true, nuevaPassword: nueva }
}

/**
 * Genera una contraseña pronunciable de 12 chars — fácil de leer al
 * teléfono pero con buena entropía. Alfanumérica con mayúsculas y
 * minúsculas, sin símbolos raros.
 */
function generarPasswordSimple(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  /* Quitamos l/I/1/0/O para evitar confusión al pronunciar. */
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => chars[b % chars.length]).join('')
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
