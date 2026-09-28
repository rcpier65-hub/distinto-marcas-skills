/* Comprime una imagen en el navegador antes de subirla: lado mayor máx.
   1600 px, WebP (o JPEG donde el navegador no sepa hacer WebP). Una captura
   de 3 MB queda en ~150–300 KB → el almacén no se llena.
   Los GIF chicos se mandan tal cual para no perder la animación. */

const LADO_MAX = 1600
const CALIDAD = 0.82
const GIF_MAX_BYTES = 2 * 1024 * 1024

export type ImagenLista = { blob: Blob; tipo: string; ancho: number; alto: number }

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad))
}

async function medir(file: Blob): Promise<{ ancho: number; alto: number }> {
  const bmp = await createImageBitmap(file)
  const r = { ancho: bmp.width, alto: bmp.height }
  bmp.close()
  return r
}

export async function comprimirImagen(file: File): Promise<ImagenLista> {
  if (!file.type.startsWith('image/')) throw new Error('No es una imagen')

  if (file.type === 'image/gif' && file.size <= GIF_MAX_BYTES) {
    return { blob: file, tipo: 'image/gif', ...(await medir(file)) }
  }

  const bmp = await createImageBitmap(file)
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height))
  const ancho = Math.max(1, Math.round(bmp.width * escala))
  const alto = Math.max(1, Math.round(bmp.height * escala))
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const g = canvas.getContext('2d')
  if (!g) { bmp.close(); throw new Error('Canvas no disponible') }
  g.drawImage(bmp, 0, 0, ancho, alto)
  bmp.close()

  /* Safari antiguo ignora 'image/webp' y devuelve PNG → probamos JPEG. */
  let blob = await aBlob(canvas, 'image/webp', CALIDAD)
  if (!blob || blob.type !== 'image/webp') blob = await aBlob(canvas, 'image/jpeg', CALIDAD)
  if (!blob) throw new Error('No se pudo comprimir la imagen')

  /* Si el original ya era más liviano (ej. PNG chiquito), mandamos el original. */
  if (file.size < blob.size && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && escala === 1) {
    return { blob: file, tipo: file.type, ancho, alto }
  }
  return { blob, tipo: blob.type, ancho, alto }
}
