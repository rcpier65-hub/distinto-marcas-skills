/** IDs de archivos de Drive; nunca aceptar una URL arbitraria como proxy. */
export function idPortadaDrive(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null
    const id = url.searchParams.get('id') ?? url.pathname.match(/\/d\/([^/]+)/)?.[1]
    return id && /^[\w-]{20,100}$/.test(id) ? id : null
  } catch { return null }
}

/** La respuesta debe contener una imagen real, no una página de acceso de Google. */
export function tipoPortada(bytes: Uint8Array): { mime: string; extension: string } | null {
  const inicio = (values: number[]) => values.every((n, i) => bytes[i] === n)
  if (inicio([137,80,78,71,13,10,26,10])) return { mime: 'image/png', extension: 'png' }
  if (inicio([255,216,255])) return { mime: 'image/jpeg', extension: 'jpg' }
  const text = (a: number, b: number) => String.fromCharCode(...bytes.subarray(a, b))
  if (['GIF87a', 'GIF89a'].includes(text(0, 6))) return { mime: 'image/gif', extension: 'gif' }
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' }
  if (text(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text(8, 12))) return { mime: 'image/avif', extension: 'avif' }
  return null
}

export function nombrePortada(titulo: string, extension: string): string {
  const base = titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `portada-${base || 'publicacion'}.${extension}`
}
