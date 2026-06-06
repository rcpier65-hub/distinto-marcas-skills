// app/app/api/auth/logout/route.ts
//
// Endpoint POST que cierra la sesión y redirige a /login.
// El form del sidebar manda POST aquí — usamos route handler en lugar
// de server action directa porque el sidebar es un client component y
// queremos que el botón funcione con form action="..." sin requerir
// importar la action del cliente (más simple y robusto).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  /* URL absoluta porque el redirect desde route handler requiere base */
  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
