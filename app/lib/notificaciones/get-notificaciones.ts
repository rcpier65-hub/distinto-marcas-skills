// app/lib/notificaciones/get-notificaciones.ts
//
// Agrega lo URGENTE/PENDIENTE para la campanita del topbar. Pedro:
//   - Grabación a <2 días sin guion listo → alertar
//   - Video pendiente para editar que es próximo → alertar
//   - Comentarios muy atrasados para responder → alertar
//
// Todo best-effort: si una tabla/columna no existe, esa fuente se
// salta y las demás siguen. Fechas en zona Lima (UTC-5).

import { createServiceClient } from '@/lib/supabase/service'

export type Notificacion = {
  id: string
  tipo: 'grabacion' | 'editar' | 'observacion' | 'soporte'
  titulo: string
  detalle: string
  href: string
  urgencia: 'alta' | 'media'
  /* emoji/color de la marca para el punto lateral */
  marcaColor: string | null
  marcaEmoji: string | null
}

const TZ_LIMA = 'America/Lima'
function ymdLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_LIMA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}
function addDaysLima(base: Date, dias: number): string {
  return ymdLima(new Date(base.getTime() + dias * 86_400_000))
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES[(m ?? 1) - 1]}`
}
function diasEntre(isoA: string, isoB: string): number {
  const [ya, ma, da] = isoA.split('-').map(Number)
  const [yb, mb, db] = isoB.split('-').map(Number)
  return Math.round((new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()) / 86_400_000)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function marcaDe(r: any): { nombre: string; color: string | null; emoji: string | null } {
  const m = Array.isArray(r.marcas) ? r.marcas[0] : r.marcas
  return {
    nombre: m?.nombre ?? 'Marca',
    color: m?.color_primario_hex ?? null,
    emoji: m?.emoji_marca ?? null,
  }
}

export async function getNotificaciones(): Promise<Notificacion[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* ¿Es director (Erick/Pedro) o admin/owner? Ellos son los que resuelven los
     reportes de Soporte, así que solo a ellos les mostramos esos avisos.
     getCurrentMemberPermisos está cacheado por request → no cuesta una query
     extra aunque el layout ya lo haya llamado. */
  let esDirector = false
  try {
    const { getCurrentMemberPermisos } = await import('@/lib/team/permisos-helper')
    const p = await getCurrentMemberPermisos()
    esDirector = !p || p.member.rol_base === 'director'
  } catch { /* si falla, tratamos como NO director */ }

  const hoy = ymdLima(new Date())
  const en2 = addDaysLima(new Date(), 2)
  const hace3 = addDaysLima(new Date(), -3)

  const out: Notificacion[] = []

  /* 0) SOPORTE — reportes del equipo (fallas/pedidos/consultas) sin resolver.
     Solo para directores (Erick/Pedro), que son quienes resuelven. Aparecen en
     la campanita para que Erick los vea aunque el push al celular no llegue.
     Pedro 06-ago-2026. */
  if (esDirector) {
    try {
      const res = await service
        .from('soporte_reportes')
        .select('id, autor_nombre, tipo, descripcion, created_at')
        .neq('estado', 'resuelto')
        .order('created_at', { ascending: false })
        .limit(20)
      const LABEL: Record<string, string> = { falla: '🐞 Falla', pedido: '💡 Pedido', consulta: '❓ Consulta' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (res.data ?? []) as any[]) {
        const desc = (r.descripcion ?? '').replace(/\s+/g, ' ').trim()
        out.push({
          id: `sop-${r.id}`,
          tipo: 'soporte',
          titulo: `${LABEL[r.tipo] ?? 'Reporte'} — ${r.autor_nombre ?? 'Alguien'}`,
          detalle: desc.length > 72 ? desc.slice(0, 72) + '…' : desc,
          href: '/soporte',
          urgencia: 'alta',
          marcaColor: '#7170ff',
          marcaEmoji: null,
        })
      }
    } catch { /* tabla no existe aún */ }
  }

  /* 1) Grabaciones a <=2 días sin guion listo. */
  try {
    const sel = 'id, fecha_planeada, guion_listo, marcas:marca_id (nombre, color_primario_hex, emoji_marca)'
    let res = await service
      .from('grabaciones')
      .select(sel)
      .eq('estado', 'planeada')
      .gte('fecha_planeada', hoy)
      .lte('fecha_planeada', en2)
      .order('fecha_planeada', { ascending: true })
    // Fallback si guion_listo no existe: traemos sin ese campo y asumimos no-listo.
    if (res.error && /guion_listo/i.test(res.error.message ?? '')) {
      res = await service
        .from('grabaciones')
        .select('id, fecha_planeada, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
        .eq('estado', 'planeada')
        .gte('fecha_planeada', hoy)
        .lte('fecha_planeada', en2)
        .order('fecha_planeada', { ascending: true })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      if (r.guion_listo === true) continue // guion ya listo → no alerta
      const m = marcaDe(r)
      const dd = diasEntre(r.fecha_planeada, hoy)
      const cuando = dd === 0 ? 'hoy' : dd === 1 ? 'mañana' : `en ${dd} días`
      out.push({
        id: `grab-${r.id}`,
        tipo: 'grabacion',
        titulo: `Falta el guion — ${m.nombre}`,
        detalle: `Grabación ${cuando} (${fechaCorta(r.fecha_planeada)}) y el guion no está listo`,
        href: '/grabaciones',
        urgencia: dd <= 1 ? 'alta' : 'media',
        marcaColor: m.color,
        marcaEmoji: m.emoji,
      })
    }
  } catch { /* tabla no existe */ }

  /* 2) Videos por editar con publicación próxima (<=2 días). */
  try {
    const res = await service
      .from('publicaciones')
      .select('id, nombre, fecha_publicacion, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
      .eq('estado', 'editar')
      .gte('fecha_publicacion', hoy)
      .lte('fecha_publicacion', en2)
      .order('fecha_publicacion', { ascending: true })
      .limit(15)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      const m = marcaDe(r)
      const dd = diasEntre(r.fecha_publicacion, hoy)
      const cuando = dd === 0 ? 'hoy' : dd === 1 ? 'mañana' : `en ${dd} días`
      out.push({
        id: `edit-${r.id}`,
        tipo: 'editar',
        titulo: `Editar: ${r.nombre ?? 'video'}`,
        detalle: `${m.nombre} · publica ${cuando} (${fechaCorta(r.fecha_publicacion)})`,
        href: `/publicaciones/${r.id}`,
        urgencia: dd <= 1 ? 'alta' : 'media',
        marcaColor: m.color,
        marcaEmoji: m.emoji,
      })
    }
  } catch { /* ignore */ }

  /* (Los "Comentarios sin responder" se quitaron de la campanita — ya no se
     usan y aparecían muy viejos. Pedro 06-ago-2026.) */

  /* 4) Observaciones del CLIENTE sin atender. Garantiza que el pedido del
     cliente le aparezca a Erick/Pedro en la campanita aunque el push no le
     llegue (celular sin permiso, otra compu, etc.). Pedro 15-jul-2026. */
  try {
    const res = await service
      .from('marca_observaciones')
      .select('id, texto, autor_nombre, created_at, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
      .eq('atendida', false)
      .order('created_at', { ascending: false })
      .limit(15)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      const m = marcaDe(r)
      const texto = (r.texto ?? '').replace(/\s+/g, ' ').trim()
      const quien = r.autor_nombre ? `${r.autor_nombre}: ` : ''
      out.push({
        id: `obs-${r.id}`,
        tipo: 'observacion',
        titulo: `Observación de ${m.nombre}`,
        detalle: `${quien}${texto.length > 70 ? texto.slice(0, 70) + '…' : texto}`,
        href: '/admin/clientes',
        urgencia: 'alta',
        marcaColor: m.color,
        marcaEmoji: m.emoji,
      })
    }
  } catch { /* ignore */ }

  /* 5) Grabaciones que AGENDÓ EL CLIENTE desde su portal (últimos 3 días).
     Igual que las observaciones: garantiza que le aparezca al equipo en la
     campanita aunque el push no llegue. Pedro 15-jul-2026. */
  try {
    const res = await service
      .from('grabaciones')
      .select('id, fecha_planeada, hora_planeada, notas, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
      .eq('agendada_por_cliente', true)
      .eq('estado', 'planeada')
      .gte('created_at', `${hace3}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      const m = marcaDe(r)
      const hora = r.hora_planeada ? ` · ${String(r.hora_planeada).slice(0, 5)}` : ''
      out.push({
        id: `grabcli-${r.id}`,
        tipo: 'grabacion',
        titulo: `${m.nombre} agendó una grabación`,
        detalle: `${fechaCorta(r.fecha_planeada)}${hora}${r.notas ? ` — ${String(r.notas).slice(0, 50)}` : ''}`,
        href: '/grabaciones',
        urgencia: 'alta',
        marcaColor: m.color,
        marcaEmoji: m.emoji,
      })
    }
  } catch { /* ignore */ }

  /* Orden: urgencia alta primero, luego por tipo. Cap a 20 para el panel. */
  out.sort((a, b) => {
    if (a.urgencia !== b.urgencia) return a.urgencia === 'alta' ? -1 : 1
    return 0
  })
  return out.slice(0, 20)
}
