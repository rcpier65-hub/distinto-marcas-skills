// app/lib/reportes/typhouse.ts
//
// Reporte mensual TYPHOUSE / LITTLE JOE — data migrada del Excel
// "typhouse-reporte.xlsx" (hojas Dashboard + Datos Mensuales + Notas).
// Pedro (11-ago-2026): "no quiero que usen ese excel — muda toda esa data
// a la app". Este archivo ES la fuente de verdad ahora.
//
// Para agregar un MES NUEVO: añade una fila a DATA_MENSUAL con los campos
// crudos (mismos que las columnas azules del Excel). Todo lo demás
// (costos, CAC, ROAS, retail, etc.) se CALCULA solo con las mismas
// fórmulas del Excel — no pongas derivados a mano.
//
// Fórmulas (verificadas contra la hoja Dashboard, julio 2026):
//   gastoAdsSoles   = gastoAdsUsd × tipoCambio × (1 + igv)
//   ventasWhatsApp  = ventasTotales − ventasShopify
//   conversion      = ventasTotales / leads
//   costoMensaje    = gastoAdsSoles / leads
//   costoVenta      = gastoAdsSoles / ventasTotales
//   ticketPromedio  = ingresoDirecto / ventasTotales
//   roasDirecto     = ingresoDirecto / gastoAdsSoles
//   gastoMktTotal   = gastoAdsSoles + gestion×(1+igv)   ← la gestión también lleva IGV
//   ventasRetail    = ventasOmnicanal − ingresoDirecto
//   clientesRetail  = ventasRetail / ticketPromedio      (estimado)
//   clientesOmni    = ventasTotales + clientesRetail     (estimado)
//   cacDirecto      = gastoMktTotal / ventasTotales
//   cacOmnicanal    = gastoMktTotal / clientesOmni

export type MesRaw = {
  mes: string            // 'YYYY-MM'
  leads: number          // Leads entrantes (WhatsApp) — Meta Ads API
  ventasShopify: number  // pedidos — Shopify Admin API
  ingresoShopify: number // S/ — Shopify Admin API
  ventasTotales: number  // pedidos confirmados por el equipo (registro embudo WhatsApp)
  ingresoDirecto: number // S/ — total directo confirmado
  ventasOmnicanal: number// S/ — incluye retail física (Falabella/Tottus/Sodimac)
  gastoAdsUsd: number    // Meta Ads API
  tipoCambio: number     // SUNAT del mes
  igv: number            // 0.18
}

/* Fee fijo mensual de gestión de marketing (S/, sin IGV) — hoja Dashboard. */
export const COSTO_GESTION = 1800

/* ══════════ DATA CRUDA (editable — 1 fila por mes) ══════════ */
export const DATA_MENSUAL: MesRaw[] = [
  { mes: '2026-01', leads: 2619, ventasShopify: 275, ingresoShopify: 20546.58, ventasTotales: 751, ingresoDirecto: 46687, ventasOmnicanal: 110000, gastoAdsUsd: 1241.89, tipoCambio: 3.357, igv: 0.18 },
  { mes: '2026-02', leads: 2073, ventasShopify: 176, ingresoShopify: 12839.03, ventasTotales: 641, ingresoDirecto: 41506, ventasOmnicanal: 91000, gastoAdsUsd: 1477.67, tipoCambio: 3.357, igv: 0.18 },
  { mes: '2026-03', leads: 2177, ventasShopify: 232, ingresoShopify: 16514.08, ventasTotales: 673, ingresoDirecto: 44100, ventasOmnicanal: 76200, gastoAdsUsd: 1801.45, tipoCambio: 3.447, igv: 0.18 },
  { mes: '2026-04', leads: 1610, ventasShopify: 52, ingresoShopify: 3660.51, ventasTotales: 478, ingresoDirecto: 30857, ventasOmnicanal: 59592, gastoAdsUsd: 1310.64, tipoCambio: 3.443, igv: 0.18 },
  { mes: '2026-05', leads: 1625, ventasShopify: 102, ingresoShopify: 8439.58, ventasTotales: 405, ingresoDirecto: 26911, ventasOmnicanal: 60512, gastoAdsUsd: 1406.48, tipoCambio: 3.435, igv: 0.18 },
  { mes: '2026-06', leads: 1147, ventasShopify: 157, ingresoShopify: 13236.30, ventasTotales: 437, ingresoDirecto: 31460, ventasOmnicanal: 81400, gastoAdsUsd: 1476.31, tipoCambio: 3.405, igv: 0.18 },
  { mes: '2026-07', leads: 1015, ventasShopify: 125, ingresoShopify: 10395.71, ventasTotales: 339, ingresoDirecto: 28748, ventasOmnicanal: 65000, gastoAdsUsd: 1500.78, tipoCambio: 3.41, igv: 0.18 },
]

/* ══════════ MÉTRICAS DERIVADAS (mismas fórmulas del Excel) ══════════ */
export type MesReporte = MesRaw & {
  gastoAdsSoles: number
  ventasWhatsApp: number
  conversion: number
  costoMensaje: number
  costoVenta: number
  ticketPromedio: number
  roasDirecto: number
  gastoMktTotal: number
  ventasRetail: number
  pctRetail: number
  clientesRetail: number
  clientesOmni: number
  cacDirecto: number
  cacOmnicanal: number
}

export function computeMes(r: MesRaw): MesReporte {
  const gastoAdsSoles = r.gastoAdsUsd * r.tipoCambio * (1 + r.igv)
  const ventasWhatsApp = r.ventasTotales - r.ventasShopify
  const ticketPromedio = r.ingresoDirecto / r.ventasTotales
  const gastoMktTotal = gastoAdsSoles + COSTO_GESTION * (1 + r.igv)
  const ventasRetail = r.ventasOmnicanal - r.ingresoDirecto
  const clientesRetail = ventasRetail / ticketPromedio
  const clientesOmni = r.ventasTotales + clientesRetail
  return {
    ...r,
    gastoAdsSoles,
    ventasWhatsApp,
    conversion: r.ventasTotales / r.leads,
    costoMensaje: gastoAdsSoles / r.leads,
    costoVenta: gastoAdsSoles / r.ventasTotales,
    ticketPromedio,
    roasDirecto: r.ingresoDirecto / gastoAdsSoles,
    gastoMktTotal,
    ventasRetail,
    pctRetail: ventasRetail / r.ventasOmnicanal,
    clientesRetail,
    clientesOmni,
    cacDirecto: gastoMktTotal / r.ventasTotales,
    cacOmnicanal: gastoMktTotal / clientesOmni,
  }
}

export function getReporteTyphouse(): MesReporte[] {
  return DATA_MENSUAL.map(computeMes)
}

export const MES_LABEL: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

export function labelMes(mes: string): string {
  const [y, m] = mes.split('-')
  return `${MES_LABEL[m] ?? m} ${y}`
}
