// app/app/api/auth/logout/route.ts
//
// Endpoint POST que cierra la sesión y redirige a /login.
// El form del sidebar manda POST aquí — usamos route handler en lugar
// de server action directa porque el sidebar es un client component y
// queremos que el botón funcione con form action="..." sin requerir
// importar la action del cliente (más simple y robusto).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  /* Redirección relativa: detrás del proxy del VPS request.url es
     http://localhost:3000, y una URL absoluta mandaba al usuario ahí. */
  return new NextResponse(null, { status: 303, headers: { Location: '/login' } })
}
