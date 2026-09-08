'use client'

/* Formulario del PORTAL cliente para cargar/editar data cruda del reporte
   mensual. Misma UX/mapping que staff vía mes-form.ts (Campos UI → MesRaw).
   Marca forzada a la del cliente autenticado; requiere PIN de reportes. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { guardarMesReporteCliente } from '../_reporte-actions'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'
import {
  type MesFormCampos,
  MES_FORM_HELP,
  MES_FORM_LABELS,
  camposAMesRaw,
  camposDesdeMes,
  previewDesdeCampos,
  sigMes,
  vacioMesForm,
} from '@/lib/reportes/mes-form'

export function EditorMesCliente({ marcaNombre, meses }: {
  marcaNombre: string
  meses: MesReporte[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<string>('nuevo')
  const [c, setC] = useState<MesFormCampos>(() => vacioMesForm(sigMes(meses[meses.length - 1]?.mes)))
  const [pending, setPending] = useState(false)

  function elegir(v: string) {
    setEditando(v)
    if (v === 'nuevo') setC(vacioMesForm(sigMes(meses[meses.length - 1]?.mes)))
    else {
      const m = meses.find((x) => x.mes === v)
      if (m) setC(camposDesdeMes(m))
    }
  }

  const set = (k: keyof MesFormCampos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setC((s) => ({ ...s, [k]: e.target.value }))

  async function guardar() {
    if (pending) return
    setPending(true)
    const raw = camposAMesRaw(c)
    const r = await guardarMesReporteCliente(raw)
    setPending(false)
    if (r.ok) {
      toast.success(`Mes ${labelMes(c.mes)} guardado — el reporte se actualiza al instante`)
      setAbierto(false)
      router.refresh()
    } else toast.error(r.error)
  }

  const F = ({ k, label, ph, pre, readOnly }: {
    k: keyof MesFormCampos; label: string; ph?: string; pre?: string; readOnly?: boolean
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
  const preview = previewDesdeCampos(c)

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
            <F k="mes" label={MES_FORM_LABELS.mes} ph="2026-08" readOnly={editando !== 'nuevo'} />
            <F k="leads" label={MES_FORM_LABELS.leads} ph="1015" />
            <F k="ventasShopify" label={MES_FORM_LABELS.ventasShopify} ph="125" readOnly={shopifyBloqueado} />
            <F k="ingresoShopify" label={MES_FORM_LABELS.ingresoShopify} pre="S/" ph="10395.71" readOnly={shopifyBloqueado} />
            <F k="pedidosWhatsApp" label={MES_FORM_LABELS.pedidosWhatsApp} ph="214" />
            <F k="ingresoWhatsAppSoles" label={MES_FORM_LABELS.ingresoWhatsAppSoles} pre="S/" ph="18352.29" />
            <F k="retailIndirectoSoles" label={MES_FORM_LABELS.retailIndirectoSoles} pre="S/" ph="36252" />
            <F k="gastoAdsUsd" label={MES_FORM_LABELS.gastoAdsUsd} pre="US$" ph="1500.78" />
            <F k="tipoCambio" label={MES_FORM_LABELS.tipoCambio} ph="3.41" />
            <F k="igv" label={MES_FORM_LABELS.igv} ph="0.18" />
          </div>

          <div className="rounded-xl border bg-muted/30 px-3 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Ventas totales (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">{preview.ventasTotales || '—'}</span>
              <span className="ml-1">= Shopify + pedidos WA</span>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Ingreso directo (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">
                S/ {preview.ingresoDirecto ? preview.ingresoDirecto.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="ml-1">= Shopify + ingreso WA</span>
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
            {MES_FORM_HELP}
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
