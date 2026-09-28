// app/app/soporte/_actions.ts
'use server'

/* Módulo "Soporte": el equipo reporta fallas / pedidos / consultas del sistema.
 * - Al CREAR un reporte → push a Erick (y directores) para que lo resuelva.
 * - Al RESOLVER → push al autor + se devuelve el texto para avisar por WhatsApp.
 * Pedro 06-ago-2026: "un lugar donde los usuarios dejen sus pedidos/fallas, me
 * notifique a Erick, y él entre a resolver todo". */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { insertarReporteSoporte } from '@/lib/soporte/crear-reporte'
import { resolverReporteEquipo, tomarReporteEquipo } from '@/lib/soporte/gestionar-reporte'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

async function currentMember(service: Service, authUserId: string): Promise<{ id: string | null; nombre: string; esAdmin: boolean }> {
  const { data } = await service.from('team_members').select('id, nombre, rol_base').eq('auth_user_id', authUserId).maybeSingle()
  return { id: data?.id ?? null, nombre: data?.nombre ?? '', esAdmin: !data || data.rol_base === 'director' }
}

/* Sube una captura al bucket público `soporte` y devuelve la URL. Cada quien
   sube a su carpeta (member_id). Mismo patrón que subirAvatar del perfil. */
export async function subirImagenSoporte(formData: FormData): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No se recibió imagen' }
  if (file.size > 6 * 1024 * 1024) return { ok: false, error: 'La imagen debe pesar menos de 6 MB' }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) return { ok: false, error: 'Usa JPG, PNG, WebP o GIF' }
  const me = await currentMember(service, user.id)
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
  const path = `${me.id ?? 'anon'}/${crypto.randomUUID()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await service.storage.from('soporte').upload(path, buf, { contentType: file.type, upsert: false })
  if (upErr) return { ok: false, error: upErr.message }
  const { data: urlData } = service.storage.from('soporte').getPublicUrl(path)
  const url = urlData?.publicUrl as string | undefined
  if (!url) return { ok: false, error: 'No se pudo obtener la URL' }
  return { ok: true, url }
}

/* Cualquier miembro crea un reporte (con capturas opcionales). */
export async function crearReporte(tipo: string, descripcion: string, imagenes: string[] = []): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  const nombre = me.nombre || user.email?.split('@')[0] || 'Alguien'
  const creado = await insertarReporteSoporte({
    teamMemberId: me.id,
    autorNombre: nombre,
    tipo,
    descripcion,
    imagenes,
  })
  if (!creado.ok) return creado
  return { ok: true }
}

/* Erick lo toma (pasa a "en proceso"). Opcional, para que el autor sepa que
   ya lo están viendo. */
export async function tomarReporte(id: string): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  return tomarReporteEquipo(service, {
    esAdmin: me.esAdmin,
    memberId: me.id,
    memberNombre: me.nombre,
    id,
  })
}

/* Erick lo resuelve: push al autor + devuelve el mensaje para WhatsApp. */
export async function resolverReporte(id: string, nota?: string): Promise<
  { ok: true; whatsapp: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  return resolverReporteEquipo(service, {
    esAdmin: me.esAdmin,
    memberId: me.id,
    id,
    nota,
  })
}

/* Marca que ya se avisó al usuario (cuando Erick abre WhatsApp desde el botón). */
export async function marcarAvisado(id: string): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  if (!me.esAdmin) return { ok: false, error: 'No autorizado.' }
  const { error } = await service.from('soporte_reportes').update({ avisado_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/soporte')
  return { ok: true }
}
