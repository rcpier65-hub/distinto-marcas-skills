// app/app/grilla/[slug]/page.tsx
// Vista "Pedir grilla" para una marca específica.
// Carga las publicaciones de la semana actual desde NUESTRA BD (no Notion)
// y renderiza la plantilla de la marca + el caption editable + botón download PNG.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { GrillaWorkspace } from './_components/grilla-workspace'
import { buildCaptionDefault } from '@/lib/grilla/build-caption'
import type { GrillaPublicacionLite } from '@/components/plantillas-grilla'

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

export default async function GrillaPage({ params, searchParams }: PageProps) {
  await requireUser()
  const { slug } = await params
  const sp = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Cargar marca
  const { data: marca, error: marcaErr } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, decisor_nombre, decisor_tratamiento, tono_voz')
    .eq('slug', slug)
    .eq('activa', true)
    .maybeSingle()

  if (marcaErr || !marca) notFound()

  // 2. Calcular rango semana
  const { inicio, fin } = sp.inicio && sp.fin
    ? { inicio: sp.inicio, fin: sp.fin }
    : calcularSemanaActual()

  // 3. Cargar publicaciones de la semana para esta marca
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
    plataformas: string[]
    tipo_contenido: string[]
  }
  const pubs: GrillaPublicacionLite[] = (pubsRaw ?? [])
    .filter((p: PubRow) => p.fecha_publicacion)
    .map((p: PubRow) => ({
      id: p.id,
      titulo: p.nombre,
      fecha: p.fecha_publicacion!,
      plataformas: p.plataformas ?? [],
      tipo_contenido: p.tipo_contenido ?? [],
    }))

  // 4. Generar caption por defecto (editable después en el client)
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
        }}
        semanaInicio={inicio}
        semanaFin={fin}
        publicaciones={pubs}
        captionDefault={captionDefault}
      />
    </main>
  )
}
