// app/app/checklist-video/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { CHECKLIST_KEYS } from '@/lib/checklist-video/guia'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

/* Fecha "hoy" en Lima como Date en UTC-midnight (para sumar días sin drift). */
function hoyLimaUTC(): Date {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function miTeamMemberId(service: Service, authUserId: string): Promise<string | null> {
  const { data } = await service.from('team_members').select('id').eq('auth_user_id', authUserId).maybeSingle()
  return data?.id ?? null
}

/* Crea la agenda de un video: "hoy grabé X, tengo que editar". Arranca en
   'por_editar'. cuenta = marca donde se publicará (default Distinto Agencia). */
export async function crearVideoErick(args: { titulo: string; cuentaSlug?: string }): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const titulo = (args.titulo ?? '').trim()
  if (!titulo) return { ok: false, error: 'Ponle un título al video' }
  const memberId = await miTeamMemberId(service, user.id)
  const { data, error } = await service
    .from('videos_erick')
    .insert({
      team_member_id: memberId,
      created_by: memberId,
      titulo,
      cuenta_slug: args.cuentaSlug || 'distinto-agencia',
      estado: 'por_editar',
      checklist: {},
      fecha_grabado: ymd(hoyLimaUTC()),
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/checklist-video')
  return { ok: true, data: { id: data.id as string } }
}

/* Mueve entre 'por_editar' ↔ 'editado' (no toca la checklist ni la aprobación). */
export async function marcarVideoEstado(id: string, estado: 'por_editar' | 'editado'): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const { error } = await service.from('videos_erick').update({ estado }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/checklist-video')
  return { ok: true }
}

/* Guarda la checklist COMPLETA (el cliente manda el objeto entero, que es la
   fuente de verdad). Evita la carrera de leer-modificar-escribir el jsonb.
   Solo se persisten las claves válidas en true. */
export async function guardarChecklist(id: string, checklist: Record<string, boolean>): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const limpio: Record<string, boolean> = {}
  for (const k of CHECKLIST_KEYS) if (checklist?.[k]) limpio[k] = true
  const { error } = await service.from('videos_erick').update({ checklist: limpio }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/checklist-video')
  return { ok: true }
}

/* APROBAR: solo si los 12 puntos están ✓. Agenda en la fecha que Erick elige
   y crea la publicacion en la grilla de la cuenta (marca) del video. */
export async function aprobarVideo(id: string, checklist: Record<string, boolean>, fecha: string): Promise<Result<{ fecha: string; publicacionId: string }>> {
  const user = await requireUser()
  const service = createServiceClient() as Service

  // Fecha de publicación elegida por Erick en el calendario.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) return { ok: false, error: 'Elige la fecha de publicación en el calendario' }

  // La checklist que manda el cliente es la fuente de verdad: se valida y se
  // guarda junto con la aprobación (así no depende de si cada toggle alcanzó a
  // persistir). Solo claves válidas en true.
  const limpio: Record<string, boolean> = {}
  for (const k of CHECKLIST_KEYS) if (checklist?.[k]) limpio[k] = true
  const faltan = CHECKLIST_KEYS.filter((k) => !limpio[k])
  if (faltan.length > 0) return { ok: false, error: `Faltan ${faltan.length} requisitos de la checklist` }

  const { data: v } = await service
    .from('videos_erick')
    .select('titulo, cuenta_slug, publicacion_id, fecha_publicacion')
    .eq('id', id)
    .maybeSingle()
  if (!v) return { ok: false, error: 'Video no encontrado' }

  // Idempotente: si ya se aprobó, devolver lo existente.
  if (v.publicacion_id && v.fecha_publicacion) {
    return { ok: true, data: { fecha: v.fecha_publicacion as string, publicacionId: v.publicacion_id as string } }
  }

  const slug = (v.cuenta_slug as string) || 'distinto-agencia'
  const { data: marca } = await service.from('marcas').select('id').eq('slug', slug).maybeSingle()
  if (!marca) return { ok: false, error: `No existe la cuenta "${slug}"` }

  const { data: pub, error: pubErr } = await service
    .from('publicaciones')
    .insert({
      marca_id: marca.id,
      nombre: (v.titulo as string).slice(0, 300),
      estado: 'programar',
      fecha_publicacion: fecha,
      plataformas: [],
      tipo_contenido: ['Reel'],
      objetivos: [],
      editado: true,
      video_aprobado: true,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()
  if (pubErr) return { ok: false, error: pubErr.message }

  const { error: upErr } = await service
    .from('videos_erick')
    .update({ estado: 'aprobado', checklist: limpio, aprobado_at: new Date().toISOString(), fecha_publicacion: fecha, publicacion_id: pub.id })
    .eq('id', id)
  if (upErr) return { ok: false, error: upErr.message }

  revalidatePath('/checklist-video')
  revalidatePath('/publicaciones')
  return { ok: true, data: { fecha, publicacionId: pub.id as string } }
}

export async function eliminarVideoErick(id: string): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const { error } = await service.from('videos_erick').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/checklist-video')
  return { ok: true }
}
