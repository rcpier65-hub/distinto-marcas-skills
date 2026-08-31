'use client'

/* Soporte DENTRO del portal del cliente — reemplaza a "Observaciones".
   Pedro 31-ago-2026: "pon enviar un reporte a soporte, que salga lo mismo que
   tenemos ya en el sistema de soporte, que escriban puedan subir captura y más".
   Misma mecánica que /soporte del equipo: tipo (falla/pedido/consulta), texto
   con dictado, capturas (subir, o pegar con Ctrl+V), y la lista de SUS reportes
   con el estado que va marcando el equipo. */

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LifeBuoy, Bug, Lightbulb, HelpCircle, ImagePlus, X, Mic, MicOff, Send, Loader2, CheckCircle2, Clock, Eye } from 'lucide-react'
import { useDictado } from '@/lib/hooks/use-dictado'
import { subirImagenSoporteCliente, crearReporteSoporteCliente } from '../_actions'

export type ReporteClienteItem = {
  id: string
  tipo: string           // falla | pedido | consulta
  descripcion: string
  estado: string         // pendiente | en_proceso | resuelto
  notaResolucion: string | null
  imagenes: string[]
  createdAt: string
}

const TIPO_META: Record<string, { label: string; color: string; bg: string; Icono: typeof Bug }> = {
  falla:    { label: 'Algo falla',   color: '#dc2626', bg: '#fef2f2', Icono: Bug },
  pedido:   { label: 'Un pedido',    color: '#d97706', bg: '#fffbeb', Icono: Lightbulb },
  consulta: { label: 'Una consulta', color: '#2563eb', bg: '#eff6ff', Icono: HelpCircle },
}

const ESTADO_META: Record<string, { label: string; color: string; Icono: typeof Clock }> = {
  pendiente:  { label: 'Enviado',            color: '#d97706', Icono: Clock },
  en_proceso: { label: 'Lo están viendo',    color: '#2563eb', Icono: Eye },
  resuelto:   { label: 'Resuelto',           color: '#16a34a', Icono: CheckCircle2 },
}

function fmtFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '' }
}

export function SoporteClienteView({ reportes, color }: { reportes: ReporteClienteItem[]; color: string }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<'falla' | 'pedido' | 'consulta'>('consulta')
  const [texto, setTexto] = useState('')
  const [imgs, setImgs] = useState<string[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [enviando, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const { soportado: vozOk, grabando, parcial, alternar, parar } = useDictado({
    onFinal: (frag) => setTexto((cur) => ((cur ? cur + ' ' : '') + frag).slice(0, 2000)),
    onError: (m) => toast.error(m),
  })

  async function subirArchivos(files: File[]) {
    if (files.length === 0) return
    if (imgs.length + files.length > 6) { toast.error('Máximo 6 capturas por reporte'); return }
    setSubiendo(true)
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      const r = await subirImagenSoporteCliente(fd)
      if (r.ok) setImgs((cur) => [...cur, r.url])
      else toast.error(r.error)
    }
    setSubiendo(false)
  }

  function enviar() {
    parar()  // detener el dictado: que no repueble el textarea tras limpiar
    const t = texto.trim()
    if (!t) { toast.error('Cuéntanos qué pasó o qué necesitas'); return }
    start(async () => {
      const r = await crearReporteSoporteCliente(tipo, t, imgs)
      if (!r.ok) { toast.error(r.error); return }
      setTexto(''); setImgs([])
      toast.success('¡Enviado! El equipo ya recibió tu reporte. 💙')
      router.refresh()
    })
  }

  const PLACEHOLDER: Record<string, string> = {
    falla: 'Ej. "No puedo abrir el video de la publicación del martes…"',
    pedido: 'Ej. "¿Podrían prepararme un video para el aniversario…?"',
    consulta: 'Ej. "¿Cuándo sale la próxima publicación?"',
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white shrink-0" style={{ background: color }}>
          <LifeBuoy className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">Soporte</h2>
          <p className="text-[13px] text-muted-foreground">¿Algo falla o necesitas algo? Envíanos un reporte — el equipo lo ve al instante.</p>
        </div>
      </header>

      {/* Nuevo reporte */}
      <section className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(TIPO_META) as Array<'falla' | 'pedido' | 'consulta'>).map((t) => {
            const m = TIPO_META[t]
            const on = tipo === t
            return (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-bold border transition-colors"
                style={on ? { background: m.bg, borderColor: m.color, color: m.color } : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                <m.Icono className="w-4 h-4" /> {m.label}
              </button>
            )
          })}
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData?.items ?? [])
              .filter((i) => i.type.startsWith('image/'))
              .map((i) => i.getAsFile())
              .filter(Boolean) as File[]
            if (files.length > 0) { e.preventDefault(); void subirArchivos(files) }
          }}
          rows={4}
          maxLength={2000}
          placeholder={PLACEHOLDER[tipo]}
          className="w-full rounded-xl border bg-background px-3 py-2.5 text-[14px] resize-none outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as never]: `${color}55` }}
        />
        {(grabando || parcial) && (
          <p className="text-[12px] text-muted-foreground italic -mt-1.5">{parcial || '🎙 Escuchando…'}</p>
        )}

        {/* Capturas */}
        {imgs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {imgs.map((u) => (
              <span key={u} className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="captura" className="w-20 h-20 object-cover rounded-lg border" />
                <button type="button" onClick={() => setImgs((cur) => cur.filter((x) => x !== u))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white inline-flex items-center justify-center" title="Quitar">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { void subirArchivos(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-[13px] font-semibold hover:bg-muted disabled:opacity-60">
            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Subir captura
          </button>
          {vozOk && (
            <button type="button" onClick={alternar} title={grabando ? 'Detener dictado' : 'Dictar'}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border"
              style={grabando ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : undefined}>
              {grabando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={enviar} disabled={enviando || subiendo || !texto.trim()}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
            style={{ background: color }}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar reporte
          </button>
        </div>
        <p className="text-[11.5px] text-muted-foreground">💡 Tip: también puedes pegar una captura con Ctrl+V (⌘+V) directo en el texto.</p>
      </section>

      {/* Mis reportes */}
      <section className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tus reportes · {reportes.length}</div>
        {reportes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-2">Aún no enviaste reportes. Cualquier cosa que necesites, escríbenos aquí. 💙</p>
        ) : reportes.map((r) => {
          const tm = TIPO_META[r.tipo] ?? TIPO_META.consulta
          const em = ESTADO_META[r.estado] ?? ESTADO_META.pendiente
          return (
            <article key={r.id} className="rounded-xl border bg-card p-3.5" style={{ borderLeft: `4px solid ${tm.color}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: tm.color }}>
                  <tm.Icono className="w-3.5 h-3.5" /> {tm.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{fmtFecha(r.createdAt)}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${em.color}15`, color: em.color }}>
                  <em.Icono className="w-3.5 h-3.5" /> {em.label}
                </span>
              </div>
              <p className="mt-1.5 text-[13.5px] whitespace-pre-wrap">{r.descripcion}</p>
              {r.imagenes.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {r.imagenes.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="captura" className="w-16 h-16 object-cover rounded-lg border" />
                    </a>
                  ))}
                </div>
              )}
              {r.estado === 'resuelto' && r.notaResolucion && (
                <p className="mt-2 text-[12.5px] rounded-lg px-3 py-2" style={{ background: '#f0fdf4', color: '#15803d' }}>
                  ✅ {r.notaResolucion}
                </p>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
