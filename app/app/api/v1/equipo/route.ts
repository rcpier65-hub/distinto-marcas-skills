// GET /api/v1/equipo
// Miembros del equipo. No devuelve password_inicial ni hashes.
// Auth: Bearer JWT o dst_live_ con alcance owner. Módulo equipo.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { texto, textoOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.puedeEquipo) return apiJsonError('No tienes acceso a Mi equipo', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [membersRes, rolesRes, pubsRes] = await Promise.all([
    service
      .from('team_members')
      .select('id, email, nombre, rol_base, cargo_personalizado, activo, marcas_acceso, editor_legacy_id')
      .order('activo', { ascending: false })
      .order('nombre'),
    service.from('roles_predefinidos').select('id, nombre').order('orden'),
    service.from('publicaciones').select('editor_id').eq('estado', 'editar').limit(1000),
  ])
  if (membersRes.error) return apiJsonError(membersRes.error.message, 500)

  const rolNombre = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const rol of (rolesRes.data ?? []) as any[]) {
    if (typeof rol.id === 'string') rolNombre.set(rol.id, texto(rol.nombre, rol.id))
  }
  const enEdicion = new Map<string, number>()
  if (!pubsRes.error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (pubsRes.data ?? []) as any[]) {
      if (typeof row.editor_id !== 'string') continue
      enEdicion.set(row.editor_id, (enEdicion.get(row.editor_id) ?? 0) + 1)
    }
  }

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const miembros = ((membersRes.data ?? []) as any[]).map((row) => {
    const rolBase = textoOrNull(row.rol_base)
    const marcas = row.marcas_acceso
    const editorId = typeof row.editor_legacy_id === 'string' ? row.editor_legacy_id : null
    return {
      id: String(row.id),
      nombre: texto(row.nombre, 'Sin nombre'),
      email: textoOrNull(row.email),
      rol: rolBase ? (rolNombre.get(rolBase) ?? rolBase) : null,
      rol_base: rolBase,
      cargo: textoOrNull(row.cargo_personalizado),
      activo: row.activo !== false,
      marcas: Array.isArray(marcas) ? marcas.length : null,
      en_edicion: editorId ? (enEdicion.get(editorId) ?? 0) : 0,
      link: `${base}/equipo`,
    }
  })

  return NextResponse.json({
    ok: true,
    total: miembros.length,
    activos: miembros.filter((miembro) => miembro.activo).length,
    miembros,
  })
}
