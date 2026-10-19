// app/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const pedido = searchParams.get('next') ?? '/dashboard'
  /* Solo rutas internas; redirección relativa porque detrás del proxy del VPS
     el origin de request.url es http://localhost:3000. */
  const next = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/dashboard'
  const ir = (destino: string) => new NextResponse(null, { status: 307, headers: { Location: destino } })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return ir(next)
    }

    console.error('[auth/callback] exchange error:', error.message)
  }

  // Si no hay code o falló el exchange
  return ir(`/login?error=${encodeURIComponent('No pudimos iniciar sesión. Probá de nuevo.')}`)
}
