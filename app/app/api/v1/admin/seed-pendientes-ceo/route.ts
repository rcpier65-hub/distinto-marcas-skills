// app/app/api/v1/admin/seed-pendientes-ceo/route.ts
//
// One-shot: carga el backlog del CEO (Pedro) como pendientes_rapidos.
// Pedro tenía estas tareas en un kanban externo y pidió meterlas en sus
// "tareas rápidas" del /inicio en vez de tipearlas una por una.
//
// Auth: Bearer CRON_SECRET.
// Idempotente: salta las tareas cuyo título ya existe para ese dueño.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const TAREAS: Array<{ proyecto: string; texto: string; categoria: string }> = [
  // Mil Ideas
  { proyecto: 'Mil Ideas', texto: 'Cambiar la portada de Facebook', categoria: 'Diseño' },
  { proyecto: 'Mil Ideas', texto: 'Plantilla de Excel con productos para impulsar', categoria: 'Administrativo' },
  { proyecto: 'Mil Ideas', texto: 'Recibir fotografía', categoria: 'Otro' },
  { proyecto: 'Mil Ideas', texto: 'Terminar landing', categoria: 'Diseño' },
  { proyecto: 'Mil Ideas', texto: 'Hacer bot', categoria: 'Administrativo' },
  { proyecto: 'Mil Ideas', texto: 'Hacer landing con productos', categoria: 'Diseño' },
  // Little Joe
  { proyecto: 'Little Joe', texto: 'Cambiar portada', categoria: 'Diseño' },
  // Rapifac
  { proyecto: 'Rapifac', texto: 'Hacer prueba de sistema automático', categoria: 'Administrativo' },
  // Personal
  { proyecto: 'Personal', texto: 'Verificar que sincronice todo el sistema', categoria: 'Administrativo' },
  { proyecto: 'Personal', texto: 'Editar video marca personal', categoria: 'Edición' },
  { proyecto: 'Personal', texto: 'Subir video marca personal', categoria: 'Comunicación' },
  { proyecto: 'Agencia Distinto', texto: 'Automatizar historias de redes sociales', categoria: 'Administrativo' },
  // Manrique
  { proyecto: 'Manrique', texto: 'Blog mobile: ajustar y cerrar', categoria: 'Administrativo' },
  { proyecto: 'Manrique', texto: 'Hacer blogs (Manrique Avanza) y programar la subida diaria', categoria: 'Comunicación' },
  { proyecto: 'Manrique', texto: 'Manrique Avanza: continuar con el sistema', categoria: 'Administrativo' },
  // Praktico
  { proyecto: 'Praktico', texto: 'Poner logos y ajustar las redes', categoria: 'Diseño' },
  { proyecto: 'Praktico', texto: 'Hacer web Shopify', categoria: 'Diseño' },
  { proyecto: 'Praktico', texto: 'Editar videos', categoria: 'Edición' },
  { proyecto: 'Praktico', texto: 'Poner logos', categoria: 'Diseño' },
  // Kintu
  { proyecto: 'Kintu', texto: 'Hacer publicidad', categoria: 'Comunicación' },
  { proyecto: 'Kintu', texto: 'Landing de Kintu Aceites Esenciales', categoria: 'Diseño' },
]

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Permitir override del dueño por body (por si la resolución automática
     no cae en el bucket correcto). */
  let bodyOwner: string | null | undefined
  try {
    const body = await request.json()
    bodyOwner = body?.teamMemberId
  } catch { /* sin body */ }

  /* Resolver el team_member del CEO (rol_base='director'). */
  const { data: director } = await service
    .from('team_members')
    .select('id, nombre')
    .eq('rol_base', 'director')
    .limit(1)
    .maybeSingle()

  /* Dueños existentes de pendientes (para diagnóstico + fallback). */
  const { data: existentes } = await service
    .from('pendientes_rapidos')
    .select('team_member_id, titulo, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const ownerId: string | null =
    bodyOwner !== undefined ? bodyOwner
    : director?.id ?? (existentes?.[0]?.team_member_id ?? null)

  /* Títulos ya existentes para ese dueño → idempotencia. */
  const yaExisten = new Set<string>(
    (existentes ?? [])
      .filter((r: { team_member_id: string | null }) => r.team_member_id === ownerId)
      .map((r: { titulo: string }) => r.titulo),
  )

  const filas = TAREAS
    .map((t) => ({ titulo: `${t.proyecto} · ${t.texto}`, categoria: t.categoria }))
    .filter((t) => !yaExisten.has(t.titulo))
    .map((t) => ({
      team_member_id: ownerId,
      texto_original: t.titulo,
      titulo: t.titulo,
      descripcion: null,
      categoria: t.categoria,
      prioridad: 2,
      completado: false,
    }))

  let inserted = 0
  let insertError: string | null = null
  if (filas.length > 0) {
    const { data, error } = await service
      .from('pendientes_rapidos')
      .insert(filas)
      .select('id')
    if (error) insertError = error.message
    else inserted = data?.length ?? 0
  }

  return NextResponse.json({
    ok: !insertError,
    ownerId,
    directorEncontrado: director ? { id: director.id, nombre: director.nombre } : null,
    duenosExistentes: Array.from(
      new Set((existentes ?? []).map((r: { team_member_id: string | null }) => r.team_member_id)),
    ),
    totalTareas: TAREAS.length,
    insertadas: inserted,
    saltadas: TAREAS.length - filas.length,
    error: insertError,
  })
}
