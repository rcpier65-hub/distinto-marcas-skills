// Tablero de la oficina para el Mac: escritorios del mapa + quién los reclamó.
// El mapa caminable sigue en /oficina. Acá solo la lista que el panel web
// muestra bajo «Escritorios», más salas y objetos que abren otra ruta.

import { MUEBLES, ZONAS, zonaDe } from '@/app/oficina/_mapa'
import { leerPerfilesDb, type PerfilOficina } from '@/lib/oficina/db'

export type EscritorioTablero = {
  id: string
  etiqueta: string
  zona: string
  libre: boolean
  esMio: boolean
  ocupante: { userId: string; nombre: string | null; ultimaVisita: string | null } | null
}

export type PersonaSinPuesto = {
  userId: string
  nombre: string | null
  ultimaVisita: string | null
}

export type TableroOficina = {
  escritorios: EscritorioTablero[]
  sinPuesto: PersonaSinPuesto[]
  zonas: Array<{ id: string; nombre: string; emoji: string; color: string }>
  accesos: Array<{ id: string; titulo: string; icono: string; href: string }>
}

function zonaDeEscritorio(x: number, y: number): string {
  const zona = zonaDe(x + 0.5, y + 0.5)
  if (zona) return zona.nombre
  if (x >= 14 && x < 27 && y >= 1 && y < 12) return 'Open space'
  return 'Oficina'
}

function slugId(label: string): string {
  const plain = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const slug = plain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug.length > 0 ? slug : 'puesto'
}

function iso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function nombre(value: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function leerTableroOficina(userId: string): Promise<TableroOficina> {
  const perfiles = await leerPerfilesDb()
  const porEtiqueta = new Map<string, PerfilOficina>()
  for (const perfil of perfiles) {
    const etiqueta = typeof perfil.escritorio === 'string' ? perfil.escritorio : ''
    if (!etiqueta || porEtiqueta.has(etiqueta)) continue
    porEtiqueta.set(etiqueta, perfil)
  }

  const escritorios: EscritorioTablero[] = []
  const etiquetas = new Set<string>()
  for (const mueble of MUEBLES) {
    if (mueble.tipo !== 'escritorio' || !mueble.label) continue
    etiquetas.add(mueble.label)
    const perfil = porEtiqueta.get(mueble.label) ?? null
    escritorios.push({
      id: slugId(mueble.label),
      etiqueta: mueble.label,
      zona: zonaDeEscritorio(mueble.x, mueble.y),
      libre: !perfil,
      esMio: perfil?.user_id === userId,
      ocupante: perfil
        ? {
            userId: perfil.user_id,
            nombre: nombre(perfil.nombre),
            ultimaVisita: iso(perfil.ultima_visita),
          }
        : null,
    })
  }

  const sinPuesto: PersonaSinPuesto[] = []
  for (const perfil of perfiles) {
    const etiqueta = typeof perfil.escritorio === 'string' ? perfil.escritorio : ''
    if (etiqueta && etiquetas.has(etiqueta)) continue
    sinPuesto.push({
      userId: perfil.user_id,
      nombre: nombre(perfil.nombre),
      ultimaVisita: iso(perfil.ultima_visita),
    })
  }
  sinPuesto.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))

  const accesos: TableroOficina['accesos'] = []
  const vistos = new Set<string>()
  for (const mueble of MUEBLES) {
    if (!mueble.accion) continue
    const key = `${mueble.accion.href}|${mueble.accion.titulo}`
    if (vistos.has(key)) continue
    vistos.add(key)
    accesos.push({
      id: slugId(mueble.accion.titulo),
      titulo: mueble.accion.titulo,
      icono: mueble.accion.icono,
      href: mueble.accion.href,
    })
  }

  return {
    escritorios,
    sinPuesto,
    zonas: ZONAS.map((zona) => ({
      id: zona.id,
      nombre: zona.nombre,
      emoji: zona.emoji,
      color: zona.color,
    })),
    accesos,
  }
}
