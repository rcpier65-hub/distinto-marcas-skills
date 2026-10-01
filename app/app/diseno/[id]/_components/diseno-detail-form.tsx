'use client'

/* DisenoDetailForm — vista simple para tareas de diseño standalone.
 *
 * Pedro pidió: solo lo relevante para diseño puro, sin Copy/Música/
 * Portada/Tomas/Guion que aplica solo a publicaciones de redes.
 *
 * Auto-save: cada campo guarda al onBlur. No requiere botón Guardar.
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Calendar, CalendarCheck, Clock, Folder, Image as ImageIcon, Users,
  Trash2, Archive, Hourglass, Copy as CopyIcon, ExternalLink, Video, Loader2,
  FileText, ArrowLeft, Check, ChevronDown, CircleDot, PlayCircle, CheckCircle2, Tags,
} from 'lucide-react'
import { updateDisenoEntry, archivarTarea, marcarParaDisenarHoy, desmarcarParaDisenarHoy, obtenerCorreosDeMarca } from '../../_actions'
import { deletePublicacion } from '@/app/publicaciones/[id]/_actions'
import { esRedireccion } from '@/lib/utils/is-redirect-error'
import { sincronizarReunion } from '../_reunion-actions'
import { MarcaSelect } from '@/components/marca-select'
import { hoyLima } from '@/lib/fechas/hoy'
import {
  formatDateTimeES,
  formatDuracion,
  type SubEstadoDiseno,
} from '@/lib/diseno/types'

const SUBESTADO_OPTIONS: { value: SubEstadoDiseno; label: string; color: string }[] = [
  { value: 'sin_empezar', label: 'Sin empezar', color: '#64748b' },
  { value: 'en_progreso', label: 'En progreso', color: '#2563eb' },
  { value: 'listo',       label: 'Listo',       color: '#059669' },
  { value: 'archivado',   label: 'Archivado',   color: '#7c3aed' },
]

type Publicacion = {
  id: string
  nombre: string
  descripcion: string | null
  fechaDiseno: string | null
  fechaEntrega: string | null
  fechaMarcadaParaDisenar: string | null
  subEstado: string
  driveMaterialUrl: string | null
  driveResultadoUrl: string | null
  horaReunion: string | null
  invitadosEmails: string[]
  startedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  marcaSlug: string
  marcaEmoji: string | null
  marcaNombre: string
  marcaColor: string
  reunionMeetLink: string | null
}

type MarcaOpt = { slug: string; nombre: string; emoji?: string | null }

export function DisenoDetailForm({
  publicacion,
  marcas = [],
  marcasExtraSlugs = [],
}: {
  publicacion: Publicacion
  marcas?: MarcaOpt[]
  marcasExtraSlugs?: string[]
}) {
  const router = useRouter()
  const [form, setForm] = useState(publicacion)
  /* Etiquetas de marca extra (slugs). Pedro: "en una sola tarea etiquetar
     varias marcas". La principal NO va acá (se cambia con el selector). */
  const [extras, setExtras] = useState<Set<string>>(() => new Set(marcasExtraSlugs))
  const [verExtras, setVerExtras] = useState(false)
  const [, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [meetLink, setMeetLink] = useState<string | null>(publicacion.reunionMeetLink)
  const [syncing, setSyncing] = useState(false)
  /* "Trabajar HOY": marca fecha_marcada_para_disenar = hoy. Ancla la tarea a la
     lista de hoy de Aylin (filtro "solo hoy") — así, aunque cambie el estado y
     la tarjeta se mueva de columna en el Kanban, no la pierde. Aylin 10-jul. */
  const HOY = hoyLima() // hora Lima, no UTC (ver lib/fechas/hoy)
  const [marcadaHoy, setMarcadaHoy] = useState<boolean>(publicacion.fechaMarcadaParaDisenar === HOY)
  const [togglingHoy, setTogglingHoy] = useState(false)

  function toggleHoy() {
    const nuevo = !marcadaHoy
    setMarcadaHoy(nuevo)
    setTogglingHoy(true)
    startTransition(async () => {
      const r = nuevo ? await marcarParaDisenarHoy(form.id) : await desmarcarParaDisenarHoy(form.id)
      setTogglingHoy(false)
      if (!r.ok) { setMarcadaHoy(!nuevo); toast.error(r.error); return }
      toast.success(nuevo ? '📌 Añadida a tu lista de HOY' : 'Quitada de hoy', { duration: 1500 })
    })
  }

  /* Correos del CLIENTE de la marca (Settings): se invitan SOLOS a la reunión
     de revisión — acá solo los mostramos para que se sepa quiénes van.
     Pedro 31-ago-2026: "ya debe saber quiénes son los invitados". */
  const [correosMarca, setCorreosMarca] = useState<string[] | null>(null)
  useEffect(() => {
    let vivo = true
    if (!form.marcaSlug || form.marcaSlug === 'interno') { setCorreosMarca([]); return }
    obtenerCorreosDeMarca(form.marcaSlug)
      .then((r) => { if (vivo) setCorreosMarca(r.ok ? r.correos : []) })
      .catch(() => { if (vivo) setCorreosMarca([]) })
    return () => { vivo = false }
  }, [form.marcaSlug])

  // Crea/actualiza la reunión en Google Calendar (con hora + Meet + invitados).
  function handleSincronizarReunion() {
    setSyncing(true)
    startTransition(async () => {
      const r = await sincronizarReunion(form.id)
      setSyncing(false)
      if (r.ok) {
        setMeetLink(r.meetLink)
        toast.success('✅ Reunión creada — invitación enviada al cliente y visible en el calendario', { duration: 5000 })
      } else {
        toast.error(r.error, { duration: 8000 })
      }
    })
  }

  function save(patch: Parameters<typeof updateDisenoEntry>[1], msg?: string) {
    setIsSaving(true)
    startTransition(async () => {
      const r = await updateDisenoEntry(form.id, patch)
      setIsSaving(false)
      if (!r.ok) {
        toast.error(`Error: ${r.error}`)
      } else if (msg) {
        toast.success(msg, { duration: 1200 })
      }
    })
  }

  function setNombre(v: string) {
    const t = v.trim()
    if (!t) { toast.error('El nombre no puede estar vacío'); return }
    setForm((s) => ({ ...s, nombre: t }))
    save({ nombre: t }, '✓ Nombre guardado')
  }
  function setDescripcion(v: string) {
    setForm((s) => ({ ...s, descripcion: v }))
    save({ descripcion: v || null }, '✓ Descripción guardada')
  }
  /* Cambiar la marca de la tarea (Pedro: "a veces quiero cambiar de marca"). */
  function setMarca(slug: string) {
    const m = marcas.find((x) => x.slug === slug)
    setForm((s) => ({
      ...s,
      marcaSlug: slug || 'interno',
      marcaNombre: m?.nombre ?? 'Distinto · Interno',
      marcaEmoji: m?.emoji ?? '🎨',
    }))
    /* Si la nueva principal estaba como etiqueta extra, la quitamos de extras
       (no tiene sentido etiquetar dos veces la misma marca). */
    if (slug && extras.has(slug)) {
      const next = new Set(extras)
      next.delete(slug)
      setExtras(next)
      save({ marcaSlug: slug, marcasExtras: Array.from(next) }, '✓ Marca actualizada')
    } else {
      save({ marcaSlug: slug || null }, '✓ Marca actualizada')
    }
    // Refresca para traer el color real de la marca nueva en el header.
    setTimeout(() => router.refresh(), 400)
  }
  /* Agrega/quita una etiqueta de marca extra. Guarda el conjunto completo. */
  function toggleExtra(slug: string) {
    const next = new Set(extras)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    setExtras(next)
    save({ marcasExtras: Array.from(next) }, '✓ Etiquetas actualizadas')
    setTimeout(() => router.refresh(), 400)
  }
  function setFecha(field: 'fechaDiseno' | 'fechaEntrega', v: string) {
    setForm((s) => ({ ...s, [field]: v || null }))
    save({ [field]: v || null }, '✓ Fecha guardada')
  }
  function setDrive(field: 'driveMaterialUrl' | 'driveResultadoUrl', v: string) {
    setForm((s) => ({ ...s, [field]: v || null }))
    save({ [field]: v || null }, '✓ Drive guardado')
  }
  function setSubEstado(v: SubEstadoDiseno) {
    setForm((s) => ({ ...s, subEstado: v }))
    save({ subEstado: v }, `→ ${SUBESTADO_OPTIONS.find((o) => o.value === v)?.label}`)
  }
  function setHora(v: string) {
    setForm((s) => ({ ...s, horaReunion: v || null }))
    save({ horaReunion: v || null }, '✓ Hora guardada')
  }
  function setInvitados(v: string) {
    const emails = v.split(/[,;\n]/).map((s) => s.trim()).filter((s) => /@.+\./.test(s))
    setForm((s) => ({ ...s, invitadosEmails: emails }))
    save({ invitadosEmails: emails }, `✓ ${emails.length} invitados`)
  }

  function handleArchive() {
    const wasArchivado = form.subEstado === 'archivado'
    setForm((s) => ({ ...s, subEstado: wasArchivado ? 'sin_empezar' : 'archivado' }))
    startTransition(async () => {
      const r = await archivarTarea(form.id, !wasArchivado)
      if (!r.ok) toast.error(`Error: ${r.error}`)
      else toast.success(wasArchivado ? 'Reactivada' : 'Archivada 📦')
    })
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta tarea? No se puede deshacer.')) return
    startTransition(async () => {
      try {
        /* Volver al listado de Diseño, NO a /publicaciones — Ailyn no
           tiene acceso a publicaciones y la veía como página rara. */
        await deletePublicacion(form.id, '/diseno')
      } catch (e) {
        if (esRedireccion(e)) throw e
        toast.error(`Error al eliminar: ${(e as Error).message}`)
      }
    })
  }

  const duracion = form.startedAt && form.archivedAt
    ? formatDuracion(form.startedAt, form.archivedAt)
    : null

  /* openPickerOnFocus para fix calendar — mismo helper que el modal */
  const openPickerOnFocus = (e: React.SyntheticEvent<HTMLInputElement>) => {
    try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {}
  }

  return (
    <div className="space-y-5 pb-20">
      {/* HEADER */}
      <div className="rounded-[18px] border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="h-1" style={{ background: form.marcaColor }} />
        <div className="p-5 flex items-start gap-4 flex-wrap">
          <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center text-xl shrink-0"
            style={{ background: `${form.marcaColor}18` }}>{form.marcaEmoji}</span>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${form.marcaColor}14`, color: form.marcaColor, border: `1px solid ${form.marcaColor}33` }}>
                {form.marcaNombre}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {isSaving ? 'Guardando…' : 'Se guarda solo'}
              </span>
            </div>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              onBlur={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la tarea…"
              className="w-full text-[26px] leading-tight font-bold tracking-tight text-slate-900 bg-transparent border-0 border-b-2 border-transparent hover:border-slate-100 focus:border-[#7170ff] focus:outline-none transition-colors py-1"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleHoy}
              disabled={togglingHoy}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
              style={marcadaHoy
                ? { background: '#7170ff', color: '#fff', border: '1px solid #7170ff' }
                : { background: '#f5f3ff', color: '#6d5dfc', border: '1px solid #ddd6fe' }}
              title={marcadaHoy ? 'Quitar de tu lista de hoy' : 'Añadir a tu lista de HOY'}
            >
              <CalendarCheck className="w-4 h-4" />
              {marcadaHoy ? 'En hoy' : 'Trabajar hoy'}
            </button>
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-[10px] hover:bg-slate-50 transition-colors"
              title={form.subEstado === 'archivado' ? 'Reactivar' : 'Archivar'}
            >
              <Archive className="w-4 h-4" />
              {form.subEstado === 'archivado' ? 'Reactivar' : 'Archivar'}
            </button>
            <button
              onClick={handleDelete}
              className="w-9 h-9 inline-flex items-center justify-center text-red-500 bg-white border border-red-200 rounded-[10px] hover:bg-red-50 transition-colors"
              title="Eliminar permanentemente"
              aria-label="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Estado como control segmentado */}
        <div className="px-5 pb-5">
          <SubEstadoBadge value={form.subEstado as SubEstadoDiseno} onChange={setSubEstado} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="space-y-5 min-w-0">
      {/* CARD: Información básica */}
      <Section icon={<FileText className="w-4 h-4" />} title="Información" color="#7170ff">
        <Field label="Descripción / Brief">
          <textarea
            value={form.descripcion ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
            onBlur={(e) => setDescripcion(e.target.value)}
            placeholder="¿Qué hay que diseñar? Referencias, especificaciones, etc."
            rows={4}
            className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition resize-y leading-relaxed"
          />
        </Field>
        {/* Cambiar marca de la tarea (Pedro 15-jun-2026). */}
        {marcas.length > 0 && (
          <Field label="Marca / cliente">
            <MarcaSelect
              marcas={marcas}
              value={form.marcaSlug === 'interno' ? '' : form.marcaSlug}
              onChange={setMarca}
            />
          </Field>
        )}
        {/* Etiquetas extra: una sola tarea para varias marcas. Excluye la
            principal (esa se cambia arriba). */}
        {marcas.length > 1 && (
          <div>
            <button type="button" onClick={() => setVerExtras((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6d5dfc] hover:opacity-80">
              <Tags className="w-4 h-4" /> Etiquetar más marcas{extras.size > 0 ? ` · ${extras.size}` : ''}
              <ChevronDown className={`w-4 h-4 transition-transform ${verExtras ? 'rotate-180' : ''}`} />
            </button>
            {verExtras && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {marcas
                .filter((m) => m.slug !== form.marcaSlug)
                .map((m) => {
                  const on = extras.has(m.slug)
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => toggleExtra(m.slug)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold border transition-colors ${
                        on
                          ? 'bg-[#f5f3ff] text-[#6d5dfc] border-[#c4b5fd]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      <span>{m.emoji ?? '🏷️'}</span>
                      <span>{m.nombre}</span>
                    </button>
                  )
                })}
            </div>
            )}
          </div>
        )}
      </Section>

      {/* CARD: Enlaces de Drive */}
      <Section icon={<Folder className="w-4 h-4" />} title="Enlaces de Drive" color="#0d9488">
        <Field label="Material para trabajar" icon={<Folder className="w-3.5 h-3.5" />}>
          <DriveInput
            value={form.driveMaterialUrl ?? ''}
            onSave={(v) => setDrive('driveMaterialUrl', v)}
            placeholder="https://drive.google.com/… (carpeta con referencias, brief, assets)"
          />
        </Field>
        <Field label="Diseño terminado" icon={<ImageIcon className="w-3.5 h-3.5" />}>
          <DriveInput
            value={form.driveResultadoUrl ?? ''}
            onSave={(v) => setDrive('driveResultadoUrl', v)}
            placeholder="https://drive.google.com/… (entregable final)"
          />
        </Field>
      </Section>

      {/* CARD: Reunión */}
      <Section icon={<Video className="w-4 h-4" />} title="Reunión de revisión" color="#10b981">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora" icon={<Clock className="w-3.5 h-3.5" />}>
            <input
              type="time"
              value={form.horaReunion ?? ''}
              onChange={(e) => setHora(e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition cursor-pointer"
            />
          </Field>
        </div>
        {/* Invitados automáticos: los correos del cliente de la marca. */}
        {correosMarca && correosMarca.length > 0 && (
          <div className="px-3 py-2 rounded-md text-xs border" style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#5b21b6' }}>
            ✓ Se invitará automáticamente al cliente de <strong>{form.marcaNombre}</strong>:{' '}
            <strong>{correosMarca.join(', ')}</strong>
          </div>
        )}
        {correosMarca && correosMarca.length === 0 && form.marcaSlug !== 'interno' && (
          <div className="px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            ⚠ {form.marcaNombre} no tiene correos de cliente guardados (Settings → Correos de cliente por marca). Agrégalos ahí o escribe correos abajo.
          </div>
        )}
        <Field label="Invitados adicionales (opcional, separados por coma)" icon={<Users className="w-3.5 h-3.5" />}>
          <textarea
            value={form.invitadosEmails.join(', ')}
            onChange={(e) => setForm((s) => ({
              ...s, invitadosEmails: e.target.value.split(/[,;\n]/).map((x) => x.trim()),
            }))}
            onBlur={(e) => setInvitados(e.target.value)}
            placeholder="algún correo extra… (el cliente ya va invitado solo)"
            rows={2}
            className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition resize-y leading-relaxed"
          />
        </Field>
        {/* Sincronizar reunión a Google Calendar (con Meet + invitados) */}
        {form.horaReunion && form.fechaEntrega && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSincronizarReunion}
              disabled={syncing}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ background: '#ba41f7' }}
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              {meetLink ? 'Actualizar reunión en Calendar' : 'Crear reunión en Calendar (con Meet)'}
            </button>
            {meetLink && (
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:underline w-fit"
                >
                  <Video className="w-4 h-4" /> Unirse por Google Meet <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {/* Copiar el enlace para mandarlo a quien deba unirse. */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(meetLink)
                      toast.success('🔗 Enlace de Meet copiado — pégalo y envíalo')
                    } catch {
                      toast.error('No pude copiar. Mantén presionado el enlace para copiarlo.')
                    }
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium hover:bg-muted"
                  title="Copiar el enlace de Meet"
                >
                  <CopyIcon className="w-3.5 h-3.5" /> Copiar enlace
                </button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Crea el evento el <strong>{form.fechaEntrega}</strong> a las <strong>{form.horaReunion}</strong> con Meet, le <strong>manda la invitación por correo al cliente</strong> y la reunión aparece en el calendario de <strong>Grabaciones y Reuniones</strong>.
            </p>
          </div>
        )}
        {form.horaReunion && !form.fechaEntrega && (
          <div className="px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            ⚠ Pon también la <strong>fecha de entrega</strong> arriba — esa será la fecha de la reunión en el calendario.
          </div>
        )}
      </Section>

      </div>
      <div className="space-y-5 lg:sticky lg:top-4">
      {/* CARD: Fechas */}
      <Section icon={<Calendar className="w-4 h-4" />} title="Fechas" color="#0284c7">
        <div className="grid gap-4">
          <Field label="Fecha de entrega" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={form.fechaEntrega ?? ''}
              onChange={(e) => setFecha('fechaEntrega', e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition cursor-pointer"
            />
          </Field>
          <Field label="Fecha de diseño" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={form.fechaDiseno ?? ''}
              onChange={(e) => setFecha('fechaDiseno', e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition cursor-pointer"
            />
          </Field>
        </div>
      </Section>

      {/* META + timeline si archivada */}
      <Section icon={<Hourglass className="w-4 h-4" />} title="Estado y tiempo" color="#64748b">
        <div className="grid gap-2 text-[12.5px] text-slate-500 [&>span:empty]:hidden [&>span.sep]:hidden">
          <span>Creada: {formatDateTimeES(form.createdAt)}</span>
          <span className="sep">·</span>
          <span>Última edición: {formatDateTimeES(form.updatedAt)}</span>
          {form.startedAt && (
            <>
              <span className="sep">·</span>
              <span><Hourglass className="inline w-3 h-3 mr-1" />Empezada: {formatDateTimeES(form.startedAt)}</span>
            </>
          )}
          {form.archivedAt && (
            <>
              <span className="sep">·</span>
              <span>Archivada: {formatDateTimeES(form.archivedAt)}</span>
            </>
          )}
          {duracion && (
            <>
              <span className="sep">·</span>
              <span className="font-medium" style={{ color: '#a78bfa' }}>Duró: {duracion}</span>
            </>
          )}
        </div>
      </Section>

      </div>
      </div>

      {/* STICKY save bar */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-between gap-2 z-30">
        <span className="text-[12.5px] text-slate-500 inline-flex items-center gap-1.5">
          {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</> : <><Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} /> Todo guardado</>}
        </span>
        <button
          onClick={() => router.push('/diseno')}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold text-white rounded-[11px] hover:opacity-90 transition-opacity shadow-[0_8px_18px_-8px_rgba(113,112,255,0.8)]"
          style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Diseño
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-componentes
   ============================================================ */

function Section({ icon, title, color = '#7170ff', children }: { icon: React.ReactNode; title: string; color?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
        <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: `${color}14`, color }}>{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label, icon, children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </span>
      {children}
    </label>
  )
}

/* Input de Drive con botón "Abrir" en nueva pestaña al lado.
   Usa el patrón LinkInput del form de publicación para consistencia. */
function DriveInput({
  value, onSave, placeholder,
}: {
  value: string
  onSave: (v: string) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState(value)
  const safe = draft.trim()
  const hasValue = safe.length > 0
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v !== value) onSave(v)
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition"
      />
      {hasValue && (
        <>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(safe)
              toast.success('Enlace copiado', { duration: 1000 })
            }}
            title="Copiar"
            className="w-10 h-10 inline-flex items-center justify-center border border-slate-200 rounded-[10px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>
          <a
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en Drive"
            className="w-10 h-10 inline-flex items-center justify-center border border-slate-200 rounded-[10px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </>
      )}
    </div>
  )
}

function SubEstadoBadge({
  value, onChange,
}: {
  value: SubEstadoDiseno
  onChange: (v: SubEstadoDiseno) => void
}) {
  const ICONOS: Record<string, React.ReactNode> = {
    sin_empezar: <CircleDot className="w-4 h-4" />,
    en_progreso: <PlayCircle className="w-4 h-4" />,
    listo: <CheckCircle2 className="w-4 h-4" />,
    archivado: <Archive className="w-4 h-4" />,
  }
  return (
    <div role="radiogroup" aria-label="Estado del diseño" className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full border border-slate-200 bg-slate-50">
      {SUBESTADO_OPTIONS.map((o) => {
        const activo = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={activo} onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-all ${activo ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            style={activo ? { color: o.color, boxShadow: `0 0 0 1.5px ${o.color}55, 0 1px 3px rgba(15,23,42,0.08)` } : undefined}>
            {ICONOS[o.value]}{o.label}
          </button>
        )
      })}
    </div>
  )
}
