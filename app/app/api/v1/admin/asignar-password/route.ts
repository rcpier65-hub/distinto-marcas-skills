// app/app/api/v1/admin/asignar-password/route.ts
//
// POST /api/v1/admin/asignar-password
// Body: { email: string, password: string }
//
// Crea (o resetea) la cuenta de Supabase Auth para un team_member ya
// existente, linkea auth_user_id y guarda la pass en password_inicial
// para que Pedro pueda copiarla. Espejo programable de la server action
// asignarPassword() que vive en app/equipo/_actions.ts — útil para
// scripts admin y flows automatizados que no pueden invocar server
// actions vía HTTP.
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  type Body = { email?: string; password?: string }
  let body: Body = {}
  try { body = (await request.json()) as Body } catch { /* ignore */ }

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'email inválido' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'password debe tener al menos 8 chars' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Resolver team_member por email. Si no existe, no creamos auth a
     ciegas — exigimos que el row de team_members ya esté en su sitio
     (creado por crearMiembro o por SQL). */
  const { data: member, error: e1 } = await service
    .from('team_members')
    .select('id, auth_user_id, nombre')
    .eq('email', email)
    .maybeSingle()

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 })
  if (!member) {
    return NextResponse.json({ ok: false, error: `team_member con email ${email} no existe` }, { status: 404 })
  }

  let authUserId = member.auth_user_id as string | null

  if (!authUserId) {
    // Crear cuenta nueva
    const { data: created, error: e2 } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: member.nombre, team_member_id: member.id },
    })
    if (e2 || !created?.user) {
      return NextResponse.json({ ok: false, error: e2?.message ?? 'no se pudo crear auth user' }, { status: 500 })
    }
    authUserId = created.user.id
  } else {
    // Reset de password
    const { error: e3 } = await service.auth.admin.updateUserById(authUserId, { password })
    if (e3) {
      return NextResponse.json({ ok: false, error: e3.message }, { status: 500 })
    }
  }

  /* Persistir password_inicial visible — Pedro la ve en /equipo para
     copiar y mandar por WhatsApp. Mantenemos el link auth_user_id. */
  const { error: e4 } = await service
    .from('team_members')
    .update({ auth_user_id: authUserId, password_inicial: password })
    .eq('id', member.id)
  if (e4) {
    return NextResponse.json({ ok: false, error: e4.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    teamMemberId: member.id,
    authUserId,
    email,
    nombre: member.nombre,
  })
}
