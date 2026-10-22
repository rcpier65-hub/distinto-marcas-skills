import { createHash } from 'node:crypto'
import { z } from 'zod'
import { getUser } from '@/lib/auth/get-user'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { strategyDB } from '@/lib/estrategia/db'
import { decryptAccess, verifyAccessPin } from '@/lib/cliente/access-crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const input = z.object({ marcaId: z.string().uuid(), resource: z.enum(['catalogos', 'reclamos']), codigo: z.string().min(1).max(16) }).strict()
const reply = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' },
})

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin'), host = req.headers.get('host') || new URL(req.url).host
    if (!origin || new URL(origin).host !== host) return reply({ error: 'Origen no permitido' }, 403)
    const user = await getUser()
    if (!user) return reply({ error: 'Inicia sesión para continuar' }, 401)
    const cliente = await getClienteActual()
    if (!cliente) return reply({ error: 'Acceso exclusivo del cliente de la marca' }, 403)
    const raw = await req.text()
    if (raw.length > 1024) return reply({ error: 'Solicitud inválida' }, 400)
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return reply({ error: 'Solicitud inválida' }, 400) }
    const body = input.safeParse(parsed)
    if (!body.success) return reply({ error: 'Solicitud inválida' }, 400)
    const { marcaId, resource, codigo } = body.data
    if (marcaId !== cliente.marcaId) return reply({ error: 'Sin acceso a esta marca' }, 403)
    const db = strategyDB()
    const { rows: brands } = await db.query('select id from marcas where id=$1 and activa=true', [marcaId])
    if (!brands.length) return reply({ error: 'Marca no disponible' }, 403)
    // Shared across workers/restarts; bounded per user and brand, across both keys.
    for (const [key, limit] of [[`client-access:user:${user.id}:${marcaId}`, 5], [`client-access:brand:${marcaId}`, 30]] as const) {
      const hash = createHash('sha256').update(key).digest('hex')
      const { rows } = await db.query('select booking_rate_limit($1,$2,900) as allowed', [hash, limit])
      if (rows[0]?.allowed !== true) return reply({ error: 'Demasiados intentos. Espera 15 minutos antes de volver a probar.' }, 429)
    }
    const { rows } = await db.query('select ciphertext,pin_hash from client_portal_access where marca_id=$1 and resource=$2', [marcaId, resource])
    const stored = rows[0]
    if (!stored) return reply({ error: 'Este acceso todavía no está disponible. Contacta a tu equipo.' }, 404)
    if (!verifyAccessPin(codigo, stored.pin_hash)) return reply({ error: 'Código incorrecto' }, 403)
    return reply({ password: decryptAccess(stored.ciphertext, marcaId, resource), expiresAt: Date.now() + 60000 })
  } catch {
    // Neither provider errors nor private payloads go to logs/responses.
    return reply({ error: 'No se pudo consultar el acceso. Intenta nuevamente más tarde.' }, 503)
  }
}
