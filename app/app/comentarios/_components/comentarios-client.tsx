// app/app/comentarios/_components/comentarios-client.tsx
//
// Client component principal. Maneja:
//   - Selector de marca (con querystring sync)
//   - Estado local de selección de filas + ediciones de respuesta/categoría
//   - Botón "Cargar comentarios" (fetch desde Metricool)
//   - Tabs por estado (pendientes / aprobados / respondidos)
//   - Footer fixed con contador + checkbox informe + botón Responder
//   - Confirm dialog antes de batch
'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  fetchComentariosFromMetricool,
  actualizarComentarioBorrador,
  skipComentario,
  responderBatch,
  dispatchRoutine,
  previewInformeWhatsapp,
  type RoutineMode,
} from '../_actions'
import { ComentarioRow } from './comentario-row'
import type { ComentarioInboxRow, ComentarioCategoria } from '@/lib/types/database'

type MarcaOption = {
  slug: string
  nombre: string
  emoji_marca: string | null
  metricool_blog_id: number | null
  reporte_comentarios_grupo: string | null
}

type Props = {
  marcas: MarcaOption[]
  marcaActual: string
  rowsIniciales: ComentarioInboxRow[]
  resumen: { pending: number; approved: number; responded_today: number; failed: number }
}

export function ComentariosClient({ marcas, marcaActual, rowsIniciales, resumen }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Estado local de ediciones por row (key = row.id)
  // Inicializa con respuesta_sugerida pre-cargada — no hace falta apretar
  // "usar sugerencia" para cada uno.
  const [ediciones, setEdiciones] = useState<Map<string, { texto: string; categoria: ComentarioCategoria }>>(() => {
    const m = new Map()
    for (const r of rowsIniciales) {
      m.set(r.id, {
        texto: r.respuesta_final ?? r.respuesta_sugerida ?? '',
        categoria: r.categoria_sugerida ?? 'otro',
      })
    }
    return m
  })

  // Re-sincronizar cuando llegan nuevos rowsIniciales del server (vos editaste
  // en otro tab, la Routine generó sugerencias después de la primera carga,
  // o hiciste router.refresh()). Sin esto, los textareas se quedaban vacíos
  // aunque la BD tuviera sugerencia (bug original que Pedro detectó).
  //
  // IMPORTANTE: solo sobreescribimos rows que NO tienen edits locales aún
  // (texto vacío). Si vos ya estabas escribiendo, no queremos perder ese trabajo.
  useEffect(() => {
    setEdiciones((prev) => {
      const next = new Map(prev)
      for (const r of rowsIniciales) {
        const current = next.get(r.id)
        const fromServer = r.respuesta_final ?? r.respuesta_sugerida ?? ''
        // Si no había edits locales (o estaba vacío) y el server tiene contenido nuevo, sincronizamos.
        if (!current || (!current.texto && fromServer)) {
          next.set(r.id, {
            texto: fromServer,
            categoria: r.categoria_sugerida ?? 'otro',
          })
        }
      }
      return next
    })
  }, [rowsIniciales])

  // Selección
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [enviarInforme, setEnviarInforme] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Dispatch Routine (Claude Desktop trigger)
  const [dispatching, setDispatching] = useState<RoutineMode | null>(null)
  const [, startDispatchTransition] = useTransition()

  // Preview informe (modo prueba — manda al número personal de Pedro sin tocar Metricool)
  const [previewing, setPreviewing] = useState(false)
  const [, startPreviewTransition] = useTransition()

  function handlePreviewInforme() {
    if (seleccionados.size === 0) {
      toast.error('Seleccioná al menos 1 comentario primero')
      return
    }
    setPreviewing(true)
    startPreviewTransition(async () => {
      const toastId = toast.loading(`🧪 Mandando informe de prueba con ${seleccionados.size} comentarios…`)
      const r = await previewInformeWhatsapp(Array.from(seleccionados))
      if (r.ok) {
        toast.success(
          `✅ Informe enviado a tu WhatsApp personal (${r.marcas_procesadas} marca${r.marcas_procesadas > 1 ? 's' : ''}). NO se posteó nada a Metricool ni a clientes.`,
          { id: toastId, duration: 10000 },
        )
      } else {
        toast.error(`Error: ${r.error}`, { id: toastId, duration: 8000 })
      }
      setPreviewing(false)
    })
  }

  function handleDispatchRoutine(mode: RoutineMode) {
    setDispatching(mode)
    startDispatchTransition(async () => {
      const labels: Record<RoutineMode, string> = {
        generar: 'Generando borradores',
        postear: 'Posteando aprobados a Metricool',
        ambas: 'Generación + posteo',
      }
      const toastId = toast.loading(`🤖 ${labels[mode]}…`)
      const r = await dispatchRoutine(mode)
      if (r.ok) {
        // Si el dispatch devolvió session_url, agregamos action para abrirla
        // en vivo (ver la Routine ejecutándose paso por paso).
        toast.success(r.message, {
          id: toastId,
          duration: 12000,
          action: r.sessionUrl
            ? {
                label: 'Ver en vivo',
                onClick: () => window.open(r.sessionUrl!, '_blank'),
              }
            : undefined,
        })
        // Refrescar la página después de 60s para que aparezcan los borradores
        if (mode === 'generar' || mode === 'ambas') {
          setTimeout(() => router.refresh(), 60_000)
        }
      } else {
        toast.error(`Error: ${r.error}`, { id: toastId, duration: 10000 })
      }
      setDispatching(null)
    })
  }

  const [isFetching, startFetching] = useTransition()
  const [isResponding, startResponding] = useTransition()

  const marcaInfo = marcas.find((m) => m.slug === marcaActual)

  // ====== handlers ======

  function changeMarca(slug: string) {
    const params = new URLSearchParams(sp)
    params.set('marca', slug)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleFetchInbox() {
    startFetching(async () => {
      toast.loading(`Cargando comentarios de ${marcaInfo?.nombre}…`, { id: 'fetch' })
      const result = await fetchComentariosFromMetricool(marcaActual)
      if (result.ok) {
        toast.success(
          `✅ Cargados ${result.fetched} hilos · ${result.inserted} nuevos en inbox` +
            (result.errors.length > 0 ? ` · ${result.errors.length} errores` : ''),
          { id: 'fetch' },
        )
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`, { id: 'fetch' })
      }
    })
  }

  function toggleSelect(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (seleccionados.size === rowsIniciales.length) setSeleccionados(new Set())
    else setSeleccionados(new Set(rowsIniciales.map((r) => r.id)))
  }

  function updateEdicion(id: string, patch: Partial<{ texto: string; categoria: ComentarioCategoria }>) {
    setEdiciones((prev) => {
      const next = new Map(prev)
      const current = next.get(id) ?? { texto: '', categoria: 'otro' as ComentarioCategoria }
      next.set(id, { ...current, ...patch })
      return next
    })
  }

  async function persistEdicion(id: string) {
    const edit = ediciones.get(id)
    if (!edit) return
    await actualizarComentarioBorrador({
      id,
      respuesta_final: edit.texto,
      categoria_sugerida: edit.categoria,
    })
    // Sin toast — silencioso para no molestar mientras escribe
  }

  function handleSkip(id: string) {
    startFetching(async () => {
      const r = await skipComentario(id)
      if (r.ok) {
        toast.success('Comentario skipped')
        router.refresh()
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  function handleResponderClick() {
    if (seleccionados.size === 0) {
      toast.warning('Seleccioná al menos un comentario')
      return
    }
    setConfirmOpen(true)
  }

  function handleConfirmarBatch() {
    setConfirmOpen(false)
    startResponding(async () => {
      // Persistir todas las ediciones antes de responder
      const promesas = Array.from(seleccionados).map((id) => persistEdicion(id))
      await Promise.all(promesas)

      toast.loading(`Respondiendo ${seleccionados.size} comentarios via Metricool…`, { id: 'batch' })
      const r = await responderBatch(Array.from(seleccionados), enviarInforme)
      if (r.ok) {
        toast.success(
          `✅ Respondidos ${r.respondidos}` +
            (r.fallidos > 0 ? ` · ⚠️ ${r.fallidos} fallaron` : '') +
            (r.informe_enviado ? ` · 📲 informe WhatsApp enviado` : ''),
          { id: 'batch', duration: 6000 },
        )
        setSeleccionados(new Set())
        router.refresh()
      } else {
        toast.error(`Error: ${r.error}`, { id: 'batch' })
      }
    })
  }

  // Preview para confirm dialog
  const previewSeleccionados = useMemo(() => {
    return rowsIniciales.filter((r) => seleccionados.has(r.id))
  }, [rowsIniciales, seleccionados])

  // ====== render ======

  return (
    <div className="space-y-4 pb-32">
      {/* HEADER con selector marca + KPIs */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={marcaActual}
            onChange={(e) => changeMarca(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background text-sm font-medium"
          >
            {marcas.map((m) => (
              <option key={m.slug} value={m.slug} disabled={!m.metricool_blog_id}>
                {m.emoji_marca ?? '📊'} {m.nombre}
                {!m.metricool_blog_id && ' (sin Metricool)'}
              </option>
            ))}
          </select>
          <button
            onClick={handleFetchInbox}
            disabled={isFetching || !marcaInfo?.metricool_blog_id}
            className="h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {isFetching ? '⏳ Cargando…' : '🔄 Cargar comentarios'}
          </button>

          {/* Dispatch Routine — genera borradores con IA (Claude Desktop) */}
          <button
            onClick={() => handleDispatchRoutine('generar')}
            disabled={dispatching !== null}
            title="Dispara la Routine de Claude Desktop para generar respuestas sugeridas a los comentarios pendientes"
            className="h-10 px-3 rounded-md text-sm font-medium text-white bg-[#ba41f7] hover:bg-[#9f37db] disabled:opacity-50 transition-colors shadow-sm"
          >
            {dispatching === 'generar' ? '⏳ Generando…' : '✨ Generar borradores'}
          </button>

          {/* Postear aprobados — solo visible si hay aprobados pendientes de envío */}
          {resumen.approved > 0 && (
            <button
              onClick={() => handleDispatchRoutine('postear')}
              disabled={dispatching !== null}
              title={`Dispara la Routine para postear los ${resumen.approved} aprobados a Metricool`}
              className="h-10 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {dispatching === 'postear' ? '⏳ Posteando…' : `✅ Postear ${resumen.approved} aprobados`}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <KPI label="Pendientes" value={resumen.pending} color="text-amber-600" />
          <KPI label="Aprobados" value={resumen.approved} color="text-blue-600" />
          <KPI label="Hoy respondidos" value={resumen.responded_today} color="text-emerald-600" />
          {resumen.failed > 0 && <KPI label="Fallidos" value={resumen.failed} color="text-rose-600" />}
        </div>
      </header>

      {/* TABLA */}
      {rowsIniciales.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          {marcaInfo?.metricool_blog_id ? (
            <>
              Sin comentarios pendientes. Apretá <strong>🔄 Cargar comentarios</strong> para sincronizar desde Metricool.
            </>
          ) : (
            <>Esta marca no tiene <code>metricool_blog_id</code> configurado. Configurá en /settings.</>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2 px-2 w-10">
                  <input
                    type="checkbox"
                    checked={seleccionados.size === rowsIniciales.length && rowsIniciales.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="py-2 px-2 text-left">Comentario + contexto</th>
                <th className="py-2 px-2 text-left w-44">Categoría</th>
                <th className="py-2 px-2 text-left">Respuesta sugerida (editable)</th>
                <th className="py-2 px-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rowsIniciales.map((r) => {
                const edit = ediciones.get(r.id) ?? { texto: '', categoria: 'otro' as ComentarioCategoria }
                return (
                  <ComentarioRow
                    key={r.id}
                    row={r}
                    selected={seleccionados.has(r.id)}
                    textoEditado={edit.texto}
                    categoriaEditada={edit.categoria}
                    onToggleSelect={() => toggleSelect(r.id)}
                    onChangeTexto={(t) => updateEdicion(r.id, { texto: t })}
                    onChangeCategoria={(c) => updateEdicion(r.id, { categoria: c })}
                    onSkip={() => handleSkip(r.id)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER FIXED — sticky abajo */}
      {seleccionados.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur shadow-lg">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">{seleccionados.size} seleccionados</span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarInforme}
                  onChange={(e) => setEnviarInforme(e.target.checked)}
                  className="w-4 h-4"
                />
                Enviar informe WhatsApp al grupo{' '}
                <strong>
                  {marcaInfo?.reporte_comentarios_grupo === 'cliente'
                    ? `${marcaInfo?.nombre} (cliente)`
                    : marcaInfo?.reporte_comentarios_grupo === 'ninguno'
                    ? '(ninguno — desactivado)'
                    : 'New team'}
                </strong>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSeleccionados(new Set())}
                className="h-9 px-3 rounded-md border text-sm hover:bg-muted"
              >
                Cancelar selección
              </button>
              <button
                onClick={handlePreviewInforme}
                disabled={previewing || isResponding}
                title="Manda el informe que SE ENVIARÍA a tu número personal de WhatsApp. NO postea a Metricool. NO toca clientes."
                className="h-9 px-3 rounded-md border border-amber-400 bg-amber-50 text-amber-900 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
              >
                {previewing ? '⏳ Enviando…' : `🧪 Probar informe a mi número`}
              </button>
              <button
                onClick={handleResponderClick}
                disabled={isResponding}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {isResponding ? '⏳ Enviando…' : `📤 Responder ${seleccionados.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">¿Confirmás enviar {previewSeleccionados.length} respuestas?</h2>
            <p className="text-sm text-muted-foreground">
              Una vez confirmado, cada respuesta se enviará al comentario correspondiente vía Metricool API. <strong>No se puede deshacer</strong>.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-md p-3 bg-muted/20">
              {previewSeleccionados.map((r) => {
                const edit = ediciones.get(r.id)
                return (
                  <div key={r.id} className="text-xs space-y-1 pb-2 border-b border-border last:border-0">
                    <div>
                      <strong>@{r.author_username}</strong> ({r.network}):{' '}
                      <span className="text-muted-foreground">&quot;{r.comment_text.slice(0, 80)}{r.comment_text.length > 80 ? '…' : ''}&quot;</span>
                    </div>
                    <div className="pl-3 text-emerald-700">→ &quot;{edit?.texto.slice(0, 100) ?? ''}{(edit?.texto.length ?? 0) > 100 ? '…' : ''}&quot;</div>
                  </div>
                )
              })}
            </div>
            {enviarInforme && (
              <p className="text-xs text-muted-foreground">
                📲 Después se envía informe WhatsApp al grupo{' '}
                <strong>
                  {marcaInfo?.reporte_comentarios_grupo === 'cliente' ? 'del cliente' : 'New team'}
                </strong>
                .
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-9 px-3 rounded-md border text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarBatch}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
              >
                ✅ Confirmar y enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}
