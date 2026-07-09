'use client'

/* PublicarHoyView — flujo guiado para quien publica manualmente los videos.
   Pedro 08-jul: navegar por fechas (ayer/hoy/mañana/calendario), ver qué faltó
   o se va a publicar, confirmar (marca publicado + notifica WhatsApp al grupo),
   layout ancho en PC / una columna en celular, e historial de la semana. */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Download, Music, Copy, Check, ImageIcon, Film, ExternalLink, StickyNote, ChevronRight,
  ChevronLeft, Scissors, Type, History, CheckCircle2, X, AlertTriangle, RotateCcw, CalendarDays,
} from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { ActivarNotificaciones } from '@/components/activar-notificaciones'
import { marcarPublicado, desmarcarPublicado } from '../_actions'

export type PublicarHoyItem = {
  id: string
  marcaSlug: string
  marcaNombre: string
  marcaColor: string
  marcaEmoji: string | null
  titulo: string
  copy: string | null
  indicaciones: string | null
  frase: string | null
  publicado: boolean
  publicadoAt: string | null
  editando: boolean
  videoConMusica: string | null
  videoSinMusica: string | null
  portada: string | null
  enlaceMusica: string | null
  redes: string[]
  hora: string | null
}

export type HistorialItem = {
  id: string
  titulo: string
  marcaNombre: string
  marcaEmoji: string | null
  marcaColor: string
  fecha: string
  publicadoAt: string | null
}

type Resumen = { ayer: string; manana: string; pendientesAyer: number; programadasManana: number }

const RED_EMOJI: Record<string, string> = { instagram: '📸', facebook: '👍', tiktok: '🎵', linkedin: '💼' }
const AGENCY = '#7170ff'

function urlOk(u: string | null): string | null {
  if (!u) return null
  const t = u.trim()
  if (!t) return null
  return t.startsWith('http') ? t : `https://${t}`
}
function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10)
}
function horaDe(iso: string | null): string {
  if (!iso) return ''
  try { return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch { return '' }
}
function diaCorto(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dt = new Date(y, m - 1, d)
  return `${dias[dt.getDay()]} ${d} ${meses[m - 1]}`
}

export function PublicarHoyView({ items, fecha, fechaLabel, hoy, resumen, historial }: {
  items: PublicarHoyItem[]
  fecha: string
  fechaLabel: string
  hoy: string
  resumen: Resumen
  historial: HistorialItem[]
}) {
  const router = useRouter()
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set())
  const [histOpen, setHistOpen] = useState(false)
  const [, startTransition] = useTransition()

  const esHoy = fecha === hoy
  function go(f: string) { router.push(`/publicaciones/publicar-hoy?fecha=${f}`) }

  function esPublicada(it: PublicarHoyItem) { return it.publicado || confirmados.has(it.id) }
  const pendientes = items.filter((it) => !esPublicada(it))
  const publicadas = items.filter((it) => esPublicada(it))

  function onConfirm(id: string) {
    setConfirmados((s) => new Set(s).add(id))
    toast.success('✅ Publicación confirmada · avisando por WhatsApp')
    startTransition(async () => {
      const r = await marcarPublicado(id)
      if (!r.ok) { setConfirmados((s) => { const n = new Set(s); n.delete(id); return n }); toast.error(r.error) }
    })
  }
  function onUndo(id: string) {
    setConfirmados((s) => { const n = new Set(s); n.delete(id); return n })
    startTransition(async () => { await desmarcarPublicado(id); router.refresh() })
  }

  // En HOY el grid muestra solo lo PENDIENTE (lo confirmado se quita).
  // En otras fechas se muestran todas para revisar qué se publicó / faltó.
  const grid = esHoy ? pendientes : items

  return (
    <main className="mx-auto p-4 sm:p-6 max-w-7xl space-y-4">
      {/* ===== Header ===== */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Publicar hoy</h1>
          <p className="text-sm text-muted-foreground">
            {esHoy ? 'Lo que toca publicar' : 'Revisando'} · <span className="capitalize">{fechaLabel}</span>
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ActivarNotificaciones />
          <button
            onClick={() => setHistOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-semibold hover:bg-muted transition-colors"
            title="Historial de lo publicado esta semana"
          >
            <History className="w-4 h-4" /> <span className="hidden sm:inline">Historial</span>
            {historial.length > 0 && <span className="ml-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: AGENCY }}>{historial.length}</span>}
          </button>
        </div>
      </header>

      {/* ===== Barra de fechas ===== */}
      <div className="rounded-xl border bg-card p-2.5 flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center rounded-lg border overflow-hidden">
          <button onClick={() => go(addDaysIso(fecha, -1))} className="h-9 px-2.5 hover:bg-muted transition-colors" title="Día anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 text-[13px] font-semibold whitespace-nowrap capitalize border-x">{diaCorto(fecha)}</span>
          <button onClick={() => go(addDaysIso(fecha, 1))} className="h-9 px-2.5 hover:bg-muted transition-colors" title="Día siguiente"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {!esHoy && (
          <button onClick={() => go(hoy)} className="h-9 px-3 rounded-lg text-[13px] font-semibold text-white" style={{ background: AGENCY }}>Hoy</button>
        )}
        <label className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[13px] font-medium cursor-pointer hover:bg-muted transition-colors">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={fecha} onChange={(e) => e.target.value && go(e.target.value)} className="bg-transparent outline-none text-[13px] w-[7.5rem]" />
        </label>
        <div className="flex-1" />
        {/* Atajos de resumen */}
        {resumen.pendientesAyer > 0 && (
          <button onClick={() => go(resumen.ayer)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold" style={{ background: 'rgba(245,158,11,0.14)', color: '#92400e' }} title="Ver lo que faltó ayer">
            <AlertTriangle className="w-3.5 h-3.5" /> Faltaron {resumen.pendientesAyer} de ayer
          </button>
        )}
        {resumen.programadasManana > 0 && (
          <button onClick={() => go(resumen.manana)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold border hover:bg-muted transition-colors" title="Ver lo de mañana">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> Mañana: {resumen.programadasManana}
          </button>
        )}
      </div>

      {/* Nota de ya-publicadas (solo cuando es HOY) */}
      {esHoy && publicadas.length > 0 && (
        <div className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: '#0f766e' }}>
          <CheckCircle2 className="w-4 h-4" /> {publicadas.length} ya publicada{publicadas.length > 1 ? 's' : ''} hoy · quedan {pendientes.length}
        </div>
      )}

      {/* ===== Grid de piezas ===== */}
      {grid.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <div className="text-4xl mb-2">{esHoy ? '🎉' : '📭'}</div>
          <p className="font-semibold text-foreground">{esHoy ? '¡Todo publicado por hoy!' : 'Nada programado para esta fecha'}</p>
          <p className="text-sm text-muted-foreground mt-1">{esHoy ? 'No queda nada pendiente de publicar.' : 'Elige otra fecha o vuelve a hoy.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', alignItems: 'start' }}>
          {grid.map((it) => (
            <PiezaCard key={it.id} item={it} publicada={esPublicada(it)} onConfirm={() => onConfirm(it.id)} onUndo={() => onUndo(it.id)} />
          ))}
        </div>
      )}

      {histOpen && <HistorialModal historial={historial} onClose={() => setHistOpen(false)} />}
    </main>
  )
}

function PiezaCard({ item, publicada, onConfirm, onUndo }: {
  item: PublicarHoyItem; publicada: boolean; onConfirm: () => void; onUndo: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const videoCM = urlOk(item.videoConMusica)
  const videoSM = urlOk(item.videoSinMusica)
  const portada = urlOk(item.portada)
  const musica = urlOk(item.enlaceMusica)

  async function copiarCopy() {
    if (!item.copy) { toast.error('Esta pieza no tiene copy'); return }
    try {
      await navigator.clipboard.writeText(item.copy)
      setCopiado(true); toast.success('Copy copiado — pégalo en la red social')
      setTimeout(() => setCopiado(false), 2500)
    } catch { toast.error('No se pudo copiar') }
  }

  return (
    <section className="rounded-2xl bg-card ring-1 ring-black/[0.06] shadow-sm overflow-hidden flex flex-col" style={{ borderLeft: `4px solid ${item.marcaColor}`, opacity: publicada ? 0.92 : 1 }}>
      <a
        href={`/publicaciones/${item.id}?volver=${encodeURIComponent('/publicaciones/publicar-hoy')}`}
        className="flex items-center gap-3 p-4 pb-3 border-b border-border/60 hover:bg-muted/40 transition-colors group"
        title="Abrir la publicación completa"
      >
        <MarcaLogo slug={item.marcaSlug} nombre={item.marcaNombre} emoji={item.marcaEmoji} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-tight truncate group-hover:underline">{item.titulo}</p>
          <p className="text-[12px] leading-tight truncate mt-0.5">
            <span style={{ color: item.marcaColor, fontWeight: 600 }}>{item.marcaNombre}</span>
            {item.hora && <span className="text-muted-foreground"> · {item.hora}</span>}
            {item.redes.length > 0 && <span className="text-muted-foreground"> · {item.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}</span>}
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <span className="hidden sm:inline">Ver</span><ChevronRight className="w-4 h-4" />
        </span>
      </a>

      <div className="p-4 space-y-2.5 flex-1">
        <Paso n={1} label="Descargar video" icon={<Film className="w-4 h-4" />}>
          {item.editando && (
            <div className="flex items-center gap-1.5 mb-2 text-[12.5px] font-semibold" style={{ color: '#0891b2' }}>
              <span className="mk-anim-editing inline-flex"><Scissors className="w-4 h-4" /></span>
              En edición… el video todavía se está editando
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <LinkBtn href={videoCM} icon={<Music className="w-3.5 h-3.5" />} label="Con música" color="#16a34a" />
            <LinkBtn href={videoSM} icon={<Download className="w-3.5 h-3.5" />} label="Sin música" color="#2563eb" />
          </div>
        </Paso>

        <Paso n={2} label="Descargar portada" icon={<ImageIcon className="w-4 h-4" />}>
          <LinkBtn href={portada} icon={<Download className="w-3.5 h-3.5" />} label="Abrir portada" color="#9333ea" />
        </Paso>

        <Paso n={3} label="Copiar el copy" icon={<Copy className="w-4 h-4" />}>
          <button type="button" onClick={copiarCopy} disabled={!item.copy}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
            style={{ background: copiado ? '#16a34a' : '#0f172a' }}>
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado ✓' : 'Copiar copy'}
          </button>
          {item.copy && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">{item.copy}</p>}
        </Paso>

        <Paso n={4} label="Música (TikTok)" icon={<Music className="w-4 h-4" />}>
          <LinkBtn href={musica ?? 'https://www.tiktok.com'} icon={<Music className="w-3.5 h-3.5" />} label={musica ? 'Abrir audio' : 'Abrir TikTok'} color="#ec4899" />
        </Paso>

        <Paso n={5} label="Indicaciones (de Lorena)" icon={<StickyNote className="w-4 h-4" />} last={!(item.frase && item.frase.trim())}>
          {item.indicaciones && item.indicaciones.trim() ? (
            <div className="rounded-lg bg-[#16a34a]/8 border border-[#16a34a]/25 px-3 py-2.5 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{item.indicaciones}</div>
          ) : (
            <span className="text-[12.5px] text-muted-foreground italic">Sin indicaciones para esta pieza.</span>
          )}
        </Paso>

        {item.frase && item.frase.trim() && (
          <Paso n={6} label="Frase de video" icon={<Type className="w-4 h-4" />} last>
            <div className="rounded-lg bg-[#ba41f7]/8 border border-[#ba41f7]/30 px-3 py-2.5 text-[14px] font-semibold leading-relaxed text-foreground whitespace-pre-wrap">{item.frase}</div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Esta frase va en pantalla, sobre el video.</p>
          </Paso>
        )}
      </div>

      {/* ===== Footer de CONFIRMACIÓN — separado de los botones de descargar ===== */}
      {publicada ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t" style={{ background: 'rgba(20,184,166,0.10)' }}>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#0f766e' }}>
            <CheckCircle2 className="w-4 h-4" /> Publicado{item.publicadoAt ? ` · ${horaDe(item.publicadoAt)}` : ''}
          </span>
          <button onClick={onUndo} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground" title="Deshacer">
            <RotateCcw className="w-3.5 h-3.5" /> Deshacer
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t" style={{ background: 'rgba(20,184,166,0.06)' }}>
          <button onClick={onConfirm}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-[14px] transition-transform active:scale-[0.98]"
            style={{ background: '#14b8a6', boxShadow: '0 6px 16px -6px rgba(20,184,166,0.7)' }}>
            <CheckCircle2 className="w-5 h-5" /> Confirmar publicación
          </button>
        </div>
      )}
    </section>
  )
}

function HistorialModal({ historial, onClose }: { historial: HistorialItem[]; onClose: () => void }) {
  // Agrupar por fecha (desc).
  const porFecha = new Map<string, HistorialItem[]>()
  for (const h of historial) { const a = porFecha.get(h.fecha) ?? []; a.push(h); porFecha.set(h.fecha, a) }
  const fechas = Array.from(porFecha.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose}>
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: AGENCY }} />
            <h2 className="text-[16px] font-bold">Publicado esta semana</h2>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: AGENCY }}>{historial.length}</span>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {historial.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Todavía no se ha publicado nada esta semana.</p>
          ) : fechas.map((f) => (
            <div key={f}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 capitalize">{diaCorto(f)}</div>
              <div className="space-y-1.5">
                {porFecha.get(f)!.map((h) => (
                  <a key={h.id} href={`/publicaciones/${h.id}?volver=${encodeURIComponent('/publicaciones/publicar-hoy')}`}
                    className="flex items-center gap-2.5 rounded-lg border p-2.5 hover:bg-muted/40 transition-colors" style={{ borderLeft: `3px solid ${h.marcaColor}` }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#14b8a6' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{h.titulo}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate">{h.marcaEmoji ? h.marcaEmoji + ' ' : ''}{h.marcaNombre}{h.publicadoAt ? ` · ${horaDe(h.publicadoAt)}` : ''}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Paso({ n, label, icon, children, last }: { n: number; label: string; icon: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex gap-3 ${last ? '' : 'pb-2.5 border-b border-border/40'}`}>
      <span className="w-6 h-6 rounded-full bg-muted text-foreground text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground mb-1.5">
          <span className="text-muted-foreground">{icon}</span> {label}
        </div>
        {children}
      </div>
    </div>
  )
}

function LinkBtn({ href, icon, label, color }: { href: string | null; icon: React.ReactNode; label: string; color: string }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground bg-muted/50 cursor-not-allowed">
        {icon} {label} <span className="opacity-60">(no hay)</span>
      </span>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: color }}>
      {icon} {label} <ExternalLink className="w-3 h-3 opacity-80" />
    </a>
  )
}
