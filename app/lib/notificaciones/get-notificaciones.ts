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
  tipo: 'grabacion' | 'editar' | 'comentario'
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

/* Notificaciones PERSONALES por rol. Antes eran globales (todos veían todo).
   Pedro 14-jul-2026: cada quien ve solo lo suyo.
   - Dueño (Pedro): ve todo (pulso del día).
   - Editor: solo sus videos por editar (editor_nombre = él).
   - Community/Social manager: comentarios sin responder + grabaciones sin guion.
   - Otros roles (diseñador, admin como Erick): sin alertas operativas → panel vacío. */
export async function getNotificaciones(opts?: {
  esOwner?: boolean
  rolBase?: string | null
  nombre?: string | null
}): Promise<Notificacion[]> {
  const esOwner = opts?.esOwner ?? true // sin opts (compat) = ver todo
  const rol = opts?.rolBase ?? null
  const nombre = (opts?.nombre ?? '').trim().toLowerCase()
  const esEditor = rol === 'editor'
  const esCM = rol === 'community_manager' || rol === 'social_media_manager'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = ymdLima(new Date())
  const en2 = addDaysLima(new Date(), 2)
  const hace3 = addDaysLima(new Date(), -3)

  const out: Notificacion[] = []

  /* 1) Grabaciones a <=2 días sin guion listo. Solo dueño o community/social. */
  if (esOwner || esCM) try {
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

  /* 2) Videos por editar próximos (<=2 días). Dueño ve todos; un editor solo
        los suyos (editor_nombre = él). */
  if (esOwner || esEditor) try {
    const res = await service
      .from('publicaciones')
      .select('id, nombre, fecha_publicacion, editor_nombre, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
      .eq('estado', 'editar')
      .gte('fecha_publicacion', hoy)
      .lte('fecha_publicacion', en2)
      .order('fecha_publicacion', { ascending: true })
      .limit(15)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      // Un editor (no dueño) solo ve los videos asignados a su nombre.
      if (!esOwner && esEditor && (r.editor_nombre ?? '').trim().toLowerCase() !== nombre) continue
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

  /* 3) Comentarios pendientes muy atrasados (>3 días). Solo dueño o community/social. */
  if (esOwner || esCM) try {
    const res = await service
      .from('comentarios_inbox')
      .select('id, author_username, author_display_name, comment_created_at, marcas:marca_id (nombre, color_primario_hex, emoji_marca)')
      .eq('status', 'pending')
      .lte('comment_created_at', `${hace3}T23:59:59`)
      .order('comment_created_at', { ascending: true })
      .limit(15)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (res.data ?? []) as any[]) {
      const m = marcaDe(r)
      const fechaCom = (r.comment_created_at ?? '').slice(0, 10)
      const dd = fechaCom ? Math.abs(diasEntre(hoy, fechaCom)) : 0
      const autor = r.author_display_name || r.author_username || 'alguien'
      out.push({
        id: `com-${r.id}`,
        tipo: 'comentario',
        titulo: `Comentario sin responder — ${m.nombre}`,
        detalle: `@${autor} escribió hace ${dd} día${dd === 1 ? '' : 's'}`,
        href: '/comentarios',
        urgencia: dd >= 7 ? 'alta' : 'media',
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
