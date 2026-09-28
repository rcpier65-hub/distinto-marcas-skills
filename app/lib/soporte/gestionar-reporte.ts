// Tomar y resolver un reporte. La usan las actions de /soporte y POST /api/v1/soporte.
// Misma puerta que la web: director, o usuario sin fila en team_members.

import { revalidatePath } from 'next/cache'
import { enviarPushAMiembroId } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

const FRASE: Record<string, string> = {
  falla: 'la falla',
  pedido: 'el pedido',
  consulta: 'la consulta',
}

export async function tomarReporteEquipo(
  service: Service,
  input: { esAdmin: boolean; memberId: string | null; memberNombre: string; id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.esAdmin) return { ok: false, error: 'Solo Erick/Pedro pueden gestionar reportes.' }
  const { data: row } = await service
    .from('soporte_reportes')
    .select('team_member_id, descripcion, estado')
    .eq('id', input.id)
    .maybeSingle()
  const { error } = await service
    .from('soporte_reportes')
    .update({ estado: 'en_proceso', tomado_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('estado', 'pendiente')
  if (error) return { ok: false, error: error.message }
  if (row?.estado === 'pendiente' && row?.team_member_id) {
    await enviarPushAMiembroId(row.team_member_id, {
      title: '👀 Ya estamos viendo tu reporte',
      body: `${input.memberNombre || 'Erick'} está revisando: ${(row.descripcion ?? '').slice(0, 80)}`,
      url: '/soporte',
      tag: `soporte-visto-${input.id}`,
    })
  }
  revalidatePath('/soporte')
  return { ok: true }
}

export async function resolverReporteEquipo(
  service: Service,
  input: { esAdmin: boolean; memberId: string | null; id: string; nota?: string },
): Promise<{ ok: true; whatsapp: string } | { ok: false; error: string }> {
  if (!input.esAdmin) return { ok: false, error: 'Solo Erick/Pedro pueden resolver.' }
  const { data: row } = await service
    .from('soporte_reportes')
    .select('team_member_id, autor_nombre, tipo, descripcion')
    .eq('id', input.id)
    .maybeSingle()
  const { error } = await service
    .from('soporte_reportes')
    .update({
      estado: 'resuelto',
      resuelto_at: new Date().toISOString(),
      resuelto_por: input.memberId,
      nota_resolucion: (input.nota ?? '').trim() || null,
    })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }
  if (row?.team_member_id) {
    await enviarPushAMiembroId(row.team_member_id, {
      title: '✅ Tu reporte ya se resolvió',
      body: `${(row.descripcion ?? '').slice(0, 100)}`,
      url: '/soporte',
      tag: `soporte-resuelto-${input.id}`,
    })
  }
  const frase = FRASE[row?.tipo ?? 'consulta'] ?? 'la consulta'
  const mensaje = `Hola ${row?.autor_nombre ?? ''} 👋\n\nYa resolvimos ${frase} que reportaste:\n"${row?.descripcion ?? ''}"\n\n¡Cualquier otra cosa, avísame! 💙`.trim()
  revalidatePath('/soporte')
  revalidatePath('/inicio')
  return { ok: true, whatsapp: mensaje }
}
