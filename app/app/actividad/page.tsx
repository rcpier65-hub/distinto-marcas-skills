// app/app/actividad/page.tsx
//
// Reporte de actividad por persona. Cada miembro ve SU historial del día;
// el admin/owner (Pedro) ve el de TODOS, con filtro por persona y fecha.
// Pedro 15-jun-2026: "saber qué hizo cada persona y cuánto".

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { loadActividadDerivada } from '@/lib/actividad/derivar'
import { ActividadView, type ActividadRow } from './_components/actividad-view'

export const dynamic = 'force-dynamic'

const TZ = 'America/Lima'

function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

type SP = { fecha?: string; persona?: string }

export default async function ActividadPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  const sp = await searchParams
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoyLima()

  // ¿Es admin/owner? (sin team_member o rol director). Solo el admin ve a todos.
  const permisos = await getCurrentMemberPermisos()
  const esAdmin = !permisos || permisos.member.rol_base === 'director'
  const miNombre = permisos?.member?.nombre ?? 'Pedro (Admin)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Ventana del día en hora Lima (UTC-5, sin horario de verano).
  const desde = `${fecha}T00:00:00-05:00`
  const hasta = `${fecha}T23:59:59-05:00`

  /* Mostramos la actividad SIGNIFICATIVA — tareas completadas + videos
     editados — derivada de las tablas fuente, NO el log crudo de la tabla
     `actividad` (cambios de estado, "mandó a aprobar", etc.).
     Pedro 07-jul-2026: "no muestres las actividades de 'mandó a aprobar', se
     ve muy básico; muestra las tareas que realmente importan". */
  const rows: ActividadRow[] = await loadActividadDerivada(service, {
    desde,
    hasta,
    esAdmin,
    soloActorNombre: !esAdmin ? miNombre : (sp.persona ?? null),
  })

  /* Enriquecer la vista: colores/emojis de marca + hábitos completados del día
     por persona (para que el reporte sea "completo" como el del inicio).
     Defensivo: si algo falla, la vista igual muestra la actividad. */
  const [marcasRes, habitosRes] = await Promise.all([
    service.from('marcas').select('slug, nombre, color_primario_hex, emoji_marca'),
    service
      .from('habitos_completados')
      .select('completado_at, habito:habitos!inner(nombre, icono, color, miembro:team_members(nombre))')
      .eq('fecha', fecha)
      .then((r: unknown) => r, () => ({ data: [] })),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasRes?.data ?? []) as any[]).map((m) => ({
    slug: m.slug as string,
    nombre: m.nombre as string,
    color: (m.color_primario_hex ?? '#94a3b8') as string,
    emoji: (m.emoji_marca ?? null) as string | null,
  }))

  const habitosPorPersona: Record<string, { nombre: string; icono: string; color: string; hora: string | null }[]> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((habitosRes?.data ?? []) as any[])) {
    const h = Array.isArray(r.habito) ? r.habito[0] : r.habito
    if (!h) continue
    const miembro = Array.isArray(h.miembro) ? h.miembro[0] : h.miembro
    const nombre = miembro?.nombre as string | undefined
    if (!nombre) continue
    const horaLima = r.completado_at
      ? new Date(new Date(r.completado_at as string).getTime() - 5 * 3600 * 1000).toISOString().slice(11, 16)
      : null
    ;(habitosPorPersona[nombre] ??= []).push({
      nombre: (h.nombre ?? 'Hábito') as string,
      icono: (h.icono ?? '🌱') as string,
      color: (h.color ?? '#16a34a') as string,
      hora: horaLima,
    })
  }

  return (
    <ActividadView
      rows={rows}
      fecha={fecha}
      esAdmin={esAdmin}
      miNombre={miNombre}
      migracionPendiente={false}
      marcas={marcas}
      habitosPorPersona={habitosPorPersona}
    />
  )
}
