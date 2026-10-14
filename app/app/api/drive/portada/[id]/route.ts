import { getClienteActual } from '@/lib/cliente/get-cliente'
import { createServiceClient } from '@/lib/supabase/service'
import { idPortadaDrive, nombrePortada, tipoPortada } from '@/lib/cliente/portada'

export const dynamic = 'force-dynamic'
const MAX_BYTES = 25 * 1024 * 1024
const noCache = { 'Cache-Control': 'private, no-store' }
function error(message: string, status: number) {
  return new Response(message, { status, headers: noCache })
}

// Se autoriza la publicación de la marca, no un ID de Drive enviado por el cliente.
// Descargar desde el mismo dominio evita la navegación/redirects de Drive en iPhone.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cliente = await getClienteActual()
  if (!cliente) return error('Inicia sesión en el portal de tu marca.', 401)
  const { id } = await params
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return error('Publicación inválida.', 400)
  const { data: pub, error: dbError } = await createServiceClient().from('publicaciones')
    .select('nombre, portada_editada_url, portada_cruda_url')
    .eq('id', id).eq('marca_id', cliente.marcaId)
    .maybeSingle<{ nombre: string | null; portada_editada_url: string | null; portada_cruda_url: string | null }>()
  if (dbError) return error('No se pudo consultar la portada. Intenta de nuevo.', 503)
  if (!pub) return error('La publicación no está disponible para tu marca.', 404)
  const fileId = idPortadaDrive(pub.portada_editada_url?.trim() || pub.portada_cruda_url)
  if (!fileId) return error('Esta publicación no tiene una portada de Drive disponible.', 404)

  try {
    // Mismo origen de descarga original usado para videos. El archivo ya está
    // compartido en Drive; no se cambian permisos ni se necesita login de Google.
    const upstream = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`, {
      cache: 'no-store', signal: AbortSignal.timeout(20000),
    })
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel()
      return error('No se pudo descargar la portada. Intenta de nuevo en unos momentos.', 502)
    }
    if (Number(upstream.headers.get('content-length')) > MAX_BYTES) {
      await upstream.body.cancel()
      return error('La portada supera el tamaño permitido. Pide al equipo una versión más ligera.', 413)
    }
    const chunks: Uint8Array[] = []
    let total = 0
    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BYTES) {
          await reader.cancel()
          return error('La portada supera el tamaño permitido. Pide al equipo una versión más ligera.', 413)
        }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const bytes = Buffer.concat(chunks, total)
    const tipo = tipoPortada(bytes)
    if (!tipo) return error('Drive no entregó una imagen. Pide al equipo que revise el archivo y su acceso.', 502)
    return new Response(bytes, { headers: {
      ...noCache,
      'Content-Type': tipo.mime,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `attachment; filename="${nombrePortada(pub.nombre ?? '', tipo.extension)}"`,
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (e) {
    const timeout = e instanceof Error && ['TimeoutError', 'AbortError'].includes(e.name)
    return error(timeout ? 'La descarga tardó demasiado. Intenta de nuevo.' : 'No se pudo descargar la portada. Intenta de nuevo.', timeout ? 504 : 502)
  }
}
