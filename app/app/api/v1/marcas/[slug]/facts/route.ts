// app/app/api/v1/marcas/[slug]/facts/route.ts
//
// GET /api/v1/marcas/{slug}/facts
//
// Devuelve los datos CANON de una marca: naming actual, web, WhatsApp,
// puntos de venta, datos verificables de productos, frases prohibidas
// y frases canon.
//
// Consumido por la Routine ANTES de redactar respuestas a comentarios,
// para evitar inventar URLs/precios/naming desactualizado.
//
// Si la marca NO tiene marca_facts cargado todavía, devuelve la
// estructura con valores nulos/vacíos + flag `has_facts: false` para
// que la Routine sepa que debe responder con guardrails extra (o
// derivar SIEMPRE a DM hasta que el operador cargue datos).
//
// Auth: Bearer <CRON_SECRET> en header Authorization.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { MarcaFactsRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

type RouteParams = { params: Promise<{ slug: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  // ----- Auth -----
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // ----- 1. Lookup marca por slug -----
  const { data: marca, error: errM } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, decisor_nombre, decisor_tratamiento, metricool_blog_id')
    .eq('slug', slug)
    .maybeSingle()

  if (errM) {
    return NextResponse.json({ ok: false, error: errM.message }, { status: 500 })
  }
  if (!marca) {
    return NextResponse.json({ ok: false, error: `marca '${slug}' no existe` }, { status: 404 })
  }

  // ----- 2. Lookup facts por marca_id (puede no existir aún) -----
  const { data: facts, error: errF } = await service
    .from('marca_facts')
    .select(`
      marca_id,
      nombre_comercial,
      web_principal,
      whatsapp_principal,
      puntos_venta,
      proximamente,
      productos_datos,
      frases_prohibidas,
      frases_canon,
      notas,
      updated_at
    `)
    .eq('marca_id', marca.id)
    .maybeSingle()

  if (errF) {
    return NextResponse.json({ ok: false, error: errF.message }, { status: 500 })
  }

  // ----- 3. Si no hay facts cargados, devolver shape con nulls + flag -----
  const hasFacts = facts !== null
  const factsRow = (facts ?? {
    marca_id: marca.id,
    nombre_comercial: null,
    web_principal: null,
    whatsapp_principal: null,
    puntos_venta: [],
    proximamente: [],
    productos_datos: {},
    frases_prohibidas: [],
    frases_canon: [],
    notas: null,
    updated_at: null,
  }) as MarcaFactsRow | null

  // ----- 4. Devolver JSON limpio para consumo de Routine -----
  return NextResponse.json({
    ok: true,
    has_facts: hasFacts,
    marca: {
      slug: marca.slug,
      nombre_legal: marca.nombre,
      emoji: marca.emoji_marca,
      decisor: marca.decisor_nombre,
      decisor_tratamiento: marca.decisor_tratamiento,
      metricool_blog_id: marca.metricool_blog_id,
    },
    facts: factsRow ? {
      nombre_comercial: factsRow.nombre_comercial ?? marca.nombre,
      web_principal: factsRow.web_principal,
      whatsapp_principal: factsRow.whatsapp_principal,
      puntos_venta: factsRow.puntos_venta ?? [],
      proximamente: factsRow.proximamente ?? [],
      productos_datos: factsRow.productos_datos ?? {},
      frases_prohibidas: factsRow.frases_prohibidas ?? [],
      frases_canon: factsRow.frases_canon ?? [],
      notas: factsRow.notas,
      updated_at: factsRow.updated_at,
    } : null,
    advertencia: hasFacts ? null : (
      `Esta marca no tiene marca_facts cargados todavía. ` +
      `La Routine debe operar en MODO CONSERVADOR: no afirmar precios ni ` +
      `URLs, derivar SIEMPRE a DM hasta que el operador cargue los datos ` +
      `en /settings → Datos canon.`
    ),
  })
}
