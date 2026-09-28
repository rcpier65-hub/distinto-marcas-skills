// app/app/perfil/page.tsx
//
// Vista "Mi perfil" — el usuario logueado edita sus datos personales:
// nombre, foto, cumpleaños, fecha de pago, cargo. Los cambios se
// sincronizan con team_members y se reflejan en /equipo para Pedro.
//
// Si el usuario es admin/owner sin team_member, mostramos un mensaje
// explicando que solo los miembros del equipo tienen perfil editable
// y un link a /equipo.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PerfilForm } from './_components/perfil-form'
import type { TeamMember } from '@/lib/team/types'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Cargar el team_member del usuario logueado. Si no existe (caso
     admin/owner sin perfil), mostramos pantalla explicativa. */
  const { data: member } = await service
    .from('team_members')
    .select(`
      id, nombre, email, cargo_personalizado, fecha_cumpleanos,
      fecha_pago, avatar_url, rol_base, activo
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member) {
    return (
      <main style={{ padding: 40, maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          Mi perfil
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          Estás logueado como <strong>{user.email}</strong> pero no tienes un perfil de equipo asociado todavía.
        </p>
        <div style={{
          padding: 16,
          background: '#f5f3ff',
          border: '1px solid #ddd6fe',
          borderRadius: 12,
          fontSize: 13.5, color: '#5b21b6', lineHeight: 1.6,
        }}>
          Como admin/owner, tus datos no viven en <code>team_members</code> sino en Supabase Auth.
          Si quieres tener un perfil editable, créate un miembro desde <strong>Mi equipo</strong> con tu mismo email.
        </div>
      </main>
    )
  }

  /* Cargar nombre del rol para mostrarlo */
  const { data: rol } = await service
    .from('roles_predefinidos')
    .select('nombre')
    .eq('id', member.rol_base)
    .maybeSingle()

  if (!member.activo) {
    redirect('/login')
  }

  return (
    <PerfilForm
      member={member as TeamMember}
      rolNombre={rol?.nombre ?? member.rol_base}
    />
  )
}
