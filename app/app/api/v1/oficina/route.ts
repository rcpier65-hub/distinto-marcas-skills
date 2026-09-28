// GET /api/v1/oficina
//
// Escritorios del mismo mapa que pinta /oficina (MUEBLES + ZONAS) y quién
// los reclamó (leerPerfilesDb). Caminar y reclamar un puesto sigue en la web.
// Auth: cookie, Bearer JWT, o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { requireSessionMember } from '@/lib/api/session-member'
import { leerPerfilesDb } from '@/lib/oficina/db'
import { MUEBLES, ZONAS } from '@/app/oficina/_mapa'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function zonaDe(x: number, y: number): string {
  const zona = ZONAS.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
  return zona?.nombre ?? 'Open space'
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response

  const perfiles = await leerPerfilesDb()
  const base = appBase()
  const linkOficina = `${base}/oficina`
  const escritorios = MUEBLES.filter((mueble) => mueble.tipo === 'escritorio')

  const filas = escritorios.map((puesto, index) => {
    const etiqueta = puesto.label?.trim() || `Puesto ${index + 1}`
    const ocupante = puesto.label
      ? perfiles.find((perfil) => perfil.escritorio === puesto.label) ?? null
      : null
    return {
      id: puesto.label ? `desk-${puesto.label.toLowerCase()}` : `desk-${puesto.x}-${puesto.y}`,
      etiqueta,
      zona: zonaDe(puesto.x, puesto.y),
      libre: !ocupante,
      es_mio: ocupante?.user_id === auth.member.userId,
      ocupante: ocupante
        ? {
            user_id: ocupante.user_id,
            nombre: ocupante.nombre,
            ultima_visita: ocupante.ultima_visita,
          }
        : null,
      link: linkOficina,
    }
  })

  const etiquetas = new Set(escritorios.map((puesto) => puesto.label).filter((label): label is string => !!label))
  const sinPuesto = perfiles
    .filter((perfil) => !perfil.escritorio || !etiquetas.has(perfil.escritorio))
    .map((persona) => ({
      user_id: persona.user_id,
      nombre: persona.nombre,
      ultima_visita: persona.ultima_visita,
      link: linkOficina,
    }))

  const accesos = MUEBLES.flatMap((mueble, index) => {
    if (!mueble.accion) return []
    return [{
      id: `acceso-${index}`,
      titulo: mueble.accion.titulo,
      icono: mueble.accion.icono,
      link: `${base}${mueble.accion.href}`,
    }]
  })

  return NextResponse.json({
    ok: true,
    total: filas.length,
    escritorios: filas,
    sin_puesto: sinPuesto,
    zonas: ZONAS.map((zona) => ({
      id: zona.id,
      nombre: zona.nombre,
      emoji: zona.emoji,
      color: zona.color,
      link: linkOficina,
    })),
    accesos,
  })
}
