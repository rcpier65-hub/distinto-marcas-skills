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
// Auth de lectura:
//   - Bearer CRON_SECRET — rutinas de servidor (sin filtro de marcas_acceso).
//   - Bearer JWT o dst_live_ con alcance owner — misma visibilidad que la sesión.
//     Nay no necesita CRON_SECRET.
// Escritura (PATCH y PUT): solo JWT o dst_live_ owner, con permiso de director/owner.
// No devuelve tokens de Metricool.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type { MarcaFactsRow } from '@/lib/types/database'
import {
  apiJsonError,
  denyMarcaAcceso,
  puedeEscribirMarcaFacts,
  requireSessionMember,
  type SessionMember,
} from '@/lib/api/session-member'
import { upsertMarcaFacts } from '@/lib/api/marca-facts-write'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

type RouteParams = { params: Promise<{ slug: string }> }

type FactsGate =
  | { ok: true; mode: 'cron' }
  | { ok: true; mode: 'member'; member: SessionMember }

async function authorizeFactsRead(request: Request): Promise<FactsGate | { response: NextResponse }> {
  const header = request.headers.get('authorization')
  const cron = process.env.CRON_SECRET
  if (cron && header === `Bearer ${cron}`) return { ok: true, mode: 'cron' }
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth
  return { ok: true, mode: 'member', member: auth.member }
}

export async function GET(request: Request, { params }: RouteParams) {
  const gate = await authorizeFactsRead(request)
  if ('response' in gate) return gate.response

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
  if (gate.mode === 'member') {
    const denied = denyMarcaAcceso(gate.member, marca.id)
    if (denied) return denied
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

async function writeFacts(request: Request, { params }: RouteParams) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!puedeEscribirMarcaFacts(auth.member)) {
    return apiJsonError('Solo director u owner puede editar los datos canon de la marca', 403)
  }

  const { slug } = await params
  if (!slug) return apiJsonError('missing slug', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJsonError('Body JSON inválido', 400)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marca, error: errM } = await service
    .from('marcas')
    .select('id, nombre')
    .eq('slug', slug)
    .maybeSingle()
  if (errM) return apiJsonError(errM.message, 500)
  if (!marca) return apiJsonError(`marca '${slug}' no existe`, 404)

  const denied = denyMarcaAcceso(auth.member, marca.id)
  if (denied) return denied

  const nombre = typeof marca.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : slug
  const saved = await upsertMarcaFacts(service, marca.id, nombre, body)
  if (!saved.ok) return apiJsonError(saved.error, saved.status)

  revalidatePath('/settings')
  return NextResponse.json({ ok: true, has_facts: saved.hasFacts, facts: saved.facts })
}

export async function PATCH(request: Request, ctx: RouteParams) {
  return writeFacts(request, ctx)
}

export async function PUT(request: Request, ctx: RouteParams) {
  return writeFacts(request, ctx)
}
