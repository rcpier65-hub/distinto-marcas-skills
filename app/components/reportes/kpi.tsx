'use client'

import { COSTO_GESTION } from '@/lib/reportes/typhouse'

export const KPI_TIPS = {
  inversionMetaAds: 'Gasto en Meta Ads en soles (con IGV). Fórmula: gastoAdsUsd × tipoCambio × (1 + igv).',
  costoMensaje: 'Cuánto cuesta cada lead/mensaje de WhatsApp. Fórmula: gastoAdsSoles / leads.',
  ticketPromedio: 'Ingreso promedio por venta confirmada. Fórmula: ingresoDirecto / ventasTotales.',
  costoVenta: 'Inversión en ads por cada venta confirmada. Fórmula: gastoAdsSoles / ventasTotales.',
  conversion: 'Porcentaje de leads que terminan en venta. Fórmula: ventasTotales / leads.',
  roasDirecto: 'Retorno de la inversión en ads (solo canal directo). Fórmula: ingresoDirecto / gastoAdsSoles.',
  ingresoDirecto: 'Ventas en soles confirmadas por el equipo (Shopify + WhatsApp). Dato crudo del embudo.',
  gastoMktTotal: `Ads + fee de gestión (S/ ${COSTO_GESTION} + IGV). Fórmula: gastoAdsSoles + 1800 × (1 + igv).`,
  cacDirecto: 'Costo de adquirir cada venta directa. Fórmula: gastoMktTotal / ventasTotales.',
  cacOmnicanal: 'Costo estimado por cliente omnicanal (directo + retail estimado). Fórmula: gastoMktTotal / clientesOmni.',
  totalOmnicanal: 'Venta total del mes incluyendo retail física (Falabella / Tottus / Sodimac). Dato crudo omnicanal.',
  directoConfirmado: 'Parte del omnicanal atribuida al canal directo (Shopify + WhatsApp). Mismo ingreso directo del embudo.',
  retailIndirecto: 'Ventas fuera de Shopify / retail física (Falabella / Tottus / Sodimac). Fórmula: ventasOmnicanal − ingresoDirecto.',
  ventaDirectaWhatsApp: 'Ingreso WhatsApp (S/): soles de venta por WhatsApp, aparte de Shopify. No confundir con Pedidos WhatsApp (cantidad). Fórmula: ingresoDirecto − ingresoShopify.',
} as const

/** KPI card with optional info tooltip (hover/focus + title nativo). */
export function Kpi({ label, value, sub, delta, accent, tip }: {
  label: string; value: string; sub?: string; delta?: React.ReactNode; accent?: string; tip?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-1 min-w-0"
      style={accent ? { borderColor: accent, borderWidth: 1.5 } : undefined}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 min-w-0">
        <span className="truncate">{label}</span>
        {tip && (
          <span className="relative inline-flex shrink-0 group/tip align-middle"
            tabIndex={0} role="img" aria-label={tip} title={tip}>
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current/30 text-[9px] font-extrabold leading-none opacity-60 group-hover/tip:opacity-100 group-focus/tip:opacity-100 cursor-help select-none">
              i
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-2 text-[10px] font-medium normal-case tracking-normal leading-snug text-popover-foreground shadow-md opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible group-focus/tip:opacity-100 group-focus/tip:visible transition-opacity">
              {tip}
            </span>
          </span>
        )}
      </span>
      <span className="text-xl font-extrabold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        {delta}
      </div>
    </div>
  )
}
