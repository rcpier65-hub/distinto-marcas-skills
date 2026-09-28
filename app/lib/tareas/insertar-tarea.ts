// Alta rápida del tablero. La usa crearTarea (web) y POST /api/v1/tareas.
// Misma categoría, @mención, marca_slug y push que el compositor de /tareas.

import { revalidatePath } from 'next/cache'
import { categorizarTarea, limpiarTexto, colorParaCategoria } from '@/lib/tareas/categorizar'
import { TAREA_SELECT as SELECT, rowToTarea } from '@/lib/tareas/serialize'
import type { Tarea } from '@/lib/tareas/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

function primerNombre(n: string): string {
  return (n ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

export async function insertarTareaRapida(
  service: Service,
  input: { memberId: string | null; textoOriginal: string; assigneeId?: string | null },
): Promise<{ ok: true; tarea: Tarea } | { ok: false; error: string }> {
  const texto = (input.textoOriginal ?? '').trim()
  if (!texto) return { ok: false, error: 'No escribiste nada' }
  if (texto.length > 600) return { ok: false, error: 'Demasiado largo' }

  const meId = input.memberId
  const { data: members } = await service.from('team_members').select('id, nombre').eq('activo', true)
  const { data: existentes } = await service.from('tareas').select('categoria, color')
  const colorByCat = new Map<string, string>()
  const usados: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (existentes ?? []) as any[]) {
    if (!colorByCat.has(r.categoria)) {
      colorByCat.set(r.categoria, r.color)
      usados.push(r.color)
    }
  }

  const { data: marcasData } = await service.from('marcas').select('nombre, slug')
  const marcas = ((marcasData ?? []) as { nombre: string; slug: string }[])
  const categoria = await categorizarTarea(texto, [...colorByCat.keys()], marcas)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const miembros = (members ?? []) as any[]
  let ownerId = meId
  const assigneeId = input.assigneeId?.trim() || ''
  if (assigneeId) {
    const target = miembros.find((m) => m.id === assigneeId)
    if (target) ownerId = target.id
  } else {
    const mention = texto.match(/@([\p{L}][\p{L}.]*)/u)
    if (mention) {
      const mname = mention[1].toLowerCase().replace(/\.+$/, '')
      const target = miembros.find((m) => {
        const nombre = (m.nombre ?? '').toLowerCase().trim()
        return primerNombre(m.nombre) === mname || nombre.replace(/\s+/g, '') === mname || nombre.split(/\s+/).includes(mname)
      })
      if (target) ownerId = target.id
    }
  }

  const color = colorByCat.get(categoria) ?? colorParaCategoria(usados)
  const marcaDeCategoria = marcas.find((m) => m.nombre.trim().toLowerCase() === categoria.trim().toLowerCase())

  const { data, error } = await service
    .from('tareas')
    .insert({
      team_member_id: ownerId,
      created_by: meId,
      texto: limpiarTexto(texto),
      categoria,
      color,
      completada: false,
      focus_lane: null,
      marca_slug: marcaDeCategoria?.slug ?? null,
    })
    .select(SELECT)
    .single()
  if (error) return { ok: false, error: error.message }

  if (ownerId && ownerId !== meId) {
    try {
      const { enviarPushAMiembroId } = await import('@/lib/push/send')
      const quien = miembros.find((m) => m.id === meId)?.nombre?.split(' ')[0] ?? 'Alguien'
      await enviarPushAMiembroId(ownerId, {
        title: '📋 Nueva tarea para ti',
        body: `${quien} te asignó: ${limpiarTexto(texto).slice(0, 70)}`,
        url: '/tareas',
      })
    } catch {
      /* la tarea ya quedó creada */
    }
  }

  revalidatePath('/tareas')
  revalidatePath('/inicio')
  return { ok: true, tarea: rowToTarea(data) }
}
