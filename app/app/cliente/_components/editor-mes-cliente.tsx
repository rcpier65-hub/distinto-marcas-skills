'use client'

/* Formulario del PORTAL cliente para cargar/editar data cruda del reporte
   mensual (retail / WA / omnicanal). Misma persistencia que el editor staff
   (guardarMesDb), pero la marca se FUERZA a la del cliente autenticado.
   Requiere el PIN de reportes ya desbloqueado (misma cookie).

   El cliente ingresa valores de negocio claros:
   - Venta Directa (Ventas por WhatsApp) en S/
   - Retail Indirecto (Ventas fuera de Shopify) en S/
   - Ventas WhatsApp (pedidos)
   Al guardar se mapean a MesRaw (ingresoDirecto / ventasOmnicanal / ventasTotales)
   sin tocar las fórmulas de typhouse.computeMes. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { guardarMesReporteCliente } from '../_reporte-actions'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'

type Campos = {
  mes: string
  leads: string
  ventasShopify: string
  ingresoShopify: string
  /** Pedidos confirmados por WhatsApp (no Shopify). */
  ventasWhatsAppPedidos: string
  /** S/ venta directa por WhatsApp (aparte de Shopify). */
  ventaDirectaWhatsAppSoles: string
  /** S/ retail / ventas fuera de Shopify (omnicanal − directo). */
  retailIndirectoSoles: string
  gastoAdsUsd: string
  tipoCambio: string
  igv: string
}

function sigMes(ultimo?: string): string {
  if (!ultimo) {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, m] = ultimo.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

const VACIO = (mes: string): Campos => ({
  mes,
  leads: '',
  ventasShopify: '',
  ingresoShopify: '',
  ventasWhatsAppPedidos: '',
  ventaDirectaWhatsAppSoles: '',
  retailIndirectoSoles: '',
  gastoAdsUsd: '',
  tipoCambio: '3.41',
  igv: '0.18',
})

/** Reverse-map MesRaw → campos de UI del cliente. */
const DE_MES = (m: MesReporte): Campos => ({
  mes: m.mes,
  leads: String(m.leads),
  ventasShopify: String(m.ventasShopify),
  ingresoShopify: String(m.ingresoShopify),
  ventasWhatsAppPedidos: String(Math.max(0, m.ventasTotales - m.ventasShopify)),
  ventaDirectaWhatsAppSoles: String(Math.max(0, m.ingresoDirecto - m.ingresoShopify)),
  retailIndirectoSoles: String(Math.max(0, m.ventasOmnicanal - m.ingresoDirecto)),
  gastoAdsUsd: String(m.gastoAdsUsd),
  tipoCambio: String(m.tipoCambio),
  igv: String(m.igv),
})

function n(v: string): number {
  return Number(String(v).replace(',', '.'))
}

/** Client UI → MesRaw (no cambia shape ni fórmulas de typhouse). */
function aMesRaw(c: Campos) {
  const leads = n(c.leads)
  const ventasShopify = n(c.ventasShopify)
  const ingresoShopify = n(c.ingresoShopify)
  const ventasWhatsAppPedidos = n(c.ventasWhatsAppPedidos)
  const ventaDirectaWhatsAppSoles = n(c.ventaDirectaWhatsAppSoles)
  const retailIndirectoSoles = n(c.retailIndirectoSoles)
  const gastoAdsUsd = n(c.gastoAdsUsd)
  const tipoCambio = n(c.tipoCambio)
  const igv = n(c.igv)

  const ingresoDirecto = ingresoShopify + ventaDirectaWhatsAppSoles
  const ventasOmnicanal = ingresoDirecto + retailIndirectoSoles
  const ventasTotales = ventasShopify + ventasWhatsAppPedidos

  return {
    mes: c.mes.trim(),
    leads,
    ventasShopify,
    ingresoShopify,
    ventasTotales,
    ingresoDirecto,
    ventasOmnicanal,
    gastoAdsUsd,
    tipoCambio,
    igv,
  }
}

export function EditorMesCliente({ marcaNombre, meses }: {
  marcaNombre: string
  meses: MesReporte[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<string>('nuevo')
  const [c, setC] = useState<Campos>(() => VACIO(sigMes(meses[meses.length - 1]?.mes)))
  const [pending, setPending] = useState(false)

  function elegir(v: string) {
    setEditando(v)
    if (v === 'nuevo') setC(VACIO(sigMes(meses[meses.length - 1]?.mes)))
    else {
      const m = meses.find((x) => x.mes === v)
      if (m) setC(DE_MES(m))
    }
  }

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setC((s) => ({ ...s, [k]: e.target.value }))

  async function guardar() {
    if (pending) return
    setPending(true)
    const raw = aMesRaw(c)
    const r = await guardarMesReporteCliente(raw)
    setPending(false)
    if (r.ok) {
      toast.success(`Mes ${labelMes(c.mes)} guardado — el reporte se actualiza al instante`)
      setAbierto(false)
      router.refresh()
    } else toast.error(r.error)
  }

  const F = ({ k, label, ph, pre, readOnly }: {
    k: keyof Campos; label: string; ph?: string; pre?: string; readOnly?: boolean
  }) => (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {pre && <span className="text-xs text-muted-foreground shrink-0">{pre}</span>}
        <input
          value={c[k]}
          onChange={set(k)}
          placeholder={ph}
          inputMode="decimal"
          readOnly={readOnly}
          className={`w-full h-9 px-2.5 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 ${readOnly ? 'bg-muted/50 text-muted-foreground' : 'bg-background'}`}
        />
      </div>
    </label>
  )

  const shopifyBloqueado = editando !== 'nuevo' && (Number(c.ventasShopify) > 0 || Number(c.ingresoShopify) > 0)

  // Totales derivados (solo lectura / de-énfasis) para que el cliente vea el resultado
  const preview = (() => {
    const ingresoShopify = n(c.ingresoShopify) || 0
    const ventaWA = n(c.ventaDirectaWhatsAppSoles) || 0
    const retail = n(c.retailIndirectoSoles) || 0
    const vShopify = n(c.ventasShopify) || 0
    const vWA = n(c.ventasWhatsAppPedidos) || 0
    const ingresoDirecto = ingresoShopify + ventaWA
    return {
      ingresoDirecto,
      ventasOmnicanal: ingresoDirecto + retail,
      ventasTotales: vShopify + vWA,
    }
  })()

  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-4 mb-4">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
        >
          + Cargar / editar datos del mes · {marcaNombre}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold">Data del mes · {marcaNombre}</span>
            <select
              value={editando}
              onChange={(e) => elegir(e.target.value)}
              className="h-8 px-2 rounded-lg border bg-background text-xs font-semibold"
            >
              <option value="nuevo">Mes nuevo</option>
              {meses.map((m) => (
                <option key={m.mes} value={m.mes}>{labelMes(m.mes)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="ml-auto h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-muted"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <F k="mes" label="Mes (AAAA-MM)" ph="2026-08" readOnly={editando !== 'nuevo'} />
            <F k="leads" label="Leads WhatsApp" ph="1015" />
            <F k="ventasShopify" label="Ventas Shopify (pedidos)" ph="125" readOnly={shopifyBloqueado} />
            <F k="ingresoShopify" label="Ingreso Shopify" pre="S/" ph="10395.71" readOnly={shopifyBloqueado} />
            <F k="ventasWhatsAppPedidos" label="Ventas WhatsApp (pedidos)" ph="214" />
            <F k="ventaDirectaWhatsAppSoles" label="Venta Directa (Ventas por WhatsApp)" pre="S/" ph="18352.29" />
            <F k="retailIndirectoSoles" label="Retail Indirecto (Ventas fuera de Shopify)" pre="S/" ph="36252" />
            <F k="gastoAdsUsd" label="Gasto Ads" pre="US$" ph="1500.78" />
            <F k="tipoCambio" label="Tipo de cambio" ph="3.41" />
            <F k="igv" label="IGV" ph="0.18" />
          </div>

          <div className="rounded-xl border bg-muted/30 px-3 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Ventas totales (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">{preview.ventasTotales || '—'}</span>
              <span className="ml-1">= Shopify + WA pedidos</span>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Ingreso directo (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">
                S/ {preview.ingresoDirecto ? preview.ingresoDirecto.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="ml-1">= Shopify + venta WA</span>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Omnicanal (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">
                S/ {preview.ventasOmnicanal ? preview.ventasOmnicanal.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="ml-1">= directo + retail</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ingresa venta directa por WhatsApp (S/), retail indirecto fuera de Shopify (S/) y pedidos WhatsApp.
            Ingreso directo, omnicanal y ventas totales se calculan solos; conversion, costo por venta, ticket, ROAS, CAC y retail del dashboard también.
            {shopifyBloqueado ? ' Los campos Shopify ya cargados se muestran solo lectura.' : ''}
            {' '}Solo se guarda en tu marca.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={pending}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
            >
              {pending ? 'Guardando…' : 'Guardar mes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
