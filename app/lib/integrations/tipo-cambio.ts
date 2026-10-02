// app/lib/integrations/tipo-cambio.ts
// Tipo de cambio oficial SUNAT (venta) del ÚLTIMO día hábil del mes.
// Fuente pública: api.apis.net.pe (v1, sin token). Pedro 02-oct-2026.
import 'server-only'

export async function tipoCambioSunatMes(mes: string): Promise<number | null> {
  const [y, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(y, m, 0))
  for (let i = 0; i < 6; i++) {
    const d = new Date(ultimo); d.setUTCDate(ultimo.getUTCDate() - i)
    const fecha = d.toISOString().slice(0, 10)
    try {
      const r = await fetch(`https://api.apis.net.pe/v1/tipo-cambio-sunat?fecha=${fecha}`, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const j = await r.json()
      const v = Number(j?.venta)
      if (v > 2 && v < 6) return v
    } catch { /* probar el día anterior */ }
  }
  return null
}
