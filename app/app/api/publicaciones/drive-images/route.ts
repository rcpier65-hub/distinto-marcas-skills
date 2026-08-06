// app/app/api/publicaciones/drive-images/route.ts
//
// Lista las imágenes de una carpeta de Drive para armar el CARRUSEL de preview
// en el editor de publicaciones. Uso INTERNO (equipo), no clientes.
// GET /api/publicaciones/drive-images?folder=ID
//
// Requiere Google Drive conectado (scope drive.readonly). Si el token no tiene
// Drive, devuelve codigo 'sin_token' para que la UI muestre "reconecta Google".

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { listarImagenes } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  await requireUser()
  // Solo equipo: un cliente no usa el editor interno.
  if (await getClienteActual()) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  const folder = new URL(req.url).searchParams.get('folder')
  if (!folder || !/^[-\w]+$/.test(folder)) {
    return NextResponse.json({ ok: false, error: 'Falta el id de carpeta' }, { status: 400 })
  }

  const r = await listarImagenes(folder)
  if (!r.ok) {
    const status = r.codigo === 'sin_token' ? 409 : 502
    return NextResponse.json(r, { status })
  }
  return NextResponse.json(r)
}
