'use client'

/* Formulario staff para CARGAR la data mensual del reporte.
   Misma UX/mapping que el portal cliente (Campos UI → MesRaw vía mes-form.ts).
   Extras staff: eliminar mes + marcaSlug en guardarMesReporte. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { guardarMesReporte, eliminarMesReporte } from '../_actions'
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

export function EditorMes({ marcaSlug, marcaNombre, meses }: {
  marcaSlug: string; marcaNombre: string; meses: MesReporte[]
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
    const r = await guardarMesReporte({ marcaSlug, ...raw })
    setPending(false)
    if (r.ok) {
      toast.success(`✅ ${labelMes(c.mes)} guardado — el reporte ya lo muestra (interno y portal del cliente)`)
      setAbierto(false)
      router.refresh()
    } else toast.error(r.error)
  }

  async function eliminar() {
    if (editando === 'nuevo' || pending) return
    if (!confirm(`¿Quitar lo guardado de ${labelMes(editando)}? (si el mes venía del Excel original, vuelve a esos valores)`)) return
    setPending(true)
    const r = await eliminarMesReporte(marcaSlug, editando)
    setPending(false)
    if (r.ok) { toast.success('Mes eliminado'); setAbierto(false); router.refresh() }
    else toast.error(r.error)
  }

  const F = ({ k, label, ph, pre }: { k: keyof MesFormCampos; label: string; ph?: string; pre?: string }) => (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {pre && <span className="text-xs text-muted-foreground shrink-0">{pre}</span>}
        <input value={c[k]} onChange={set(k)} placeholder={ph} inputMode="decimal"
          className="w-full h-9 px-2.5 rounded-lg border bg-background text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
    </label>
  )

  const preview = previewDesdeCampos(c)

  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-4">
      {!abierto ? (
        <button onClick={() => setAbierto(true)}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-colors">
          ＋ Agregar / editar mes de {marcaNombre}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold">📝 Data del mes · {marcaNombre}</span>
            <select value={editando} onChange={(e) => elegir(e.target.value)}
              className="h-8 px-2 rounded-lg border bg-background text-xs font-semibold">
              <option value="nuevo">➕ Mes nuevo</option>
              {meses.map((m) => <option key={m.mes} value={m.mes}>✏️ {labelMes(m.mes)}</option>)}
            </select>
            <button onClick={() => setAbierto(false)} className="ml-auto h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">✕ Cerrar</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <F k="mes" label={MES_FORM_LABELS.mes} ph="2026-08" />
            <F k="leads" label={MES_FORM_LABELS.leads} ph="1015" />
            <F k="ventasShopify" label={MES_FORM_LABELS.ventasShopify} ph="125" />
            <F k="ingresoShopify" label={MES_FORM_LABELS.ingresoShopify} pre="S/" ph="10395.71" />
            <F k="ventasTotales" label={MES_FORM_LABELS.ventasTotales} ph="339" />
            <F k="ingresoDirecto" label={MES_FORM_LABELS.ingresoDirecto} pre="S/" ph="28748" />
            <F k="retailIndirectoSoles" label={MES_FORM_LABELS.retailIndirectoSoles} pre="S/" ph="36252" />
            <F k="gastoAdsUsd" label={MES_FORM_LABELS.gastoAdsUsd} pre="US$" ph="1500.78" />
            <F k="tipoCambio" label={MES_FORM_LABELS.tipoCambio} ph="3.41" />
            <F k="igv" label={MES_FORM_LABELS.igv} ph="0.18" />
          </div>

          <div className="rounded-xl border bg-muted/30 px-3 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Pedidos WhatsApp (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">{preview.pedidosWhatsApp || '—'}</span>
              <span className="ml-1">= totales − Shopify</span>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block">Ingreso WhatsApp (calc.)</span>
              <span className="tabular-nums text-foreground font-semibold">
                S/ {preview.ingresoWhatsApp ? preview.ingresoWhatsApp.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="ml-1">= directo − Shopify</span>
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
          </p>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={pending}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
              {pending ? 'Guardando…' : 'Guardar mes'}
            </button>
            {editando !== 'nuevo' && (
              <button onClick={eliminar} disabled={pending}
                className="h-10 px-4 rounded-xl border text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50">
                🗑 Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
