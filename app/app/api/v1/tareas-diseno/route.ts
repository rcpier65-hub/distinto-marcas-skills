// app/app/api/v1/tareas-diseno/route.ts
//
// GET /api/v1/tareas-diseno
//   ?marca=<slug>         (opcional)
//   ?sub_estado=<estado>  (opcional: sin_empezar | en_progreso | listo | pausada)
//
// Tareas de diseño activas (estado='disenar', portada NO lista).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const marca = url.searchParams.get('marca')
  const subEstado = url.searchParams.get('sub_estado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, descripcion, fecha_diseno, fecha_entrega, estado_tarea, motivo_pausa,
      disenador_nombre,
      marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
    `)
    /* Solo tareas del módulo Diseño (modelo Pedro: base aparte).
       Las pubs del pipeline en etapa 'disenar' NO entran. */
    .eq('es_tarea_diseno', true)
    .order('fecha_diseno', { ascending: true, nullsFirst: false })

  if (subEstado) q = q.eq('estado_tarea', subEstado)
  if (marca) {
    const { data: m } = await service
      .from('marcas').select('id').eq('slug', marca).maybeSingle()
    if (m?.id) q = q.eq('marca_id', m.id)
  }

  const { data, error } = await q

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas = ((data ?? []) as any[]).map((t) => {
    const m = Array.isArray(t.marca) ? t.marca[0] : t.marca
    return {
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      fecha_diseno: t.fecha_diseno,
      fecha_entrega: t.fecha_entrega,
      sub_estado: t.estado_tarea,
      motivo_pausa: t.motivo_pausa,
      disenador: t.disenador_nombre,
      marca: m ? { slug: m.slug, nombre: m.nombre, color: m.color_primario_hex, emoji: m.emoji_marca } : null,
    }
  })

  return NextResponse.json({ ok: true, total: tareas.length, tareas })
}
