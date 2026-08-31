// app/components/tareas/tareas-plan-view.tsx
//
// Vista PLAN de tareas — COMPARTIDA entre la app del equipo (/tareas/plan) y
// el portal del cliente (sección Plan). Mismo diseño que el tablero de
// Tareas (cards de color con chip del responsable), con tres vistas:
//   📋 Tablero  — columnas por MARCA; al filtrar una marca, por RESPONSABLE
//   📊 Gantt    — cronograma por fechas, agrupado por responsable
//   📅 Calendario — tareas en su fecha de entrega
// Estados en la card (sin empezar / en proceso / archivado) + fechas de
// entrega/inicio. El EQUIPO edita; el CLIENTE ve el avance (modo lectura).
// Pedro 31-ago-2026.
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setEstadoTarea, setFechasTarea } from '@/app/tareas/_plan-actions'
import { ESTADO_TAREA_LABEL, type EstadoTarea } from '@/lib/tareas/pro-types'

export type TareaPlan = {
  id: string
  texto: string
  categoria: string
  color: string
  marcaSlug: string | null
  responsableNombre: string | null
  estado: EstadoTarea
  fechaInicio: string | null    // YYYY-MM-DD
  fechaEntrega: string | null   // YYYY-MM-DD
  createdAt: string             // ISO
}

type Props = {
  tareas: TareaPlan[]
  marcas: Array<{ slug: string; nombre: string }>   // para el filtro (modo equipo)
  modo: 'equipo' | 'cliente'
  /* modo cliente: la marca viene fija y las columnas SIEMPRE son por responsable */
  marcaFija?: { slug: string; nombre: string } | null
  hoy: string                   // YYYY-MM-DD Lima (server)
}

const ESTADO_UI: Record<EstadoTarea, { label: string; bg: string; fg: string; icon: string }> = {
  sin_empezar: { label: 'Sin empezar', bg: 'rgba(255,255,255,0.22)', fg: '#fff', icon: '○' },
  en_proceso:  { label: 'En proceso',  bg: '#fbbf24', fg: '#78350f', icon: '◐' },
  archivado:   { label: 'Archivado',   bg: 'rgba(17,24,39,0.35)', fg: '#fff', icon: '▣' },
}

const SIGUIENTE: Record<EstadoTarea, EstadoTarea> = {
  sin_empezar: 'en_proceso',
  en_proceso: 'archivado',
  archivado: 'sin_empezar',
}

function fmtCorta(ymd: string): string {
  try {
    return new Date(ymd + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })
  } catch { return ymd }
}

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000)
}

const SIN_ASIGNAR = 'Sin asignar'

export function TareasPlanView({ tareas, marcas, modo, marcaFija, hoy }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'tablero' | 'gantt' | 'cal'>('tablero')
  const [marcaSel, setMarcaSel] = useState<string>(marcaFija?.slug ?? 'todas')
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [mesCal, setMesCal] = useState(hoy.slice(0, 7))  // YYYY-MM
  const puedeEditar = modo === 'equipo'

  /* Filtro por marca (modo cliente: siempre su marca, ya viene filtrado). */
  const filtradas = useMemo(() => {
    if (marcaFija || marcaSel === 'todas') return tareas
    const marca = marcas.find((m) => m.slug === marcaSel)
    return tareas.filter((t) =>
      t.marcaSlug === marcaSel ||
      (marca && t.categoria.trim().toLowerCase() === marca.nombre.trim().toLowerCase()),
    )
  }, [tareas, marcaSel, marcaFija, marcas])

  const activas = useMemo(() => filtradas.filter((t) => t.estado !== 'archivado'), [filtradas])
  const archivadas = useMemo(() => filtradas.filter((t) => t.estado === 'archivado'), [filtradas])

  /* Columnas: por marca/categoría cuando se ve todo; por RESPONSABLE cuando
     hay una marca elegida (o en el portal del cliente). */
  const porResponsable = !!marcaFija || marcaSel !== 'todas'
  const columnas = useMemo(() => {
    const m = new Map<string, { titulo: string; color: string; items: TareaPlan[] }>()
    for (const t of activas) {
      const key = porResponsable ? (t.responsableNombre?.split(' ')[0] ?? SIN_ASIGNAR) : t.categoria
      const g = m.get(key) ?? { titulo: key, color: t.color, items: [] }
      g.items.push(t)
      m.set(key, g)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length)
  }, [activas, porResponsable])

  return (
    <div style={{ minHeight: '60vh' }}>
      {/* ===== Controles ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Tabs de vista */}
        <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {([['tablero', '📋 Tablero'], ['gantt', '📊 Gantt'], ['cal', '📅 Calendario']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setVista(id)}
              style={{
                height: 34, padding: '0 12px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: vista === id ? '#111827' : 'transparent', color: vista === id ? '#fff' : '#6b7280',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtro por marca (solo equipo) */}
        {!marcaFija && (
          <select value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12.5, outline: 'none' }}
            title="Ver por marca — las columnas pasan a ser por responsable">
            <option value="todas">Todas las marcas</option>
            {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nombre}</option>)}
          </select>
        )}

        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
          {porResponsable ? 'Columnas por responsable' : 'Columnas por marca'} · {activas.length} activas
        </span>

        <div style={{ flex: 1 }} />
        {archivadas.length > 0 && (
          <button type="button" onClick={() => setVerArchivadas((v) => !v)}
            style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: verArchivadas ? '#f3f4f6' : '#fff', fontSize: 11.5, color: '#6b7280', cursor: 'pointer' }}>
            ▣ Archivadas ({archivadas.length})
          </button>
        )}
      </div>

      {/* ===== TABLERO ===== */}
      {vista === 'tablero' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
          {columnas.length === 0 && <Vacio texto="Sin tareas activas con este filtro." />}
          {columnas.map((col) => (
            <section key={col.titulo} style={{ flex: '0 0 200px', width: 200, borderRadius: 10, padding: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 6px', borderLeft: `3px solid ${col.color}`, paddingLeft: 7, marginBottom: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.titulo}</span>
                <span style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 600 }}>{col.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {col.items.map((t) => (
                  <CardPlan key={t.id} t={t} hoy={hoy} puedeEditar={puedeEditar} mostrarResponsable={!porResponsable}
                    onCambio={() => router.refresh()} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ===== GANTT ===== */}
      {vista === 'gantt' && <Gantt tareas={activas} hoy={hoy} puedeEditar={puedeEditar} onCambio={() => router.refresh()} />}

      {/* ===== CALENDARIO ===== */}
      {vista === 'cal' && (
        <CalendarioTareas tareas={activas} hoy={hoy} mes={mesCal} setMes={setMesCal} />
      )}

      {/* ===== Archivadas ===== */}
      {verArchivadas && archivadas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>▣ ARCHIVADAS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {archivadas.map((t) => (
              <div key={t.id} style={{ maxWidth: 220 }}>
                <CardPlan t={t} hoy={hoy} puedeEditar={puedeEditar} mostrarResponsable onCambio={() => router.refresh()} apagada />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <p style={{ fontSize: 13, color: '#9ca3af', padding: 20 }}>{texto}</p>
}

/* ===== Card — mismo diseño que el tablero de Tareas + estado y fechas ===== */
export function CardPlan({ t, hoy, puedeEditar, mostrarResponsable, onCambio, apagada }: {
  t: TareaPlan; hoy: string; puedeEditar: boolean; mostrarResponsable: boolean
  onCambio: () => void; apagada?: boolean
}) {
  const [editFechas, setEditFechas] = useState(false)
  const [fi, setFi] = useState(t.fechaInicio ?? '')
  const [fe, setFe] = useState(t.fechaEntrega ?? '')
  const [cargando, setCargando] = useState(false)
  const est = ESTADO_UI[t.estado]
  const vencida = t.fechaEntrega && t.fechaEntrega < hoy && t.estado !== 'archivado'

  async function cicloEstado() {
    if (!puedeEditar || cargando) return
    setCargando(true)
    const r = await setEstadoTarea(t.id, SIGUIENTE[t.estado])
    setCargando(false)
    if (!r.ok) { toast.error(r.error); return }
    onCambio()
  }

  async function guardarFechas() {
    setCargando(true)
    const r = await setFechasTarea(t.id, { fechaInicio: fi || null, fechaEntrega: fe || null })
    setCargando(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success('✓ Fechas guardadas')
    setEditFechas(false)
    onCambio()
  }

  return (
    <div style={{ background: t.color, borderRadius: 8, padding: '6px 8px', color: '#fff', opacity: apagada ? 0.55 : 1 }}>
      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{t.texto}</p>

      {/* fila 1: responsable + creación */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
        {mostrarResponsable && t.responsableNombre && (
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, background: 'rgba(255,255,255,0.22)', padding: '1px 5px', borderRadius: 4 }}>
            {t.responsableNombre.split(' ')[0]}
          </span>
        )}
        <span style={{ fontSize: 8.5, opacity: 0.75 }} title="Fecha de creación">creada {fmtCorta(t.createdAt.slice(0, 10))}</span>
      </div>

      {/* fila 2: estado + fechas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        <button type="button" onClick={cicloEstado} disabled={!puedeEditar || cargando}
          title={puedeEditar ? 'Cambiar estado (toca para avanzar)' : 'Estado del equipo'}
          style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, border: 'none',
            background: est.bg, color: est.fg, cursor: puedeEditar ? 'pointer' : 'default',
          }}>
          {est.icon} {est.label}
        </button>

        {!editFechas ? (
          <button type="button"
            onClick={() => { if (puedeEditar) { setFi(t.fechaInicio ?? ''); setFe(t.fechaEntrega ?? ''); setEditFechas(true) } }}
            title={puedeEditar ? 'Poner fecha de entrega (o rango inicio–entrega)' : 'Fecha de entrega'}
            style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, border: 'none',
              background: vencida ? '#111827' : 'rgba(255,255,255,0.22)', color: '#fff',
              cursor: puedeEditar ? 'pointer' : 'default',
            }}>
            📅 {t.fechaEntrega
              ? `${t.fechaInicio ? fmtCorta(t.fechaInicio) + ' → ' : ''}${fmtCorta(t.fechaEntrega)}${vencida ? ' ⚠' : ''}`
              : puedeEditar ? 'fecha' : 'sin fecha'}
          </button>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <input type="date" value={fi} onChange={(e) => setFi(e.target.value)} title="Inicio (opcional)"
              style={{ fontSize: 9, borderRadius: 5, border: 'none', padding: '1px 3px', color: '#111827' }} />
            <input type="date" value={fe} onChange={(e) => setFe(e.target.value)} title="Entrega"
              style={{ fontSize: 9, borderRadius: 5, border: 'none', padding: '1px 3px', color: '#111827' }} />
            <button type="button" onClick={guardarFechas} disabled={cargando}
              style={{ fontSize: 9, fontWeight: 700, border: 'none', borderRadius: 5, padding: '2px 6px', background: '#10b981', color: '#fff', cursor: 'pointer' }}>✓</button>
            <button type="button" onClick={() => setEditFechas(false)}
              style={{ fontSize: 9, border: 'none', borderRadius: 5, padding: '2px 5px', background: 'rgba(255,255,255,0.22)', color: '#fff', cursor: 'pointer' }}>✕</button>
          </span>
        )}
      </div>
    </div>
  )
}

/* ===== GANTT — cronograma por fechas, agrupado por responsable ===== */
export function Gantt({ tareas, hoy, puedeEditar, onCambio }: {
  tareas: TareaPlan[]; hoy: string; puedeEditar: boolean; onCambio: () => void
}) {
  const conFecha = tareas.filter((t) => t.fechaEntrega)
  const sinFecha = tareas.filter((t) => !t.fechaEntrega)

  /* Ventana del cronograma: desde el lunes de esta semana (o la fecha más
     temprana si hay algo antes) hasta la entrega más lejana (+2 días). */
  const { ini, dias } = useMemo(() => {
    const dowHoy = new Date(hoy + 'T12:00:00Z').getUTCDay()
    let ini = addDias(hoy, -(dowHoy === 0 ? 6 : dowHoy - 1))
    let fin = addDias(hoy, 13)
    for (const t of conFecha) {
      const inicio = t.fechaInicio ?? t.createdAt.slice(0, 10)
      if (inicio < ini) ini = inicio
      if (t.fechaEntrega! > fin) fin = t.fechaEntrega!
    }
    fin = addDias(fin, 2)
    const n = Math.min(diasEntre(ini, fin) + 1, 90)
    return { ini, dias: Array.from({ length: n }, (_, i) => addDias(ini, i)) }
  }, [conFecha, hoy])

  /* Agrupar por responsable */
  const grupos = useMemo(() => {
    const m = new Map<string, TareaPlan[]>()
    for (const t of conFecha) {
      const k = t.responsableNombre?.split(' ')[0] ?? SIN_ASIGNAR
      m.set(k, [...(m.get(k) ?? []), t])
    }
    for (const list of m.values()) list.sort((a, b) => (a.fechaEntrega! < b.fechaEntrega! ? -1 : 1))
    return [...m.entries()]
  }, [conFecha])

  const COL_W = 26
  const LABEL_W = 190

  if (conFecha.length === 0) {
    return (
      <div>
        <Vacio texto="Ninguna tarea tiene fecha de entrega todavía — ponlas desde el Tablero (botón 📅 en cada card) y acá se arma el cronograma." />
        {sinFecha.length > 0 && <SinFechaLista tareas={sinFecha} hoy={hoy} puedeEditar={puedeEditar} onCambio={onCambio} />}
      </div>
    )
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
        <div style={{ minWidth: LABEL_W + dias.length * COL_W }}>
          {/* Header de días */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#f9fafb' }}>
            <div style={{ width: LABEL_W, flexShrink: 0, padding: '6px 10px', fontSize: 10.5, fontWeight: 700, color: '#6b7280' }}>TAREA</div>
            {dias.map((d) => {
              const dt = new Date(d + 'T12:00:00Z')
              const esHoy = d === hoy
              const finde = dt.getUTCDay() === 0 || dt.getUTCDay() === 6
              return (
                <div key={d} style={{
                  width: COL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0', fontSize: 8.5,
                  color: esHoy ? '#fff' : finde ? '#c4c4cc' : '#9ca3af', fontWeight: esHoy ? 800 : 600,
                  background: esHoy ? '#7170ff' : undefined, borderRadius: esHoy ? 6 : 0,
                }}>
                  {dt.getUTCDate()}
                </div>
              )
            })}
          </div>

          {grupos.map(([resp, items]) => (
            <div key={resp}>
              <div style={{ padding: '5px 10px', fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                👤 {resp} · {items.length}
              </div>
              {items.map((t) => {
                const inicio = t.fechaInicio ?? (t.createdAt.slice(0, 10) > t.fechaEntrega! ? t.fechaEntrega! : t.createdAt.slice(0, 10))
                const desde = Math.max(0, diasEntre(ini, inicio))
                const hasta = Math.min(dias.length - 1, Math.max(desde, diasEntre(ini, t.fechaEntrega!)))
                const vencida = t.fechaEntrega! < hoy
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f8f8fa' }}>
                    <div style={{ width: LABEL_W, flexShrink: 0, padding: '5px 10px', fontSize: 10.5, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={t.texto}>
                      {t.texto}
                    </div>
                    <div style={{ position: 'relative', height: 22, width: dias.length * COL_W, flexShrink: 0 }}>
                      <div title={`${t.texto} · ${fmtCorta(inicio)} → ${fmtCorta(t.fechaEntrega!)} · ${ESTADO_TAREA_LABEL[t.estado]}`}
                        style={{
                          position: 'absolute', top: 4, height: 14, borderRadius: 7,
                          left: desde * COL_W + 2, width: Math.max((hasta - desde + 1) * COL_W - 4, COL_W - 6),
                          background: t.color, opacity: t.estado === 'en_proceso' ? 1 : 0.75,
                          border: vencida ? '2px solid #111827' : 'none',
                        }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6 }}>
        Barra = inicio (o creación) → entrega · color = marca/columna · borde negro = vencida · día morado = hoy
      </p>
      {sinFecha.length > 0 && <SinFechaLista tareas={sinFecha} hoy={hoy} puedeEditar={puedeEditar} onCambio={onCambio} />}
    </div>
  )
}

function SinFechaLista({ tareas, hoy, puedeEditar, onCambio }: {
  tareas: TareaPlan[]; hoy: string; puedeEditar: boolean; onCambio: () => void
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>
        SIN FECHA DE ENTREGA ({tareas.length}) — ponles fecha para que entren al cronograma
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tareas.map((t) => (
          <div key={t.id} style={{ maxWidth: 230 }}>
            <CardPlan t={t} hoy={hoy} puedeEditar={puedeEditar} mostrarResponsable onCambio={onCambio} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== Calendario mensual — tareas en su fecha de entrega ===== */
export function CalendarioTareas({ tareas, hoy, mes, setMes }: {
  tareas: TareaPlan[]; hoy: string; mes: string; setMes: (m: string) => void
}) {
  const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const primerDia = `${mes}-01`

  const celdas = useMemo(() => {
    const start = new Date(primerDia + 'T12:00:00Z')
    const y = start.getUTCFullYear()
    const m = start.getUTCMonth()
    const nDias = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const off = (start.getUTCDay() + 6) % 7
    const cells: (string | null)[] = []
    for (let i = 0; i < off; i++) cells.push(null)
    for (let d = 1; d <= nDias; d++) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [primerDia])

  const porDia = useMemo(() => {
    const map = new Map<string, TareaPlan[]>()
    for (const t of tareas) {
      if (!t.fechaEntrega) continue
      map.set(t.fechaEntrega, [...(map.get(t.fechaEntrega) ?? []), t])
    }
    return map
  }, [tareas])

  function moverMes(delta: number) {
    const d = new Date(primerDia + 'T12:00:00Z')
    d.setUTCMonth(d.getUTCMonth() + delta)
    setMes(d.toISOString().slice(0, 7))
  }

  const label = new Date(primerDia + 'T12:00:00Z').toLocaleDateString('es-PE', { timeZone: 'UTC', month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={() => moverMes(-1)} style={navBtn}>←</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{label}</span>
        <button type="button" onClick={() => moverMes(1)} style={navBtn}>→</button>
        {mes !== hoy.slice(0, 7) && (
          <button type="button" onClick={() => setMes(hoy.slice(0, 7))} style={{ ...navBtn, width: 'auto', padding: '0 10px', color: '#7170ff', borderColor: '#7170ff' }}>Hoy</button>
        )}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 640, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb' }}>
            {DIAS_SEM.map((d) => (
              <div key={d} style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, textAlign: 'center', padding: '7px 0', color: '#9ca3af' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {celdas.map((d, i) => {
              if (!d) return <div key={`e${i}`} style={{ minHeight: 92, borderTop: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', background: '#fafafa' }} />
              const items = porDia.get(d) ?? []
              const esHoy = d === hoy
              return (
                <div key={d} style={{ minHeight: 92, borderTop: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', padding: 4 }}>
                  <span style={{
                    display: 'inline-flex', width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', fontSize: 10.5, fontWeight: esHoy ? 800 : 500,
                    background: esHoy ? '#7170ff' : 'transparent', color: esHoy ? '#fff' : '#6b7280',
                  }}>{parseInt(d.slice(8), 10)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {items.slice(0, 3).map((t) => (
                      <div key={t.id} title={`${t.texto} · ${t.responsableNombre ?? SIN_ASIGNAR} · ${ESTADO_TAREA_LABEL[t.estado]}`}
                        style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: t.color, borderRadius: 4, padding: '2px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.responsableNombre ? `${t.responsableNombre.split(' ')[0]} · ` : ''}{t.texto}
                      </div>
                    ))}
                    {items.length > 3 && <div style={{ fontSize: 8.5, color: '#9ca3af' }}>+{items.length - 3} más</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
  fontSize: 13, color: '#6b7280', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
