'use client'

/* Formulario para CARGAR la data mensual del reporte desde la interfaz
   (reemplaza el Excel). Solo campos CRUDOS — todo lo derivado (CAC, ROAS,
   costo por venta, retail, etc.) se calcula solo con las fórmulas de siempre.
   Editar un mes existente lo pre-llena; guardar pisa ese mes (la base gana
   sobre el seed del código). */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { guardarMesReporte, eliminarMesReporte } from '../_actions'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'

type Campos = {
  mes: string; leads: string; ventasShopify: string; ingresoShopify: string
  ventasTotales: string; ingresoDirecto: string; ventasOmnicanal: string
  gastoAdsUsd: string; tipoCambio: string; igv: string
}

function sigMes(ultimo?: string): string {
  if (!ultimo) { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  const [y, m] = ultimo.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

const VACIO = (mes: string): Campos => ({
  mes, leads: '', ventasShopify: '', ingresoShopify: '', ventasTotales: '',
  ingresoDirecto: '', ventasOmnicanal: '', gastoAdsUsd: '', tipoCambio: '3.41', igv: '0.18',
})

const DE_MES = (m: MesReporte): Campos => ({
  mes: m.mes, leads: String(m.leads), ventasShopify: String(m.ventasShopify),
  ingresoShopify: String(m.ingresoShopify), ventasTotales: String(m.ventasTotales),
  ingresoDirecto: String(m.ingresoDirecto), ventasOmnicanal: String(m.ventasOmnicanal),
  gastoAdsUsd: String(m.gastoAdsUsd), tipoCambio: String(m.tipoCambio), igv: String(m.igv),
})

export function EditorMes({ marcaSlug, marcaNombre, meses }: {
  marcaSlug: string; marcaNombre: string; meses: MesReporte[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<string>('nuevo') // 'nuevo' | 'YYYY-MM'
  const [c, setC] = useState<Campos>(() => VACIO(sigMes(meses[meses.length - 1]?.mes)))
  const [pending, setPending] = useState(false)

  function elegir(v: string) {
    setEditando(v)
    if (v === 'nuevo') setC(VACIO(sigMes(meses[meses.length - 1]?.mes)))
    else { const m = meses.find((x) => x.mes === v); if (m) setC(DE_MES(m)) }
  }

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setC((s) => ({ ...s, [k]: e.target.value }))

  async function guardar() {
    if (pending) return
    setPending(true)
    const n = (v: string) => Number(String(v).replace(',', '.'))
    const r = await guardarMesReporte({
      marcaSlug, mes: c.mes.trim(),
      leads: n(c.leads), ventasShopify: n(c.ventasShopify), ingresoShopify: n(c.ingresoShopify),
      ventasTotales: n(c.ventasTotales), ingresoDirecto: n(c.ingresoDirecto), ventasOmnicanal: n(c.ventasOmnicanal),
      gastoAdsUsd: n(c.gastoAdsUsd), tipoCambio: n(c.tipoCambio), igv: n(c.igv),
    })
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

  const F = ({ k, label, ph, pre }: { k: keyof Campos; label: string; ph?: string; pre?: string }) => (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {pre && <span className="text-xs text-muted-foreground shrink-0">{pre}</span>}
        <input value={c[k]} onChange={set(k)} placeholder={ph} inputMode="decimal"
          className="w-full h-9 px-2.5 rounded-lg border bg-background text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
    </label>
  )

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
            <F k="mes" label="Mes (AAAA-MM)" ph="2026-08" />
            <F k="leads" label="Leads WhatsApp" ph="1015" />
            <F k="ventasShopify" label="Ventas Shopify (pedidos)" ph="125" />
            <F k="ingresoShopify" label="Ingreso Shopify" pre="S/" ph="10395.71" />
            <F k="ventasTotales" label="Ventas totales (pedidos)" ph="339" />
            <F k="ingresoDirecto" label="Ingreso directo total" pre="S/" ph="28748" />
            <F k="ventasOmnicanal" label="Venta omnicanal total" pre="S/" ph="65000" />
            <F k="gastoAdsUsd" label="Gasto Ads" pre="US$" ph="1500.78" />
            <F k="tipoCambio" label="Tipo de cambio" ph="3.41" />
            <F k="igv" label="IGV" ph="0.18" />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Solo llenas la data cruda (la misma que las columnas azules del Excel). Conversión, costo por venta,
            ticket, ROAS, CAC y retail se calculan solos. Ventas WhatsApp = totales − Shopify.
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
