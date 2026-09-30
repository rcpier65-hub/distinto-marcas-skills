import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esPedroEmail } from '@/lib/planes/catalogo'
import { PropuestasWorkspace } from './_components/propuestas-workspace'

export const dynamic = 'force-dynamic'

export default async function PlanesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !esPedroEmail(user.email)) {
    redirect('/inicio')
  }

  return <PropuestasWorkspace userId={user.id} />
}
