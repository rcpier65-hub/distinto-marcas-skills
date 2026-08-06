// app/app/api/video/[id]/route.ts
//
// Sirve los videos de Drive al portal del cliente. Dos cosas que resuelve:
//
// 1) Drive NO le entrega el archivo a un <video> del navegador desde otro sitio
//    (da "Format error"); a una petición del SERVIDOR sí. Por eso hacemos de
//    intermediario.
//
// 2) Muchos videos vienen en H.265/HEVC (el "Alta eficiencia" del iPhone) y el
//    navegador no los sabe dibujar: se oye el audio y la imagen queda congelada.
//    En vez de montar un conversor (lento y caro), usamos el que YA hizo Google:
//    Drive guarda versiones convertidas de cada video para su propio reproductor
//    y las expone en get_video_info. Verificado: itag 37 devuelve
//    1080x1920 H.264 (avc1), video/mp4, con soporte de rangos. Encima pesa
//    ~6 MB en vez de 19-90 MB, así que carga más rápido.
//
// Reproducción → versión H.264 1080p de Google (se ve en cualquier navegador).
// Descarga (?dl=1) → archivo ORIGINAL de Drive (máxima calidad).
//
// Auth: solo con sesión (el <video> manda las cookies porque es del mismo
// dominio). Pedro 16-jul-2026.

import { getUser } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/* Ids de Drive: evita que nos usen de proxy abierto hacia cualquier URL. */
const ID_OK = /^[-\w]{20,60}$/

function urlOriginal(id: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
}

/* Las URLs de Google traen `expire` y están atadas a la IP de quien las pidió.
   Como las pide y las consume el MISMO servidor, sirven. Las guardamos un rato
   para no llamar a get_video_info en cada salto del video. */
type Cacheado = { url: string; expira: number }
const cacheStream = new Map<string, Cacheado>()

async function streamConvertido(id: string): Promise<string | null> {
  const hit = cacheStream.get(id)
  if (hit && hit.expira > Date.now() + 60_000) return hit.url
  try {
    const r = await fetch(`https://drive.google.com/get_video_info?docid=${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const p = new URLSearchParams(await r.text())
    if (p.get('status') !== 'ok') return null

    const streams = new Map<string, string>()
    for (const par of (p.get('fmt_stream_map') ?? '').split(',')) {
      const i = par.indexOf('|')
      if (i > 0) streams.set(par.slice(0, i), par.slice(i + 1))
    }
    // 37 = 1080x1920 · 22 = 720x1280 · 18 = 360p. De mejor a peor.
    const url = streams.get('37') ?? streams.get('22') ?? streams.get('18')
    if (!url) return null

    const expSeg = Number(new URL(url).searchParams.get('expire') ?? 0)
    cacheStream.set(id, { url, expira: expSeg ? expSeg * 1000 : Date.now() + 5 * 60_000 })
    return url
  } catch {
    return null
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const { id } = await params
  if (!ID_OK.test(id)) return new Response('Id inválido', { status: 400 })

  const q = new URL(req.url).searchParams
  const esDescarga = !!q.get('dl')
  const range = req.headers.get('range')
  const pedir = (url: string) => fetch(url, { headers: range ? { Range: range } : {}, cache: 'no-store' })

  /* Para VER: la versión convertida por Google (H.264, se ve en todos lados).
     Para DESCARGAR: el original, que es el de máxima calidad. */
  const convertido = esDescarga ? null : await streamConvertido(id)

  let upstream: Response
  try {
    upstream = await pedir(convertido ?? urlOriginal(id))
    /* Si la versión convertida falló (expiró, otra IP…), no dejamos al cliente
       sin video: reintentamos con el original. */
    if (convertido && !upstream.ok && upstream.status !== 206) {
      cacheStream.delete(id)
      upstream = await pedir(urlOriginal(id))
    }
  } catch {
    return new Response('No se pudo leer el video', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('El video no está disponible', { status: upstream.status })
  }

  const tipo = upstream.headers.get('content-type') ?? ''
  if (tipo.includes('text/html')) {
    return new Response('Drive no entregó el video (¿el archivo no es público?)', { status: 409 })
  }

  const headers = new Headers()
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }

  /* Drive etiqueta algunos videos como `application/octet-stream` sin criterio
     (verificado: mismo tipo de archivo, distinta etiqueta), y así el <video>
     decía "Format error" y la descarga se guardaba como .html. Acá solo pasan
     videos, así que forzamos el tipo correcto. */
  headers.set('content-type', tipo.startsWith('video/') ? tipo : 'video/mp4')
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=3600')

  /* Descarga: nombre legible y extensión .mp4 (antes bajaba el id sin extensión). */
  if (esDescarga) {
    const base = (q.get('name') ?? 'video')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'video'
    headers.set('content-disposition', `attachment; filename="${base}.mp4"`)
  }

  return new Response(upstream.body, { status: upstream.status, headers })
}
