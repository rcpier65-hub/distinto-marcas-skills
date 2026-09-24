import 'server-only'

/* Almacén de imágenes del chat. Hoy: Supabase Storage (bucket privado
   `chat`). La ruta guardada lleva prefijo de proveedor ('sb:') para poder
   sumar Cloudflare R2 ('r2:') sin romper las imágenes ya enviadas.
   Las imágenes llegan comprimidas desde el navegador (~200 KB). */

import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'chat'
const URL_VIGENCIA_SEG = 60 * 60 * 6  // 6 h

export const TIPOS_IMAGEN = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'] as const
export const MAX_BYTES = 5 * 1024 * 1024

export type SubidaPreparada = { proveedor: 'sb'; bucket: string; path: string; token: string; ref: string }

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }

/* Crea una URL firmada de SUBIDA para que el navegador suba directo el
   archivo (no pasa por nuestro servidor). */
export async function prepararSubida(carpeta: string, tipo: string): Promise<SubidaPreparada> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const path = `${carpeta}/${crypto.randomUUID()}.${EXT[tipo] ?? 'bin'}`
  const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data?.token) throw new Error(error?.message ?? 'No se pudo preparar la subida')
  return { proveedor: 'sb', bucket: BUCKET, path, token: data.token, ref: `sb:${path}` }
}

/* URLs firmadas de LECTURA para varias referencias ('sb:ruta'). Las que no se
   puedan firmar quedan fuera del mapa. */
export async function urlsDeLectura(refs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const sb = [...new Set(refs.filter((r) => r.startsWith('sb:')))]
  if (sb.length === 0) return out
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service.storage.from(BUCKET).createSignedUrls(sb.map((r) => r.slice(3)), URL_VIGENCIA_SEG)
  for (const d of (data ?? []) as { path: string | null; signedUrl: string | null }[]) {
    if (d.path && d.signedUrl) out.set(`sb:${d.path}`, d.signedUrl)
  }
  return out
}

/* Borra un archivo subido que al final no se usó (envío fallido). */
export async function borrarArchivo(ref: string): Promise<void> {
  if (!ref.startsWith('sb:')) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  await service.storage.from(BUCKET).remove([ref.slice(3)])
}
