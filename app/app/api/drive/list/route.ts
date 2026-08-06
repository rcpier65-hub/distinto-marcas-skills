// app/app/api/drive/list/route.ts
//
// Lista el contenido de una carpeta del Drive de la marca del cliente logueado.
// GET /api/drive/list?folder=ID  (si no viene folder, usa la raíz de la marca).
// Seguridad: solo clientes; solo la carpeta raíz de su marca y sus descendientes.

import { NextResponse } from 'next/server'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { createServiceClient } from '@/lib/supabase/service'
import { listarCarpeta, driveFolderId } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const cliente = await getClienteActual()
  if (!cliente) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marca } = await service.from('marcas').select('drive_url').eq('id', cliente.marcaId).maybeSingle()
  const rootId = driveFolderId(marca?.drive_url)
  if (!rootId) return NextResponse.json({ ok: false, error: 'Tu marca no tiene Drive configurado', codigo: 'sin_drive' }, { status: 404 })

  const pedido = new URL(req.url).searchParams.get('folder')
  const folderId = pedido && /^[-\w]+$/.test(pedido) ? pedido : rootId

  const r = await listarCarpeta(folderId, rootId)
  if (!r.ok) {
    const status = r.codigo === 'sin_permiso' ? 403 : r.codigo === 'sin_token' ? 409 : 502
    return NextResponse.json(r, { status })
  }
  return NextResponse.json({ ...r, folder: folderId, root: rootId })
}
