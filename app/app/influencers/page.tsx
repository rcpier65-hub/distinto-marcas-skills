// app/app/influencers/page.tsx
// Módulo Influencers — POR MARCA. Kanban de pedidos a influencers:
// Pedido enviado → Pedido entregado → Video enviado, con usuario de IG,
// enlace del video y carpeta de Drive.
//
// Pedro 31-ago-2026: "conectado con las marcas — hoy solo TypHouse está
// activa, solo a esa marca debe aparecerle". La activación vive en
// marcas.influencers_activo (default: solo little-joe); los directores
// activan/desactivan marcas desde esta misma página. Se navega entre marcas
// activas con ?marca=slug (mismo patrón que publicaciones).
import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo, getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { createServiceClient } from '@/lib/supabase/service'
import { leerInfluencersDb, influencersActivoDe } from '@/lib/influencers/db'
import { InfluencersView } from './_components/influencers-view'
import { MarcasInfluencersAdmin } from './_components/marcas-influencers-admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Influencers' }

/* Carpeta de videos específica del módulo para TypHouse (la pasó Pedro).
   Otras marcas usan su drive_url general (o sin botón si no tienen). */
const DRIVE_POR_SLUG: Record<string, string> = {
  'little-joe': 'https://drive.google.com/drive/folders/1feYgjVXukpORKqeKbmovzALOrBMYUDFq?usp=drive_link',
}

type SP = { marca?: string }

export default async function InfluencersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  await ensureAccesoModulo('publicaciones')
  const sp = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const permisos = await getCurrentMemberPermisos()
  const esDirector = !permisos || permisos.member.rol_base === 'director' || permisos.member.rol_base === 'admin'

  /* Marcas activas de la agencia (retry defensivo: influencers_activo y
     drive_url pueden no existir según el entorno). */
  let res = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, influencers_activo, drive_url')
    .eq('activa', true)
    .order('nombre')
  if (res.error && /(influencers_activo|drive_url)/i.test(res.error.message ?? '')) {
    res = await service.from('marcas').select('id, slug, nombre, emoji_marca').eq('activa', true).order('nombre')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todas = ((res.data ?? []) as any[]).map((m) => ({
    id: m.id as string,
    slug: m.slug as string,
    nombre: m.nombre as string,
    emoji: (m.emoji_marca ?? null) as string | null,
    activo: influencersActivoDe(m.slug, m.influencers_activo),
    driveUrl: (DRIVE_POR_SLUG[m.slug] ?? m.drive_url ?? null) as string | null,
  }))

  /* Marcas visibles para ESTE usuario: activas para influencers + dentro de
     su marcasAcceso (null = todas). */
  const acceso = permisos?.marcasAcceso ? new Set(permisos.marcasAcceso) : null
  const visibles = todas.filter((m) => m.activo && (!acceso || acceso.has(m.id)))

  const marcaSel = visibles.find((m) => m.slug === sp.marca) ?? visibles[0] ?? null

  /* Sin marca activa visible: aviso (y el panel de activación si es director). */
  if (!marcaSel) {
    return (
      <main className="p-6 md:p-8" style={{ minHeight: '100vh', background: '#fafafa' }}>
        <div className="max-w-3xl mx-auto space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Influencers</h1>
          <p className="text-[14px]" style={{ color: '#6b7280' }}>
            El módulo Influencers no está activado para {acceso ? 'tus marcas' : 'ninguna marca'}.
          </p>
          {esDirector && <MarcasInfluencersAdmin marcas={todas.map((m) => ({ slug: m.slug, nombre: m.nombre, emoji: m.emoji, activo: m.activo }))} />}
        </div>
      </main>
    )
  }

  const filas = await leerInfluencersDb(marcaSel.slug)

  return (
    <>
      {/* Selector de marca — solo si hay más de una marca con el módulo activo */}
      {visibles.length > 1 && (
        <div className="px-6 md:px-8 pt-5" style={{ background: '#fafafa' }}>
          <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
            {visibles.map((m) => (
              <Link
                key={m.slug}
                href={`/influencers?marca=${m.slug}`}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium"
                style={m.slug === marcaSel.slug
                  ? { background: '#111827', color: '#fff' }
                  : { background: '#fff', border: '1px solid #e5e7eb', color: '#374151', textDecoration: 'none' }}
              >
                {m.emoji} {m.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* key={slug}: al cambiar de marca se remonta el kanban (estado limpio) */}
      <InfluencersView
        key={marcaSel.slug}
        marcaSlug={marcaSel.slug}
        marcaNombre={marcaSel.nombre}
        driveUrl={marcaSel.driveUrl}
        iniciales={filas.map((f) => ({
          id: f.id,
          usuarioIg: f.usuario_ig,
          nombre: f.nombre,
          estado: f.estado,
          videoUrl: f.video_url,
          notas: f.notas,
          creadoEl: f.created_at,
        }))}
      />

      {/* Panel de activación por marca — solo directores */}
      {esDirector && (
        <div className="px-6 md:px-8 pb-8" style={{ background: '#fafafa' }}>
          <div className="max-w-6xl mx-auto">
            <MarcasInfluencersAdmin marcas={todas.map((m) => ({ slug: m.slug, nombre: m.nombre, emoji: m.emoji, activo: m.activo }))} />
          </div>
        </div>
      )}
    </>
  )
}
