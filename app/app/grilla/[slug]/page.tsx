// app/app/grilla/[slug]/page.tsx
// Vista "Grilla semanal" para una marca específica.
// Carga publicaciones de la semana + la grilla PNG ya generada (si existe) en BD.
// El workspace muestra el PNG real (no un mock) + caption editable.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { GrillaWorkspace } from './_components/grilla-workspace'
import { buildCaptionDefault } from '@/lib/grilla/build-caption'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ inicio?: string; fin?: string }>
}

function calcularSemanaActual(): { inicio: string; fin: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    inicio: monday.toISOString().slice(0, 10),
    fin: sunday.toISOString().slice(0, 10),
  }
}

type PubLite = {
  id: string
  titulo: string
  fecha: string
  plataformas: string[]
  tipo_contenido: string[]
}

export default async function GrillaPage({ params, searchParams }: PageProps) {
  await requireUser()
  const { slug } = await params
  const sp = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Marca (incluye envio_real_habilitado para safety lock en UI)
  const { data: marca, error: marcaErr } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, decisor_nombre, decisor_tratamiento, tono_voz, envio_real_habilitado, grupo_whatsapp_chatid, grupo_whatsapp_nombre')
    .eq('slug', slug)
    .eq('activa', true)
    .maybeSingle()

  if (marcaErr || !marca) notFound()

  // 2. Semana
  const { inicio, fin } = sp.inicio && sp.fin
    ? { inicio: sp.inicio, fin: sp.fin }
    : calcularSemanaActual()

  // 3. Publicaciones de la semana (de NUESTRA BD)
  const { data: pubsRaw } = await service
    .from('publicaciones')
    .select('id, nombre, fecha_publicacion, plataformas, tipo_contenido')
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', inicio)
    .lte('fecha_publicacion', fin)
    .order('fecha_publicacion', { ascending: true })

  type PubRow = {
    id: string
    nombre: string
    fecha_publicacion: string | null
    plataformas: string[] | null
    tipo_contenido: string[] | null
  }
  const pubs: PubLite[] = (pubsRaw ?? [])
    .filter((p: PubRow) => p.fecha_publicacion)
    .map((p: PubRow) => ({
      id: p.id,
      titulo: p.nombre,
      fecha: p.fecha_publicacion!,
      plataformas: p.plataformas ?? [],
      tipo_contenido: p.tipo_contenido ?? [],
    }))

  // 4. Grilla PNG ya generada (si existe) — esta es la VERDAD
  const { data: grilla } = await service
    .from('grillas_pendientes')
    .select('id, png_url, estado, updated_at')
    .eq('marca_id', marca.id)
    .eq('semana_inicio', inicio)
    .in('estado', ['esperando_aprobacion', 'aprobada', 'enviada'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 5. Caption por defecto (editable después en el client)
  const captionDefault = buildCaptionDefault({
    marca: {
      nombre: marca.nombre,
      decisor_tratamiento: marca.decisor_tratamiento,
      decisor_nombre: marca.decisor_nombre,
      emoji_marca: marca.emoji_marca,
      tono_voz: marca.tono_voz,
    },
    semana_inicio: inicio,
    semana_fin: fin,
    publicaciones: pubs.map((p) => ({
      notion_id: p.id,
      titulo: p.titulo,
      fecha: p.fecha,
      plataformas: p.plataformas,
      tipo_contenido: p.tipo_contenido,
      estado: null,
      url: '',
    })),
  })

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground font-medium flex items-center gap-1">
          <span>{marca.emoji_marca}</span> {marca.nombre}
        </span>
        <span>/</span>
        <span className="font-medium">Grilla {inicio} → {fin}</span>
      </nav>

      <GrillaWorkspace
        marca={{
          slug: marca.slug,
          nombre: marca.nombre,
          emoji_marca: marca.emoji_marca,
          color_primario_hex: marca.color_primario_hex,
          envio_real_habilitado: Boolean(marca.envio_real_habilitado),
          grupo_nombre: (marca.grupo_whatsapp_nombre as string | null) ?? null,
        }}
        semanaInicio={inicio}
        semanaFin={fin}
        publicaciones={pubs}
        captionDefault={captionDefault}
        pngUrl={grilla?.png_url ?? null}
        estado={grilla?.estado ?? null}
      />
    </main>
  )
}
