'use client'

// Calendario de fechas importantes embebido en tableros del equipo
// (ticket Pedro 132c5a66 — Ailyn /diseno). Reusa RecordatorioMes +
// FechaDetalleModal + categoriaInfo. Solo lectura: gestionar fechas
// sigue en /fechas-importantes (Lorena + directores).

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import { categoriaInfo, contenidoInfo } from '@/lib/fechas/categorias'
import { RecordatorioMes, type RecordatorioItem } from '@/components/fechas/recordatorio-mes'
import { FechaDetalleModal, type FechaDetalle } from '@/components/fechas/fecha-detalle-modal'

export type FechaTablero = {
  id: string
  titulo: string
  fecha: string
  nota: string | null
  categoria: string
  contenido?: string | null
  marcaNombre: string
  marcaSlug: string
  color: string
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function FechasCalendarioTablero({
  fechas,
  marcaFilterSlug = 'todas',
  defaultOpen = false,
  verTodoHref = '/fechas-importantes',
}: {
  fechas: FechaTablero[]
  /** Si el tablero ya filtra por marca, el calendario respeta ese filtro. */
  marcaFilterSlug?: string
  defaultOpen?: boolean
  verTodoHref?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [detalle, setDetalle] = useState<FechaDetalle | null>(null)

  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [hy, hm] = hoyISO.split('-').map(Number)
  const [ver, setVer] = useState<{ y: number; m: number }>({ y: hy, m: hm - 1 })

  const fechasFiltradas = useMemo(() => {
    const base =
      !marcaFilterSlug || marcaFilterSlug === 'todas'
        ? fechas
        : fechas.filter((f) => f.marcaSlug === marcaFilterSlug)
    const norm = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const vistos = new Set<string>()
    const out: FechaTablero[] = []
    for (const f of base) {
      const key = `${f.fecha}|${norm(f.titulo)}`
      if (vistos.has(key)) continue
      vistos.add(key)
      out.push(f)
    }
    return out
  }, [fechas, marcaFilterSlug])

  const porDia = useMemo(() => {
    const map = new Map<string, FechaTablero[]>()
    for (const f of fechasFiltradas) {
      const a = map.get(f.fecha) ?? []
      a.push(f)
      map.set(f.fecha, a)
    }
    return map
  }, [fechasFiltradas])

  const celdas = useMemo(() => {
    const primerDiaSemana = new Date(ver.y, ver.m, 1).getDay()
    const dias = new Date(ver.y, ver.m + 1, 0).getDate()
    const arr: (number | null)[] = Array(primerDiaSemana).fill(null)
    for (let d = 1; d <= dias; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [ver])

  const recordatorioMes = useMemo(() => {
    const mesPref = hoyISO.slice(0, 7)
    const delMes = fechasFiltradas
      .filter((f) => f.fecha >= hoyISO && f.fecha.slice(0, 7) === mesPref)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    const marcasSet = new Set<string>()
    const items: RecordatorioItem[] = delMes.map((f) => {
      marcasSet.add(f.marcaNombre)
      const cat = categoriaInfo(f.categoria)
      return {
        id: f.id,
        dia: Number(f.fecha.slice(8, 10)),
        titulo: f.titulo,
        marcaNombre: f.marcaNombre,
        categoriaLabel: cat.label,
        categoriaColor: cat.color,
      }
    })
    return {
      mes: MESES[Number(mesPref.slice(5, 7)) - 1],
      total: delMes.length,
      marcas: [...marcasSet],
      esInicioMes: Number(hoyISO.slice(8, 10)) <= 5,
      items: items.slice(0, 6),
    }
  }, [fechasFiltradas, hoyISO])

  const delMesVista = useMemo(() => {
    const pref = `${ver.y}-${String(ver.m + 1).padStart(2, '0')}`
    return fechasFiltradas
      .filter((f) => f.fecha.slice(0, 7) === pref)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [fechasFiltradas, ver])

  function abrirFecha(id: string) {
    const f = fechasFiltradas.find((x) => x.id === id)
    if (!f) return
    setDetalle({
      id: f.id,
      titulo: f.titulo,
      fecha: f.fecha,
      nota: f.nota,
      categoria: f.categoria,
      marcaNombre: f.marcaNombre,
      marcaColor: f.color,
    })
  }

  function cambiarMes(delta: number) {
    setVer((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const resumenMes = delMesVista.length

  return (
    <div className="px-4 sm:px-5 pt-2 pb-1 shrink-0">
      <RecordatorioMes
        {...recordatorioMes}
        onItemClick={abrirFecha}
        verTodoHref={verTodoHref}
      />

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: 'rgba(113,112,255,0.28)',
          background: 'rgba(113,112,255,0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left"
        >
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ec4899)' }}
          >
            <CalendarDays className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold leading-tight" style={{ color: '#7170ff' }}>
              Calendario de fechas importantes
            </div>
            <div className="text-[11.5px] text-muted-foreground truncate">
              {resumenMes === 0
                ? `Sin fechas en ${MESES[ver.m]} — planifica contenido con las de otras marcas`
                : `${resumenMes} fecha${resumenMes === 1 ? '' : 's'} en ${MESES[ver.m]} · para planificar contenido`}
            </div>
          </div>
          <span className="text-[11.5px] font-bold shrink-0" style={{ color: '#7170ff' }}>
            {open ? 'Ocultar' : 'Ver calendario'}
          </span>
        </button>

        {open && (
          <div className="px-3.5 pb-3.5 space-y-3 border-t border-black/[0.04] bg-card/60">
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-extrabold text-[14px]">
                {MESES[ver.m]}{' '}
                <span className="text-muted-foreground font-semibold">{ver.y}</span>
              </div>
              <button
                type="button"
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border overflow-hidden bg-card">
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground border-b">
                {DIAS.map((d, i) => (
                  <div key={i} className="py-1.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {celdas.map((d, i) => {
                  if (d === null) {
                    return (
                      <div
                        key={i}
                        className="min-h-[56px] sm:min-h-[68px] border-b border-r border-black/[0.04]"
                      />
                    )
                  }
                  const key = iso(ver.y, ver.m, d)
                  const esHoy = key === hoyISO
                  const items = porDia.get(key) ?? []
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (items[0]) abrirFecha(items[0].id)
                      }}
                      className="min-w-0 min-h-[56px] sm:min-h-[68px] border-b border-r border-black/[0.04] p-1 text-left align-top hover:bg-muted/40 transition-colors flex flex-col gap-0.5"
                    >
                      <span
                        className={`text-[11px] font-bold w-5 h-5 inline-flex items-center justify-center rounded-full shrink-0 ${esHoy ? 'text-white' : ''}`}
                        style={esHoy ? { background: '#ef4444' } : undefined}
                      >
                        {d}
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 w-full">
                        {items.slice(0, 2).map((f) => {
                          const cat = categoriaInfo(f.categoria)
                          return (
                            <span
                              key={f.id}
                              className="flex items-center gap-1 w-full min-w-0 max-w-full overflow-hidden text-[9px] font-bold px-1 py-0.5 rounded pointer-events-none"
                              style={{ background: `${cat.color}22`, color: cat.color }}
                              title={`${cat.label} · ${f.marcaNombre}: ${f.titulo}`}
                            >
                              <Star
                                className="w-2 h-2 shrink-0"
                                style={{ color: cat.color }}
                                fill={cat.color}
                              />
                              <span className="truncate min-w-0">{f.titulo}</span>
                            </span>
                          )
                        })}
                        {items.length > 2 && (
                          <span className="text-[9px] font-semibold pl-1" style={{ color: '#7170ff' }}>
                            +{items.length - 2} más
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {delMesVista.length === 0 ? (
              <p className="text-center text-[12.5px] text-muted-foreground py-2">
                No hay fechas importantes en {MESES[ver.m]}.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {delMesVista.map((f) => {
                  const cat = categoriaInfo(f.categoria)
                  const co = contenidoInfo(f.contenido)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => abrirFecha(f.id)}
                      className="w-full text-left rounded-lg border bg-card p-2.5 flex items-center gap-2.5 hover:shadow-sm transition-shadow"
                      style={{ borderLeft: `4px solid ${cat.color}` }}
                    >
                      <div className="w-8 text-center shrink-0">
                        <div className="text-[14px] font-extrabold leading-none">
                          {Number(f.fecha.slice(8, 10))}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">
                          {MESES[ver.m].slice(0, 3)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate">{f.titulo}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold"
                            style={{ color: cat.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: cat.color }}
                            />{' '}
                            {cat.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">· {f.marcaNombre}</span>
                          {co && (
                            <span className="text-[10.5px] font-semibold text-muted-foreground">
                              · {co.emoji} {co.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link
                href={verTodoHref}
                className="text-[12.5px] font-bold no-underline"
                style={{ color: '#7170ff' }}
              >
                Abrir fechas importantes →
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" /> Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {detalle && <FechaDetalleModal fecha={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}
