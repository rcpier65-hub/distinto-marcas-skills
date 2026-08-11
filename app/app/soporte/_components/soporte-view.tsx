'use client'

/* Vista del módulo "Soporte". Formulario para reportar (todos) + panel para
   resolver (solo Erick/Pedro). Pedro 06-ago-2026. */

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bug, Lightbulb, HelpCircle, Send, CheckCircle2, Clock, MessageCircle, LifeBuoy, ImagePlus, X, Copy } from 'lucide-react'
import { crearReporte, resolverReporte, tomarReporte, marcarAvisado, subirImagenSoporte } from '../_actions'

export type Reporte = {
  id: string
  autorNombre: string
  esMio: boolean
  tipo: 'falla' | 'pedido' | 'consulta'
  descripcion: string
  estado: 'pendiente' | 'en_proceso' | 'resuelto'
  notaResolucion: string | null
  imagenes: string[]
  createdAt: string
  resueltoAt: string | null
  resueltoPor: string | null
  avisado: boolean
}

const TIPO_META: Record<Reporte['tipo'], { label: string; Icon: typeof Bug; color: string; bg: string }> = {
  falla:    { label: 'Falla',   Icon: Bug,        color: '#dc2626', bg: '#fef2f2' },
  pedido:   { label: 'Pedido',  Icon: Lightbulb,  color: '#d97706', bg: '#fffbeb' },
  consulta: { label: 'Consulta', Icon: HelpCircle, color: '#2563eb', bg: '#eff6ff' },
}

function fechaCorta(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  } catch { return '' }
}

export function SoporteView({ reportes, esAdmin, meNombre }: { reportes: Reporte[]; esAdmin: boolean; meNombre: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)' }}>
          <LifeBuoy className="w-5 h-5 text-white" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold leading-tight">Soporte</h1>
          <p className="text-[13px] text-muted-foreground">
            {esAdmin ? 'Reportes del equipo — resuélvelos y avísales.' : '¿Algo no funciona o necesitas un cambio? Cuéntanos y lo resolvemos.'}
          </p>
        </div>
      </header>

      <NuevoReporte meNombre={meNombre} />

      {esAdmin ? <PanelAdmin reportes={reportes} /> : <MisReportes reportes={reportes} />}
    </main>
  )
}

/* ============ Formulario para crear un reporte ============ */
function NuevoReporte({ meNombre }: { meNombre: string }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<Reporte['tipo']>('falla')
  const [texto, setTexto] = useState('')
  const [imgs, setImgs] = useState<string[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function subirVarios(files: File[]) {
    const imgFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imgFiles.length) return
    setSubiendo(true)
    for (const f of imgFiles) {
      if (imgs.length + 1 > 6) { toast.error('Máximo 6 capturas'); break }
      const fd = new FormData(); fd.append('file', f)
      const r = await subirImagenSoporte(fd)
      if (!r.ok) { toast.error(r.error); continue }
      setImgs((cur) => (cur.length >= 6 ? cur : [...cur, r.url]))
    }
    setSubiendo(false)
  }
  /* Pegar captura con Ctrl+V directo en el cuadro de texto. */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.items ?? []).map((it) => it.getAsFile()).filter(Boolean) as File[]
    const imgFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imgFiles.length) { e.preventDefault(); void subirVarios(imgFiles) }
  }

  function enviar() {
    const t = texto.trim()
    if (!t) { toast.error('Escribe qué necesitas o qué falló.'); return }
    if (subiendo) { toast.error('Espera a que terminen de subir las capturas.'); return }
    start(async () => {
      const r = await crearReporte(tipo, t, imgs)
      if (!r.ok) { toast.error(r.error); return }
      setTexto(''); setTipo('falla'); setImgs([])
      toast.success('¡Enviado! Erick ya recibió tu reporte. 💙')
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl bg-card ring-1 ring-black/[0.06] shadow-sm p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TIPO_META) as Reporte['tipo'][]).map((k) => {
          const m = TIPO_META[k]; const active = tipo === k
          return (
            <button key={k} type="button" onClick={() => setTipo(k)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-semibold border transition-colors"
              style={{ borderColor: active ? m.color : '#e5e7eb', background: active ? m.bg : 'transparent', color: active ? m.color : '#6b7280' }}>
              <m.Icon className="w-4 h-4" /> {m.label}
            </button>
          )
        })}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={onPaste}
        rows={4}
        maxLength={2000}
        placeholder={tipo === 'falla' ? 'Ej: en Publicaciones, cuando abro una pieza y salgo me regresa al día de hoy… (puedes pegar una captura con Ctrl+V)' : tipo === 'pedido' ? 'Ej: quisiera que en el calendario se vea el nombre del editor…' : 'Ej: ¿cómo cambio la portada de un video ya subido?'}
        className="w-full resize-none rounded-xl border bg-background px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#7170ff]/40"
      />

      {/* Miniaturas de las capturas adjuntas */}
      {imgs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imgs.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="captura" className="w-20 h-20 object-cover rounded-lg border" />
              <button type="button" onClick={() => setImgs((cur) => cur.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center" title="Quitar">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { const fs = Array.from(e.target.files ?? []); void subirVarios(fs); e.target.value = '' }} />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo || imgs.length >= 6}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold border hover:bg-muted transition-colors disabled:opacity-50">
          <ImagePlus className="w-4 h-4" /> {subiendo ? 'Subiendo…' : 'Adjuntar captura'}
        </button>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">{texto.length}/2000 · {meNombre || 'tú'}</span>
          <button type="button" onClick={enviar} disabled={pending || subiendo || !texto.trim()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-white text-[14px] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)', boxShadow: '0 6px 18px -6px rgba(113,112,255,0.7)' }}>
            <Send className="w-4 h-4" /> {pending ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </section>
  )
}

/* ============ Vista del usuario normal: sus reportes ============ */
function MisReportes({ reportes }: { reportes: Reporte[] }) {
  if (reportes.length === 0) {
    return <p className="text-[13px] text-muted-foreground text-center py-6">Todavía no has enviado ningún reporte.</p>
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Mis reportes</h2>
      {reportes.map((r) => <ReporteCard key={r.id} r={r} admin={false} />)}
    </section>
  )
}

/* ============ Panel de Erick/Pedro: todos los reportes ============ */
function PanelAdmin({ reportes }: { reportes: Reporte[] }) {
  const pendientes = reportes.filter((r) => r.estado !== 'resuelto')
  const resueltos = reportes.filter((r) => r.estado === 'resuelto')
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#d97706' }}>
          <Clock className="w-4 h-4" /> Por resolver ({pendientes.length})
        </h2>
        {pendientes.length === 0
          ? <p className="text-[13px] text-muted-foreground text-center py-4 rounded-xl bg-muted/40">🎉 ¡Nada pendiente!</p>
          : pendientes.map((r) => <ReporteCard key={r.id} r={r} admin />)}
      </section>
      {resueltos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#16a34a' }}>
            <CheckCircle2 className="w-4 h-4" /> Historial · resueltos ({resueltos.length})
          </h2>
          {resueltos.slice(0, 60).map((r) => <ReporteCard key={r.id} r={r} admin />)}
        </section>
      )}
    </div>
  )
}

/* ============ Tarjeta de un reporte ============ */
function ReporteCard({ r, admin }: { r: Reporte; admin: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const m = TIPO_META[r.tipo]

  function abrirWhatsApp(mensaje: string, id: string) {
    try { window.open('https://wa.me/?text=' + encodeURIComponent(mensaje), '_blank') } catch { /* ignore */ }
    void marcarAvisado(id)
  }

  /* Copiar la captura al portapapeles (para pegarla/enviarla). Chrome solo copia
     PNG, así que si viene en otro formato la convierto con canvas. Si falla, abre
     la imagen para copiarla a mano. */
  async function copiarImagen(url: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      let png = blob
      if (blob.type !== 'image/png') {
        png = await new Promise<Blob>((resolve, reject) => {
          const img = new Image(); img.crossOrigin = 'anonymous'
          img.onload = () => {
            const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight
            const ctx = cv.getContext('2d'); if (!ctx) return reject(new Error('ctx'))
            ctx.drawImage(img, 0, 0)
            cv.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png')
          }
          img.onerror = () => reject(new Error('img'))
          img.src = URL.createObjectURL(blob)
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CI = (window as any).ClipboardItem
      await navigator.clipboard.write([new CI({ 'image/png': png })])
      toast.success('Imagen copiada ✓ — pégala donde quieras')
    } catch {
      window.open(url, '_blank')
      toast('Se abrió la imagen — cópiala desde ahí')
    }
  }

  function resolver() {
    start(async () => {
      const res = await resolverReporte(r.id)
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Resuelto ✓ — al usuario le llegó la notificación.')
      abrirWhatsApp(res.whatsapp, r.id)
      router.refresh()
    })
  }
  function tomar() {
    start(async () => { const res = await tomarReporte(r.id); if (!res.ok) { toast.error(res.error); return } router.refresh() })
  }

  const estadoBadge =
    r.estado === 'resuelto' ? { txt: 'Resuelto', color: '#16a34a', bg: '#f0fdf4' } :
    r.estado === 'en_proceso' ? { txt: 'En proceso', color: '#2563eb', bg: '#eff6ff' } :
    { txt: 'Pendiente', color: '#d97706', bg: '#fffbeb' }

  /* Mensaje para el botón "avisar de nuevo" en tarjetas ya resueltas. */
  const fraseTipo = r.tipo === 'falla' ? 'la falla' : r.tipo === 'pedido' ? 'el pedido' : 'la consulta'
  const msgWhatsApp = `Hola ${r.autorNombre} 👋\n\nYa resolvimos ${fraseTipo} que reportaste:\n"${r.descripcion}"\n\n¡Cualquier otra cosa, avísame! 💙`

  return (
    <article className="rounded-2xl bg-card ring-1 ring-black/[0.06] shadow-sm p-4 flex flex-col gap-2.5" style={{ borderLeft: `4px solid ${m.color}`, opacity: r.estado === 'resuelto' ? 0.9 : 1 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ color: m.color, background: m.bg }}>
          <m.Icon className="w-3.5 h-3.5" /> {m.label}
        </span>
        {admin && <span className="text-[12.5px] font-semibold">{r.autorNombre}</span>}
        <span className="text-[11px] text-muted-foreground">{fechaCorta(r.createdAt)}</span>
        <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: estadoBadge.color, background: estadoBadge.bg }}>{estadoBadge.txt}</span>
      </div>

      <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground/90">{r.descripcion}</p>

      {/* Capturas del reporte — click abre en grande; el botón copia la imagen. */}
      {r.imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {r.imagenes.map((u) => (
            <div key={u} className="relative group">
              <a href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="captura" className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg border hover:brightness-95 transition" />
              </a>
              <button type="button" onClick={() => copiarImagen(u)} title="Copiar imagen"
                className="absolute bottom-1 right-1 inline-flex items-center gap-1 h-6 px-1.5 rounded-md bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition">
                <Copy className="w-3 h-3" /> Copiar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Historial: quién resolvió y cuándo (visible para todos). */}
      {r.estado === 'resuelto' && (
        <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#16a34a' }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto{r.resueltoPor ? ` por ${r.resueltoPor}` : ''}{r.resueltoAt ? ` · ${fechaCorta(r.resueltoAt)}` : ''}
        </p>
      )}

      {admin && r.estado !== 'resuelto' && (
        <div className="flex items-center gap-2 pt-1">
          {r.estado === 'pendiente' && (
            <button onClick={tomar} disabled={pending} className="h-9 px-3 rounded-lg text-[13px] font-semibold border hover:bg-muted transition-colors disabled:opacity-50">
              👀 Lo estoy viendo
            </button>
          )}
          <button onClick={resolver} disabled={pending} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <CheckCircle2 className="w-4 h-4" /> {pending ? 'Resolviendo…' : 'Marcar resuelto + avisar'}
          </button>
        </div>
      )}

      {admin && r.estado === 'resuelto' && (
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => abrirWhatsApp(msgWhatsApp, r.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold border hover:bg-muted transition-colors" style={{ color: '#16a34a' }}>
            <MessageCircle className="w-3.5 h-3.5" /> {r.avisado ? 'Avisar de nuevo' : 'Avisar por WhatsApp'}
          </button>
        </div>
      )}

    </article>
  )
}
