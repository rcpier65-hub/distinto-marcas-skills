// app/app/api/drive/file/[id]/route.ts
//
// Sirve el contenido de un archivo del Drive de la marca, usando el token de la
// agencia. Así el cliente ve/abre el archivo dentro del portal sin cuenta de
// Google. Seguridad: solo clientes, y solo archivos dentro de la carpeta de su
// marca. Reenvía Range para reproducir videos por partes. Pedro 17-jul-2026.

import { getClienteActual } from '@/lib/cliente/get-cliente'
import { createServiceClient } from '@/lib/supabase/service'
import { metaArchivo, dentroDeRaiz, descargarArchivo, driveFolderId } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cliente = await getClienteActual()
  if (!cliente) return new Response('No autorizado', { status: 401 })

  const { id } = await params
  if (!/^[-\w]+$/.test(id)) return new Response('Id inválido', { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marca } = await service.from('marcas').select('drive_url').eq('id', cliente.marcaId).maybeSingle()
  const rootId = driveFolderId(marca?.drive_url)
  if (!rootId) return new Response('Sin Drive', { status: 404 })

  const meta = await metaArchivo(id)
  if (!meta) return new Response('Archivo no encontrado', { status: 404 })

  // El archivo debe estar dentro de la carpeta de la marca.
  const permitido = meta.parents.includes(rootId) || (await dentroDeRaiz(id, rootId, meta.token))
  if (!permitido) return new Response('Ese archivo no es de tu marca', { status: 403 })

  const range = req.headers.get('range')
  const up = await descargarArchivo(id, meta.token, range)
  if (!up.ok && up.status !== 206) return new Response('No se pudo leer el archivo', { status: up.status })

  const headers = new Headers()
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'content-type']) {
    const v = up.headers.get(h)
    if (v) headers.set(h, v)
  }
  if (!headers.get('content-type')) headers.set('content-type', meta.mimeType)
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=600')
  if (new URL(req.url).searchParams.get('dl')) {
    headers.set('content-disposition', `attachment; filename="${meta.name.replace(/[^\w.\- ]/g, '_')}"`)
  }
  return new Response(up.body, { status: up.status, headers })
}
