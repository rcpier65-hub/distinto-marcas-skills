'use client'

/* Grilla de HORAS para las vistas Semana y Día, como Google Calendar.
   Pedro 24-sep-2026: "no tiene rango de horarios como el calendar; me
   gustaría arrastrar una tarjeta a otra fecha y que estén sincronizados".

   - Columnas por día, filas por hora (6 am – 11 pm), línea roja de "ahora".
   - Fila superior "Todo el día" (fechas importantes, eventos sin hora).
   - Eventos posicionados por hora y duración; los que se pisan se reparten
     en columnas lado a lado.
   - Directores (con mouse): ARRASTRAR una tarjeta a otro día/hora (salta de
     15 en 15 min) y ESTIRAR su borde inferior para cambiar la duración. Al
     soltar se llama onMover → guarda en la app y en Google Calendar.
   - Un toque/click sin arrastrar abre el detalle (onAbrir). */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgendaEvento } from './agenda-calendar'

const H_INI = 6
const H_FIN = 23
const PX_HORA = 48
const SNAP_MIN = 15
const UMBRAL_PX = 4

export type Movimiento = { fecha: string; hora: string | null; duracionMin: number }

/* Duración con la que se dibuja cada tipo si no la conocemos. */
export function duracionDe(e: AgendaEvento): number {
  if (e.duracionMin && e.duracionMin > 0) return e.duracionMin
  if (e.tipo === 'reunion') return 45
  if (e.tipo === 'publicacion') return 120
  return 60
}
/* Qué se puede mover / estirar desde el calendario. */
export function sePuedeMover(e: AgendaEvento): boolean {
  return e.tipo === 'grabacion' || e.tipo === 'reunion' || e.tipo === 'gcal' || e.tipo === 'publicacion' || e.tipo === 'fecha'
}
function sePuedeEstirar(e: AgendaEvento): boolean {
  const reunionApp = e.tipo === 'reunion' && !e.origenGoogle
  return e.tipo !== 'publicacion' && e.tipo !== 'fecha' && e.tipo !== 'diseno' && !reunionApp
}
/* Publicaciones: solo cambian de día (ventana fija 6–8 pm). */
function soloFecha(e: AgendaEvento): boolean {
  return e.tipo === 'publicacion' || e.tipo === 'fecha'
}

function aMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
function aHM(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - SNAP_MIN, min))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function hora12(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}
function colores(e: AgendaEvento): { bg: string; fg: string; borde: string } {
  if (e.tipo === 'grabacion') return { bg: e.color, fg: '#fff', borde: e.color }
  if (e.tipo === 'reunion') return { bg: '#ede9fe', fg: '#5b21b6', borde: e.color }
  if (e.tipo === 'publicacion') return { bg: '#ffe4e6', fg: '#be123c', borde: e.color }
  if (e.tipo === 'fecha') return { bg: '#fef9c3', fg: '#a16207', borde: e.color }
  if (e.tipo === 'diseno') return { bg: '#fef3c7', fg: '#92400e', borde: e.color }
  return { bg: '#dbeafe', fg: '#1d4ed8', borde: '#3b82f6' }
}

/* Reparte eventos que se pisan en columnas (como Google Calendar). */
function layoutDia(evs: { e: AgendaEvento; ini: number; fin: number }[]) {
  const orden = [...evs].sort((a, b) => a.ini - b.ini || b.fin - a.fin)
  const out: { e: AgendaEvento; ini: number; fin: number; col: number; cols: number }[] = []
  let grupo: typeof out = []
  let finGrupo = -1
  const cerrar = () => {
    const cols = Math.max(1, ...grupo.map((g) => g.col + 1))
    grupo.forEach((g) => { g.cols = cols })
    out.push(...grupo)
    grupo = []
  }
  for (const ev of orden) {
    if (grupo.length && ev.ini >= finGrupo) cerrar()
    const ocupadas = new Set(grupo.filter((g) => g.fin > ev.ini).map((g) => g.col))
    let col = 0
    while (ocupadas.has(col)) col++
    grupo.push({ ...ev, col, cols: 1 })
    finGrupo = Math.max(finGrupo, ev.fin)
  }
  if (grupo.length) cerrar()
  return out
}

type Arrastre = {
  e: AgendaEvento
  modo: 'mover' | 'estirar'
  x0: number
  y0: number
  diaIdx0: number
  ini0: number
  dur0: number
  activo: boolean
  // Resultado en vivo
  diaIdx: number
  ini: number
  dur: number
}

export function GrillaHoras({ dias, eventos, hoy, puedeEditar, onAbrir, onMover }: {
  dias: string[]
  eventos: AgendaEvento[]
  hoy: string
  puedeEditar: boolean
  onAbrir: (e: AgendaEvento) => void
  onMover: (e: AgendaEvento, m: Movimiento) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const columnasRef = useRef<HTMLDivElement>(null)
  const [arrastre, setArrastreState] = useState<Arrastre | null>(null)
  const arrastreRef = useRef<Arrastre | null>(null)
  /* Tras soltar un arrastre, el navegador dispara un click: lo ignoramos
     para no abrir el detalle sin querer. */
  const suprimirClickRef = useRef(false)
  const setArrastre = (a: Arrastre | null) => { arrastreRef.current = a; setArrastreState(a) }

  /* Minuto actual en Lima para la línea roja (se actualiza cada minuto). */
  const [ahoraMin, setAhoraMin] = useState<number | null>(null)
  useEffect(() => {
    const calc = () => {
      const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
      setAhoraMin(aMin(hm))
    }
    const t0 = setTimeout(calc, 0)
    const id = setInterval(calc, 60_000)
    return () => { clearTimeout(t0); clearInterval(id) }
  }, [])

  /* Al abrir, baja hasta ~1 h antes del primer evento (o a las 8 am). */
  const primerMin = useMemo(() => {
    const mins = eventos.filter((e) => e.hora).map((e) => aMin(e.hora!))
    return mins.length ? Math.min(...mins) : 8 * 60
  }, [eventos])
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = Math.max(0, ((Math.min(primerMin, 9 * 60) - 60) / 60 - H_INI) * PX_HORA)
  }, [primerMin])

  const porDia = useMemo(() => dias.map((d) => {
    const del = eventos.filter((e) => e.fecha === d)
    return {
      todoElDia: del.filter((e) => !e.hora),
      conHora: layoutDia(del.filter((e) => e.hora).map((e) => {
        const ini = aMin(e.hora!)
        return { e, ini, fin: ini + Math.max(duracionDe(e), 15) }
      })),
    }
  }), [dias, eventos])

  /* ------ arrastrar / estirar con el puntero ------ */
  function empezar(ev: React.PointerEvent, e: AgendaEvento, modo: 'mover' | 'estirar', diaIdx: number) {
    if (!puedeEditar || ev.pointerType !== 'mouse' || ev.button !== 0) return
    if (modo === 'mover' && !sePuedeMover(e)) return
    ev.stopPropagation()
    const ini = e.hora ? aMin(e.hora) : 0
    setArrastre({
      e, modo, x0: ev.clientX, y0: ev.clientY, diaIdx0: diaIdx, ini0: ini, dur0: duracionDe(e),
      activo: false, diaIdx, ini, dur: duracionDe(e),
    })
  }

  useEffect(() => {
    if (!arrastre) return
    const onMove = (ev: PointerEvent) => {
      const a = arrastreRef.current
      if (!a) return
      const dx = ev.clientX - a.x0
      const dy = ev.clientY - a.y0
      if (!a.activo && Math.hypot(dx, dy) < UMBRAL_PX) return
      const cols = columnasRef.current?.getBoundingClientRect()
      const anchoCol = cols ? cols.width / dias.length : 1
      const snap = (min: number) => Math.round(min / SNAP_MIN) * SNAP_MIN
      if (a.modo === 'estirar') {
        const dur = Math.max(SNAP_MIN, snap(a.dur0 + (dy / PX_HORA) * 60))
        setArrastre({ ...a, activo: true, dur })
        return
      }
      const diaIdx = cols ? Math.max(0, Math.min(dias.length - 1, Math.floor((ev.clientX - cols.left) / anchoCol))) : a.diaIdx0
      const ini = a.e.hora && !soloFecha(a.e)
        ? Math.max(H_INI * 60, Math.min(H_FIN * 60 - SNAP_MIN, snap(a.ini0 + (dy / PX_HORA) * 60)))
        : a.ini0
      setArrastre({ ...a, activo: true, diaIdx, ini })
    }
    const onUp = () => {
      const a = arrastreRef.current
      setArrastre(null)
      if (!a || !a.activo) return
      suprimirClickRef.current = true
      setTimeout(() => { suprimirClickRef.current = false }, 0)
      const fecha = dias[a.diaIdx]
      const hora = a.e.hora ? aHM(a.ini) : null
      const cambio = fecha !== a.e.fecha || hora !== (a.e.hora ? aHM(a.ini0) : null) || a.dur !== a.dur0
      if (cambio) onMover(a.e, { fecha, hora, duracionMin: a.dur })
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setArrastre(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
    // Se registra una vez por arrastre (el estado vivo se lee del ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastre !== null])

  const moviendo = arrastre?.activo ? arrastre : null
  const horas = Array.from({ length: H_FIN - H_INI }, (_, i) => H_INI + i)
  const alto = (H_FIN - H_INI) * PX_HORA
  const hayTodoElDia = porDia.some((d) => d.todoElDia.length > 0)

  const tarjeta = (e: AgendaEvento, diaIdx: number, estilo: React.CSSProperties, ini: number | null, dur: number, fantasma = false) => {
    const c = colores(e)
    const escondido = !fantasma && moviendo?.e.id === e.id && moviendo.e.tipo === e.tipo
    const corto = dur < 40
    return (
      <div
        key={`${fantasma ? 'g-' : ''}${e.tipo}-${e.id}`}
        onPointerDown={(ev) => empezar(ev, e, 'mover', diaIdx)}
        onClick={() => { if (!fantasma && !suprimirClickRef.current) onAbrir(e) }}
        title={`${e.titulo}${e.marcaNombre ? ` · ${e.marcaNombre}` : ''}${puedeEditar && sePuedeMover(e) ? ' — arrastra para mover' : ''}`}
        style={{
          ...estilo,
          background: c.bg, color: c.fg,
          borderLeft: e.tipo === 'grabacion' ? 'none' : `3px solid ${c.borde}`,
          borderRadius: 6, padding: corto ? '1px 6px' : '3px 6px', overflow: 'hidden',
          fontSize: 11, lineHeight: 1.25, cursor: puedeEditar && sePuedeMover(e) ? 'grab' : 'pointer',
          boxShadow: fantasma ? '0 8px 20px rgba(15,23,42,0.25)' : '0 0 0 1px rgba(255,255,255,0.9)',
          position: estilo.position ?? 'relative',
          opacity: escondido ? 0.35 : fantasma ? 0.95 : 1,
          userSelect: 'none', zIndex: fantasma ? 30 : 2,
        }}
      >
        <div style={{ fontWeight: 600, whiteSpace: corto ? 'nowrap' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {corto && ini !== null ? `${hora12(ini)} · ` : ''}{e.tipo === 'grabacion' ? (e.marcaNombre ?? e.titulo) : e.titulo}
        </div>
        {!corto && ini !== null && (
          <div style={{ opacity: 0.85, fontSize: 10.5 }}>{hora12(ini)} – {hora12(ini + dur)}</div>
        )}
        {/* Borde inferior para estirar (cambiar duración) */}
        {puedeEditar && ini !== null && sePuedeEstirar(e) && !fantasma && (
          <div
            onPointerDown={(ev) => empezar(ev, e, 'estirar', diaIdx)}
            title="Estira para cambiar la duración"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, cursor: 'ns-resize' }}
          />
        )}
      </div>
    )
  }

  const plantilla = `52px repeat(${dias.length}, minmax(0, 1fr))`

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card" style={{ minWidth: dias.length > 1 ? 760 : undefined }}>
      {/* Cabecera de días */}
      <div style={{ display: 'grid', gridTemplateColumns: plantilla }} className="border-b border-border bg-muted/30">
        <div />
        {dias.map((d) => {
          const dt = new Date(d + 'T12:00:00Z')
          const esHoy = d === hoy
          return (
            <div key={d} className="py-2 text-center border-l border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' }).format(dt).replace('.', '')}
              </div>
              <div className={`mx-auto mt-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center text-sm ${esHoy ? 'bg-[#7170ff] text-white font-bold' : 'text-foreground'}`}>
                {dt.getUTCDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fila "Todo el día" */}
      {hayTodoElDia && (
        <div style={{ display: 'grid', gridTemplateColumns: plantilla }} className="border-b border-border">
          <div className="text-[9.5px] text-muted-foreground text-right pr-1.5 pt-1.5">todo el día</div>
          {porDia.map((d, i) => (
            <div key={dias[i]} className="border-l border-border p-1 flex flex-col gap-1 min-h-[30px]">
              {d.todoElDia.map((e) => tarjeta(e, i, { position: 'relative' }, null, 60))}
            </div>
          ))}
        </div>
      )}

      {/* Grilla de horas */}
      <div ref={scrollRef} style={{ maxHeight: '68vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: plantilla, height: alto, position: 'relative' }}>
          {/* Etiquetas de hora */}
          <div style={{ position: 'relative' }}>
            {horas.map((h) => (
              <div key={h} style={{ position: 'absolute', top: (h - H_INI) * PX_HORA - 6, right: 6, fontSize: 10, color: '#94a3b8' }}>
                {h === H_INI ? '' : `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`}
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          <div ref={columnasRef} style={{ gridColumn: `2 / span ${dias.length}`, display: 'grid', gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))`, position: 'relative' }}>
            {porDia.map((d, i) => (
              <div key={dias[i]} className="border-l border-border" style={{ position: 'relative', background: dias[i] === hoy ? 'rgba(113,112,255,0.04)' : undefined }}>
                {/* Líneas de hora y media hora */}
                {horas.map((h) => (
                  <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h - H_INI) * PX_HORA, height: PX_HORA, borderTop: '1px solid var(--border, #eef0f3)' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: PX_HORA / 2, borderTop: '1px dashed rgba(148,163,184,0.18)' }} />
                  </div>
                ))}

                {/* Eventos con hora */}
                {d.conHora.map(({ e, ini, fin, col, cols }) => {
                  const top = ((ini - H_INI * 60) / 60) * PX_HORA
                  const h = Math.max(((fin - ini) / 60) * PX_HORA - 2, 18)
                  return tarjeta(e, i, {
                    position: 'absolute',
                    top: Math.max(0, top) + 1,
                    height: h,
                    left: `calc(${(col / cols) * 100}% + 2px)`,
                    width: `calc(${100 / cols}% - 4px)`,
                  }, ini, fin - ini)
                })}

                {/* Línea roja de "ahora" */}
                {dias[i] === hoy && ahoraMin !== null && ahoraMin >= H_INI * 60 && ahoraMin <= H_FIN * 60 && (
                  <div style={{ position: 'absolute', left: -1, right: 0, top: ((ahoraMin - H_INI * 60) / 60) * PX_HORA, zIndex: 20, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ borderTop: '2px solid #ef4444' }} />
                  </div>
                )}
              </div>
            ))}

            {/* Tarjeta "fantasma" mientras se arrastra */}
            {moviendo && moviendo.e.hora && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {tarjeta(moviendo.e, moviendo.diaIdx, {
                  position: 'absolute',
                  top: ((moviendo.ini - H_INI * 60) / 60) * PX_HORA + 1,
                  height: Math.max((moviendo.dur / 60) * PX_HORA - 2, 18),
                  left: `calc(${(moviendo.diaIdx / dias.length) * 100}% + 2px)`,
                  width: `calc(${100 / dias.length}% - 4px)`,
                }, moviendo.ini, moviendo.dur, true)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aviso mientras se arrastra un evento de día completo */}
      {moviendo && !moviendo.e.hora && (
        <div className="text-center text-[12px] font-medium py-1.5 border-t border-border" style={{ color: '#4f46e5', background: 'rgba(113,112,255,0.06)' }}>
          Mover a {new Date(dias[moviendo.diaIdx] + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
        </div>
      )}
    </div>
  )
}
