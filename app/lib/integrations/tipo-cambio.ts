// app/lib/integrations/tipo-cambio.ts
// Tipo de cambio oficial SUNAT (venta) del ÚLTIMO día hábil del mes.
// Fuente pública: api.apis.net.pe (v1, sin token). Pedro 02-oct-2026.
// Respaldo: BCRP serie PD04640PD (SBS venta).
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
  /* Respaldo (21-oct-2026: apis.net.pe responde 429): serie oficial del BCRP
     «TC Sistema bancario SBS – Venta» (PD04640PD), la misma que publica SUNAT.
     Se toma el último día con dato del mes (o el más reciente si el mes sigue). */
  try {
    const hoy = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)
    const fin = ultimo.toISOString().slice(0, 10)
    const desde = `${mes}-01`, hasta = fin < hoy ? fin : hoy
    const r = await fetch(`https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04640PD/json/${desde}/${hasta}`, { signal: AbortSignal.timeout(10000) })
    if (r.ok) {
      /* El JSON del BCRP a veces viene mal formado: se leen los valores en orden. */
      const t = await r.text()
      const vals = [...t.matchAll(/"values"\s*:\s*\[\s*"([\d.]+)"/g)].map(m => Number(m[1])).filter(v => v > 2 && v < 6)
      if (vals.length) return vals[vals.length - 1]
    }
  } catch { /* sin respaldo disponible */ }
  return null
}
