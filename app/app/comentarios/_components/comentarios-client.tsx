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
import { RefreshCw, Sparkles, Send, FlaskConical, CheckCircle2, Loader2 } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import {
  fetchComentariosFromMetricool,
  actualizarComentarioBorrador,
  skipComentario,
  responderBatch,
  postearAprobados,
  generarBorradoresIA,
  previewInformeNewTeam,
  enviarInformeResueltos,
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
  const [conInforme, setConInforme] = useState(true)  // si el responder lleva informe WhatsApp
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [respondiendoId, setRespondiendoId] = useState<string | null>(null)  // respuesta individual en curso

  // Postear aprobados directo a Metricool (sin rutina de Claude)
  const [isPosting, startPosting] = useTransition()

  // Preview informe (modo prueba — manda al número personal de Pedro sin tocar Metricool)
  const [previewing, setPreviewing] = useState(false)
  const [, startPreviewTransition] = useTransition()

  function handlePruebaNewTeam() {
    if (seleccionados.size === 0) {
      toast.error('Seleccioná al menos 1 comentario primero')
      return
    }
    setPreviewing(true)
    startPreviewTransition(async () => {
      const toastId = toast.loading(`🧪 Enviando informe de prueba a "New team" con ${seleccionados.size} comentarios…`)
      const r = await previewInformeNewTeam(Array.from(seleccionados))
      if (r.ok) {
        toast.success(
          `✅ Informe de prueba enviado al grupo "New team" (${r.marcas_procesadas} marca${r.marcas_procesadas > 1 ? 's' : ''}). NO se posteó nada a Metricool ni a clientes.`,
          { id: toastId, duration: 10000 },
        )
      } else {
        toast.error(`Error: ${r.error}`, { id: toastId, duration: 8000 })
      }
      setPreviewing(false)
    })
  }

  // Postea los aprobados directo a Metricool (sin rutina de Claude).
  function handlePostearAprobados() {
    startPosting(async () => {
      const toastId = toast.loading(`Posteando ${resumen.approved} aprobados a Metricool…`)
      const r = await postearAprobados(marcaActual)
      if (r.ok) {
        toast.success(
          `✅ ${r.respondidos} posteados a Metricool${r.fallidos > 0 ? ` · ${r.fallidos} fallidos` : ''}`,
          { id: toastId, duration: 8000 },
        )
        router.refresh()
      } else {
        toast.error(`Error: ${r.error}`, { id: toastId, duration: 9000 })
      }
    })
  }

  const [isFetching, startFetching] = useTransition()
  const [isResponding, startResponding] = useTransition()
  const [isGenerating, startGenerating] = useTransition()
  const [informando, startInforme] = useTransition()

  // Envía el informe de lo respondido HOY (sin necesidad de seleccionar comentarios).
  function handleInforme(modo: 'cliente' | 'newteam') {
    startInforme(async () => {
      const destinoTxt = modo === 'newteam' ? 'New team (prueba)' : 'el grupo del cliente'
      const toastId = toast.loading(`Enviando informe a ${destinoTxt}…`)
      const r = await enviarInformeResueltos(marcaActual, modo)
      if (r.ok) {
        toast.success(`✅ Informe de ${r.comentarios} comentarios enviado a ${r.sent_to}`, { id: toastId, duration: 8000 })
      } else {
        toast.error(r.error, { id: toastId, duration: 9000 })
      }
    })
  }

  const marcaInfo = marcas.find((m) => m.slug === marcaActual)

  // ====== handlers ======

  function changeMarca(slug: string) {
    const params = new URLSearchParams(sp)
    params.set('marca', slug)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleFetchInbox(opciones?: { silencioso?: boolean }) {
    const silencioso = opciones?.silencioso ?? false
    startFetching(async () => {
      if (!silencioso) toast.loading(`Cargando comentarios de ${marcaInfo?.nombre}…`, { id: 'fetch' })
      const result = await fetchComentariosFromMetricool(marcaActual)
      if (result.ok) {
        if (!silencioso) {
          toast.success(
            `✅ ${result.inserted} nuevos en inbox · ✨ ${result.generados} borradores IA listos` +
              (result.errors.length > 0 ? ` · ${result.errors.length} errores` : ''),
            { id: 'fetch', duration: 8000 },
          )
        } else if (result.inserted > 0) {
          /* Auto-fetch silencioso: solo notificar si encontró nuevos */
          toast.success(`${result.inserted} nuevos comentarios sincronizados`, { duration: 3000 })
        }
        router.refresh()
      } else {
        if (!silencioso) toast.error(`Error: ${result.error}`, { id: 'fetch' })
        else console.warn('[auto-fetch comentarios]', result.error)
      }
    })
  }

  /* Auto-cargar comentarios al montar/cambiar marca.
     Pedro pidió que no tenga que apretar "Cargar comentarios" cada vez.
     Estrategia: silencioso (no toast spam), solo si pasaron >2 min desde
     el último auto-fetch para esta marca (evita spamear Metricool). */
  useEffect(() => {
    if (!marcaInfo?.metricool_blog_id) return  /* sin Metricool configurado */
    const cacheKey = `mk:autofetch:${marcaActual}`
    const last = sessionStorage.getItem(cacheKey)
    const lastTs = last ? parseInt(last, 10) : 0
    const now = Date.now()
    /* Si pasaron menos de 2 min, no re-cargar */
    if (now - lastTs < 2 * 60 * 1000) return
    sessionStorage.setItem(cacheKey, now.toString())
    handleFetchInbox({ silencioso: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaActual])

  // Genera borradores con IA (OpenAI) para los pendientes sin respuesta.
  function handleGenerarIA() {
    startGenerating(async () => {
      const toastId = toast.loading('✨ Generando borradores con IA…')
      const r = await generarBorradoresIA(marcaActual)
      if (r.ok) {
        toast.success(`✨ ${r.generados} borradores generados con IA`, { id: toastId, duration: 8000 })
        router.refresh()
      } else {
        toast.error(r.error, { id: toastId, duration: 10000 })
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

  function handleResponderClick(informe: boolean) {
    if (seleccionados.size === 0) {
      toast.warning('Seleccioná al menos un comentario')
      return
    }
    setConInforme(informe)
    setConfirmOpen(true)
  }

  function handleConfirmarBatch() {
    setConfirmOpen(false)
    startResponding(async () => {
      // Persistir todas las ediciones antes de responder
      const promesas = Array.from(seleccionados).map((id) => persistEdicion(id))
      await Promise.all(promesas)

      toast.loading(`Respondiendo ${seleccionados.size} comentarios via Metricool…`, { id: 'batch' })
      const r = await responderBatch(Array.from(seleccionados), conInforme)
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

  // Responder UN comentario individual → postea a Metricool (sin informe) y pasa a 'respondido'.
  function handleResponderIndividual(id: string) {
    setRespondiendoId(id)
    startResponding(async () => {
      await persistEdicion(id)   // guarda primero el texto editado
      const toastId = toast.loading('Respondiendo comentario via Metricool…')
      const r = await responderBatch([id], false)
      if (r.ok && r.respondidos > 0) {
        toast.success('✅ Comentario respondido', { id: toastId, duration: 5000 })
        setSeleccionados((prev) => { const n = new Set(prev); n.delete(id); return n })
        router.refresh()
      } else if (r.ok) {
        toast.error('No se pudo responder (¿la respuesta está vacía?)', { id: toastId, duration: 6000 })
      } else {
        toast.error(`Error: ${r.error}`, { id: toastId, duration: 8000 })
      }
      setRespondiendoId(null)
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
          <MarcaLogo slug={marcaActual} nombre={marcaInfo?.nombre} emoji={marcaInfo?.emoji_marca} size={36} />
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
          {/* Refrescar desde Metricool */}
          <button
            onClick={() => handleFetchInbox()}
            disabled={isFetching || !marcaInfo?.metricool_blog_id}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            title="Forzar refresh manual desde Metricool"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Sincronizando…' : 'Refrescar'}
          </button>

          {/* Generar borradores con IA (OpenAI gpt-4o-mini) */}
          <button
            onClick={handleGenerarIA}
            disabled={isGenerating}
            title="Genera respuestas sugeridas con IA (post + comentario + voz de la marca) para los pendientes sin borrador"
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-sm font-medium text-white hover:brightness-95 disabled:opacity-50 transition-all shadow-sm"
            style={{ background: '#ba41f7' }}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? 'Generando…' : 'Generar borradores'}
          </button>

          {/* Informe a WhatsApp del cliente (de lo respondido hoy) */}
          <button
            onClick={() => handleInforme('cliente')}
            disabled={informando}
            title="Envía el informe de los comentarios respondidos hoy al grupo de WhatsApp del cliente."
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {informando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Informe a WhatsApp
          </button>

          {/* Informe de prueba a New team (grupo interno) */}
          <button
            onClick={() => handleInforme('newteam')}
            disabled={informando}
            title="Envía el informe de hoy al grupo interno 'New team' (prueba, sin riesgo)."
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {informando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Informe de prueba
          </button>

          {/* Postear aprobados — directo a Metricool */}
          {resumen.approved > 0 && (
            <button
              onClick={handlePostearAprobados}
              disabled={isPosting}
              title={`Postea los ${resumen.approved} aprobados directo a Metricool`}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isPosting ? 'Posteando…' : `Postear ${resumen.approved}`}
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
              Sin comentarios pendientes 🎉 Los nuevos se sincronizan automáticamente al entrar a esta página.
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
                    onResponder={() => handleResponderIndividual(r.id)}
                    responding={respondiendoId === r.id}
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
              <button
                onClick={() => setSeleccionados(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Quitar selección
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1) Responder comentarios (postea a Metricool, sin informe) */}
              <button
                onClick={() => handleResponderClick(false)}
                disabled={isResponding}
                title="Postea las respuestas a Metricool. Sin informe de WhatsApp."
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {isResponding ? '⏳ Enviando…' : `📤 Responder ${seleccionados.size} comentarios`}
              </button>
              {/* 2) Responder + informe al grupo de WhatsApp configurado */}
              <button
                onClick={() => handleResponderClick(true)}
                disabled={isResponding}
                title="Postea las respuestas a Metricool y envía el informe al grupo de WhatsApp configurado de la marca."
                className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isResponding ? '⏳ Enviando…' : `📲 Responder + informe a WhatsApp`}
              </button>
              {/* 3) Informe de PRUEBA al grupo interno New team (no postea nada) */}
              <button
                onClick={handlePruebaNewTeam}
                disabled={previewing || isResponding}
                title="Manda el informe que SE ENVIARÍA, pero al grupo interno 'New team'. NO postea a Metricool ni a clientes."
                className="h-9 px-3 rounded-md border border-amber-400 bg-amber-50 text-amber-900 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
              >
                {previewing ? '⏳ Enviando…' : `🧪 Informe de prueba a New team`}
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
            {conInforme && (
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
