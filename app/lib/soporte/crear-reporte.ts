import 'server-only'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAMiembros } from '@/lib/push/send'

// Misma alta que `crearReporte` en /soporte: fila pendiente, aviso a Erick
// y directores, y revalidación de /soporte e /inicio.

const TIPOS = ['falla', 'pedido', 'consulta'] as const
type Tipo = (typeof TIPOS)[number]
const EMOJI: Record<Tipo, string> = { falla: '🐞', pedido: '💡', consulta: '❓' }

type Result = { ok: true; id: string } | { ok: false; error: string }

export async function insertarReporteSoporte(input: {
  teamMemberId: string | null
  autorNombre: string
  tipo: string
  descripcion: string
  imagenes?: string[]
}): Promise<Result> {
  const texto = (input.descripcion ?? '').trim()
  if (!texto) return { ok: false, error: 'Escribe qué necesitas o qué falló.' }
  if (texto.length > 2000) return { ok: false, error: 'Demasiado largo (máx. 2000).' }
  const tipo: Tipo = (TIPOS as readonly string[]).includes(input.tipo) ? (input.tipo as Tipo) : 'falla'
  const imgs = (Array.isArray(input.imagenes) ? input.imagenes : [])
    .filter((u) => typeof u === 'string' && u.includes('/storage/'))
    .slice(0, 6)
  const nombre = input.autorNombre.trim() || 'Alguien'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data, error } = await service
    .from('soporte_reportes')
    .insert({
      team_member_id: input.teamMemberId,
      autor_nombre: nombre,
      tipo,
      descripcion: texto,
      estado: 'pendiente',
      imagenes: imgs,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }

  await enviarPushAMiembros(['erick'], {
    title: `${EMOJI[tipo]} Nuevo reporte de soporte`,
    body: `${nombre}: ${texto.slice(0, 100)}`,
    url: '/soporte',
    tag: `soporte-nuevo-${data.id}`,
  })

  revalidatePath('/soporte')
  revalidatePath('/inicio')
  return { ok: true, id: String(data.id) }
}
