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
import { enviarPushAMiembros, enviarPushAMiembroId } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

const TIPOS = ['falla', 'pedido', 'consulta'] as const
type Tipo = (typeof TIPOS)[number]
const EMOJI: Record<Tipo, string> = { falla: '🐞', pedido: '💡', consulta: '❓' }
/* Cómo se nombra cada tipo dentro del mensaje ("...resolvimos LA FALLA que..."). */
const FRASE: Record<Tipo, string> = { falla: 'la falla', pedido: 'el pedido', consulta: 'la consulta' }

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
  const texto = (descripcion ?? '').trim()
  if (!texto) return { ok: false, error: 'Escribe qué necesitas o qué falló.' }
  if (texto.length > 2000) return { ok: false, error: 'Demasiado largo (máx. 2000).' }
  const t: Tipo = (TIPOS as readonly string[]).includes(tipo) ? (tipo as Tipo) : 'falla'
  /* Solo URLs de nuestro bucket, máximo 6 capturas. */
  const imgs = (Array.isArray(imagenes) ? imagenes : []).filter((u) => typeof u === 'string' && u.includes('/storage/')).slice(0, 6)
  const me = await currentMember(service, user.id)
  const nombre = me.nombre || user.email?.split('@')[0] || 'Alguien'

  const { data, error } = await service
    .from('soporte_reportes')
    .insert({ team_member_id: me.id, autor_nombre: nombre, tipo: t, descripcion: texto, estado: 'pendiente', imagenes: imgs })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }

  /* Aviso a Erick + directores (Pedro). enviarPushAMiembros siempre incluye
     a los directores, así que con ['erick'] llega a Erick y a Pedro. */
  await enviarPushAMiembros(['erick'], {
    title: `${EMOJI[t]} Nuevo reporte de soporte`,
    body: `${nombre}: ${texto.slice(0, 100)}`,
    url: '/soporte',
    tag: `soporte-nuevo-${data.id}`,
  })

  revalidatePath('/soporte')
  revalidatePath('/inicio')
  return { ok: true }
}

/* Erick lo toma (pasa a "en proceso"). Opcional, para que el autor sepa que
   ya lo están viendo. */
export async function tomarReporte(id: string): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  if (!me.esAdmin) return { ok: false, error: 'Solo Erick/Pedro pueden gestionar reportes.' }
  const { data: r } = await service.from('soporte_reportes').select('team_member_id, descripcion, estado').eq('id', id).maybeSingle()
  const { error } = await service.from('soporte_reportes').update({ estado: 'en_proceso', tomado_at: new Date().toISOString() }).eq('id', id).eq('estado', 'pendiente')
  if (error) return { ok: false, error: error.message }
  /* Avisar al AUTOR que ya lo están viendo (solo si venía pendiente). */
  if (r?.estado === 'pendiente' && r?.team_member_id) {
    await enviarPushAMiembroId(r.team_member_id, {
      title: '👀 Ya estamos viendo tu reporte',
      body: `${me.nombre || 'Erick'} está revisando: ${(r.descripcion ?? '').slice(0, 80)}`,
      url: '/soporte',
      tag: `soporte-visto-${id}`,
    })
  }
  revalidatePath('/soporte')
  return { ok: true }
}

/* Erick lo resuelve: push al autor + devuelve el mensaje para WhatsApp. */
export async function resolverReporte(id: string, nota?: string): Promise<
  { ok: true; whatsapp: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  if (!me.esAdmin) return { ok: false, error: 'Solo Erick/Pedro pueden resolver.' }

  const { data: r } = await service
    .from('soporte_reportes')
    .select('team_member_id, autor_nombre, tipo, descripcion')
    .eq('id', id)
    .maybeSingle()

  const { error } = await service
    .from('soporte_reportes')
    .update({ estado: 'resuelto', resuelto_at: new Date().toISOString(), resuelto_por: me.id, nota_resolucion: (nota ?? '').trim() || null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  /* Push al AUTOR del reporte (a su celular). */
  if (r?.team_member_id) {
    await enviarPushAMiembroId(r.team_member_id, {
      title: '✅ Tu reporte ya se resolvió',
      body: `${(r.descripcion ?? '').slice(0, 100)}`,
      url: '/soporte',
      tag: `soporte-resuelto-${id}`,
    })
  }

  const t = (r?.tipo ?? 'consulta') as Tipo
  const frase = FRASE[t] ?? 'la consulta'
  const mensaje = `Hola ${r?.autor_nombre ?? ''} 👋\n\nYa resolvimos ${frase} que reportaste:\n"${r?.descripcion ?? ''}"\n\n¡Cualquier otra cosa, avísame! 💙`.trim()

  revalidatePath('/soporte')
  revalidatePath('/inicio')
  return { ok: true, whatsapp: mensaje }
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
