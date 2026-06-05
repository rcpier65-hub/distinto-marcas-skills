// app/app/publicaciones/_actions.ts
// Actions globales para /publicaciones (crear + duplicar).
// Las actions específicas de [id] viven en /publicaciones/[id]/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { EstadoPublicacion } from '@/lib/types/database'

/**
 * Cambia el estado de una publicación (workflow). Optimizado para Kanban drag-and-drop.
 * Devuelve Result en vez de throw — el cliente hace optimistic update y rollback si falla.
 */
export async function cambiarEstadoPublicacion(
  id: string,
  nuevoEstado: EstadoPublicacion,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ estado: nuevoEstado, updated_by: user.id })
    .eq('id', id)

  if (error) {
    console.error('[cambiarEstadoPublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/publicaciones/kanban')
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

type CreatePublicacionInput = {
  marca_id: string
  nombre: string
  fecha_publicacion?: string | null
}

/**
 * Crea una nueva publicación con defaults sensibles.
 * No usar dentro de un form HTML (no devuelve Result) — usar con useTransition.
 * Hace redirect inmediato a /publicaciones/[id] para que el user complete el resto.
 */
export async function createPublicacion(input: CreatePublicacionInput): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!input.nombre?.trim()) throw new Error('El nombre es obligatorio')
  if (!input.marca_id) throw new Error('La marca es obligatoria')

  const { data, error } = await service
    .from('publicaciones')
    .insert({
      marca_id: input.marca_id,
      nombre: input.nombre.trim(),
      fecha_publicacion: input.fecha_publicacion ?? null,
      estado: 'tareas',
      plataformas: [],
      tipo_contenido: [],
      objetivos: [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPublicacion] error:', error)
    throw new Error(`No se pudo crear: ${error.message}`)
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')

  // Redirect al detail para que llene el resto (plataformas, tipo, copy, etc.)
  redirect(`/publicaciones/${data.id}`)
}

/**
 * Wrapper para HTML <form action={...}>. Lee FormData y delega a createPublicacion.
 * Lanza si falta marca o nombre — el form HTML debe tener required en ambos.
 */
export async function createPublicacionFromForm(formData: FormData): Promise<void> {
  const marca_id = String(formData.get('marca_id') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const fecha = String(formData.get('fecha_publicacion') ?? '').trim()
  await createPublicacion({
    marca_id,
    nombre,
    fecha_publicacion: fecha || null,
  })
}

/**
 * Duplica una publicación existente.
 * Estrategia: copia todos los campos editoriales (copy, guion, plataformas, tipo, etc.)
 * pero RESETEA: fecha (null — el user pone la nueva), notion_original_id (null — es nuestra),
 * estado ('tareas' — empieza el workflow desde cero), checklist (todo false), audit fields.
 *
 * Útil para series tipo "PREGUNTA 1 → PREGUNTA 2 → ..." donde el guión y plataformas
 * se reutilizan.
 */
export async function duplicarPublicacion(sourceId: string): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Fetch original
  const { data: original, error: fetchErr } = await service
    .from('publicaciones')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (fetchErr || !original) throw new Error('Publicación original no encontrada')

  // 2. Build copy con resets
  const copyFields = {
    marca_id: original.marca_id,
    nombre: `${original.nombre} (copia)`,
    estado: 'tareas',                  // reset workflow
    fecha_publicacion: null,            // user decide la nueva
    fecha_edicion: null,
    fecha_diseno: null,
    plataformas: original.plataformas,  // reutiliza
    tipo_contenido: original.tipo_contenido,
    objetivos: original.objetivos,
    copy: original.copy,                // reutiliza copy/guion
    guion: original.guion,
    enlace_tomas: null,                 // los enlaces SÍ se resetean (son por pieza)
    enlace_musica: null,
    portada_cruda_url: null,
    portada_editada_url: null,
    copy_listo: false,                  // checklist desde cero
    musica_lista: false,
    portada_lista: false,
    disenado: false,
    editado: false,
    video_aprobado: false,
    editor_nombre: original.editor_nombre,
    notas: original.notas,
    notion_original_id: null,           // es nueva, no de Notion
    notion_url: null,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data: nueva, error: insertErr } = await service
    .from('publicaciones')
    .insert(copyFields)
    .select('id')
    .single()

  if (insertErr || !nueva) throw new Error(`No se pudo duplicar: ${insertErr?.message ?? 'unknown'}`)

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  redirect(`/publicaciones/${nueva.id}`)
}

// ────────────────────────────────────────────────────────────────────────
// SYNC NOTION → PUBLICACIONES (botón "🔄 Sincronizar todo con Notion")
// ────────────────────────────────────────────────────────────────────────

/**
 * Llama al endpoint admin que sincroniza Notion → Supabase para todas
 * las marcas con notion_proyecto_id. Default: mayo + junio 2026.
 *
 * Por qué pasa por el endpoint en vez de hacer todo en la action:
 * - El endpoint ya orquesta paralelo, mapeo de estado, dedup por
 *   notion_original_id. Reusar en lugar de duplicar.
 * - El CRON_SECRET vive en el server y nunca llega al cliente.
 * - Permite trigger desde cron / curl / botón con el mismo path.
 */
export async function sincronizarTodoNotion(opts?: {
  from?: string
  to?: string
}): Promise<
  | {
      ok: true
      totals: {
        fetched: number
        inserted: number
        updated: number
        failed: number
        ok: number
        skipped: number
        errored: number
      }
      duration_ms: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      por_marca: any[]
    }
  | { ok: false; error: string }
> {
  await requireUser()

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app'
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, error: 'CRON_SECRET no configurado en server' }
  }

  const body = {
    from: opts?.from ?? '2026-05-01',
    to: opts?.to ?? '2026-06-30',
  }

  try {
    const res = await fetch(`${appUrl}/api/v1/admin/sync-publicaciones-all`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const json = await res.json()
    /* Error duro: HTTP no-2xx O el endpoint no devolvió `totals`
       (algo realmente roto). En ese caso solo tenemos el error
       message del endpoint o el HTTP status como fallback. */
    if (!res.ok || !json.totals) {
      return {
        ok: false,
        error: json.error ?? `HTTP ${res.status}`,
      }
    }
    /* Si tenemos `totals` pero `ok=false`, son errores PARCIALES:
       algunas marcas fallaron pero otras se sincronizaron. Devolvemos
       ok:true al cliente pero con los counters reales — el cliente ya
       muestra "❌X fallos" en el resumen así que la info no se pierde,
       y NO mostramos un toast rojo genérico que oculta el éxito de las
       demás marcas. El endpoint ahora también incluye `error` legible
       con qué marca falló. */
    revalidatePath('/publicaciones')
    revalidatePath('/publicaciones/tabla')
    revalidatePath('/publicaciones/calendario')
    revalidatePath('/publicaciones/kanban')
    return {
      ok: true,
      totals: json.totals,
      duration_ms: json.duration_ms,
      por_marca: json.por_marca,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch failed',
    }
  }
}
