// app/lib/integrations/google-drive.ts
//
// Explorador de Drive DENTRO del portal del cliente. Usa el token de Google de
// la AGENCIA (el mismo que el calendario, tabla google_oauth_tokens id=1), así
// el cliente navega su carpeta SIN necesitar cuenta de Google.
//
// Seguridad: todo se limita a la carpeta raíz de la marca (drive_url). Antes de
// listar/servir cualquier carpeta o archivo verificamos que esté DENTRO de esa
// raíz (subiendo por sus "parents"), para que un cliente no pueda husmear otras
// carpetas de la agencia mandando ids ajenos. Pedro 17-jul-2026.

import 'server-only'
import { getValidAccessToken } from '@/lib/integrations/google-calendar'

const API = 'https://www.googleapis.com/drive/v3'
const COMUN = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

export type DriveItem = {
  id: string
  nombre: string
  mimeType: string
  esCarpeta: boolean
  esGoogleDoc: boolean
  webViewLink: string | null
  modificado: string | null
  tamano: number | null
}

/* Extrae el id de carpeta de un enlace de Drive. */
export function driveFolderId(url: string | null | undefined): string | null {
  if (!url) return null
  const u = String(url)
  return (u.match(/[?&]id=([-\w]+)/)?.[1]) ?? (u.match(/\/folders\/([-\w]+)/)?.[1]) ?? (u.match(/\/d\/([-\w]+)/)?.[1]) ?? null
}

async function tok(): Promise<string | null> {
  return getValidAccessToken()
}

/* ¿`itemId` es la raíz o desciende de ella? Sube por los parents (máx 15
   niveles) hasta encontrar la raíz. Con un pequeño cache por request. */
export async function dentroDeRaiz(itemId: string, rootId: string, token: string): Promise<boolean> {
  if (itemId === rootId) return true
  let actual = itemId
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${API}/files/${actual}?fields=id,parents&${COMUN}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    if (!res.ok) return false
    const data = await res.json()
    const parents: string[] = data.parents ?? []
    if (parents.includes(rootId)) return true
    if (parents.length === 0) return false
    actual = parents[0]
    if (actual === rootId) return true
  }
  return false
}

export type ListaDrive =
  | { ok: true; items: DriveItem[]; nombreCarpeta: string | null }
  | { ok: false; error: string; codigo: 'sin_token' | 'sin_permiso' | 'drive' }

/* Lista el contenido de una carpeta (verificando que esté dentro de la raíz). */
export async function listarCarpeta(folderId: string, rootId: string): Promise<ListaDrive> {
  const token = await tok()
  if (!token) return { ok: false, error: 'Google no está conectado', codigo: 'sin_token' }

  if (!(await dentroDeRaiz(folderId, rootId, token))) {
    return { ok: false, error: 'Esa carpeta no es de tu marca', codigo: 'sin_permiso' }
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime,size)')
  const res = await fetch(
    `${API}/files?q=${q}&fields=${fields}&pageSize=1000&orderBy=folder,name&${COMUN}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (!res.ok) {
    // 401/403 típicamente = falta el scope de Drive (no reconectó todavía).
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'Falta el permiso de Drive', codigo: 'sin_token' }
    return { ok: false, error: `Drive respondió ${res.status}`, codigo: 'drive' }
  }
  const data = await res.json()
  // Nombre de la carpeta actual (para el encabezado/breadcrumb).
  let nombreCarpeta: string | null = null
  try {
    const meta = await fetch(`${API}/files/${folderId}?fields=name&${COMUN}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (meta.ok) nombreCarpeta = (await meta.json()).name ?? null
  } catch { /* nombre es nice-to-have */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: DriveItem[] = (data.files ?? []).map((f: any) => {
    const mt = f.mimeType ?? ''
    return {
      id: f.id,
      nombre: f.name ?? 'Sin nombre',
      mimeType: mt,
      esCarpeta: mt === 'application/vnd.google-apps.folder',
      esGoogleDoc: mt.startsWith('application/vnd.google-apps.') && mt !== 'application/vnd.google-apps.folder',
      webViewLink: f.webViewLink ?? null,
      modificado: f.modifiedTime ?? null,
      tamano: f.size ? Number(f.size) : null,
    }
  })
  return { ok: true, items, nombreCarpeta }
}

export type ListaImagenes =
  | { ok: true; images: { id: string; name: string }[]; nombreCarpeta: string | null }
  | { ok: false; error: string; codigo: 'sin_token' | 'drive' }

/* Lista SOLO las imágenes de una carpeta, ordenadas por nombre. Uso INTERNO
   (editor de publicaciones) para armar el carrusel de preview — por eso NO
   restringe a la raíz de una marca (el equipo puede previsualizar cualquier
   carpeta de la agencia que pegue). Requiere el token de Drive de la agencia
   (scope drive.readonly). Pedro 25-jul-2026. */
export async function listarImagenes(folderId: string): Promise<ListaImagenes> {
  const token = await tok()
  if (!token) return { ok: false, error: 'Google Drive no está conectado', codigo: 'sin_token' }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`)
  const fields = encodeURIComponent('files(id,name,mimeType)')
  const res = await fetch(
    `${API}/files?q=${q}&fields=${fields}&pageSize=1000&orderBy=name_natural&${COMUN}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'Falta el permiso de Drive (reconecta Google)', codigo: 'sin_token' }
    return { ok: false, error: `Drive respondió ${res.status}`, codigo: 'drive' }
  }
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = ((data.files ?? []) as any[]).map((f) => ({ id: f.id as string, name: (f.name ?? '') as string }))
  let nombreCarpeta: string | null = null
  try {
    const meta = await fetch(`${API}/files/${folderId}?fields=name&${COMUN}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (meta.ok) nombreCarpeta = (await meta.json()).name ?? null
  } catch { /* nice-to-have */ }
  return { ok: true, images, nombreCarpeta }
}

/* Metadata mínima de un archivo (para el proxy). */
export async function metaArchivo(fileId: string): Promise<{ mimeType: string; name: string; parents: string[]; token: string } | null> {
  const token = await tok()
  if (!token) return null
  const res = await fetch(`${API}/files/${fileId}?fields=id,name,mimeType,parents&${COMUN}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  })
  if (!res.ok) return null
  const d = await res.json()
  return { mimeType: d.mimeType ?? 'application/octet-stream', name: d.name ?? 'archivo', parents: d.parents ?? [], token }
}

/* Descarga el contenido binario de un archivo (para servirlo en el portal).
   Reenvía Range para poder reproducir videos por partes. */
export async function descargarArchivo(fileId: string, token: string, range: string | null): Promise<Response> {
  return fetch(`${API}/files/${fileId}?alt=media&${COMUN}`, {
    headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
    cache: 'no-store',
  })
}
