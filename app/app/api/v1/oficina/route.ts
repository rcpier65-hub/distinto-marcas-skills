// GET /api/v1/oficina
//
// Escritorios del mapa, quién los reclamó, salas y atajos.
// Caminar, hablar y reclamar un puesto sigue en la web.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { requireSessionMember } from '@/lib/api/session-member'
import { leerTableroOficina } from '@/lib/oficina/tablero'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response

  const tablero = await leerTableroOficina(auth.member.userId)
  const base = appBase()
  const linkOficina = `${base}/oficina`

  return NextResponse.json({
    ok: true,
    total: tablero.escritorios.length,
    escritorios: tablero.escritorios.map((puesto) => ({
      id: puesto.id,
      etiqueta: puesto.etiqueta,
      zona: puesto.zona,
      libre: puesto.libre,
      es_mio: puesto.esMio,
      ocupante: puesto.ocupante
        ? {
            user_id: puesto.ocupante.userId,
            nombre: puesto.ocupante.nombre,
            ultima_visita: puesto.ocupante.ultimaVisita,
          }
        : null,
      link: linkOficina,
    })),
    sin_puesto: tablero.sinPuesto.map((persona) => ({
      user_id: persona.userId,
      nombre: persona.nombre,
      ultima_visita: persona.ultimaVisita,
      link: linkOficina,
    })),
    zonas: tablero.zonas.map((zona) => ({
      ...zona,
      link: linkOficina,
    })),
    accesos: tablero.accesos.map((acceso) => ({
      id: acceso.id,
      titulo: acceso.titulo,
      icono: acceso.icono,
      link: `${base}${acceso.href}`,
    })),
  })
}
