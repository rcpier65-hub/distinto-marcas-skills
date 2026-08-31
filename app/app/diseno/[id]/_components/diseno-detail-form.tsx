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
  Save, Trash2, Archive, Hourglass, Copy as CopyIcon, ExternalLink, Video, Loader2,
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
  { value: 'sin_empezar', label: 'Sin empezar', color: '#737373' },
  { value: 'en_progreso', label: 'En progreso', color: '#60a5fa' },
  { value: 'listo',       label: 'Listo',       color: '#34d399' },
  { value: 'archivado',   label: 'Archivado',   color: '#a78bfa' },
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
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: form.marcaColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xl">{form.marcaEmoji}</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium font-mono"
              style={{ backgroundColor: `${form.marcaColor}1f`, color: form.marcaColor }}>
              {form.marcaNombre}
            </span>
            <SubEstadoBadge value={form.subEstado as SubEstadoDiseno} onChange={setSubEstado} />
            {isSaving && <span className="text-[10px] text-muted-foreground">guardando…</span>}
          </div>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
            onBlur={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la tarea…"
            className="w-full text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-muted focus:border-primary focus:outline-none transition-colors py-1 mb-3"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          {/* Botón HOY — lo pidió Aylin: mandar la tarea a su lista de hoy sin
              perderla. Morado lleno = ya está en hoy. */}
          <button
            onClick={toggleHoy}
            disabled={togglingHoy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors disabled:opacity-50"
            style={marcadaHoy
              ? { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' }
              : { background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.35)' }}
            title={marcadaHoy ? 'Quitar de tu lista de hoy' : 'Añadir a tu lista de HOY'}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            {marcadaHoy ? 'En HOY ✓' : 'Trabajar HOY'}
          </button>
          <button
            onClick={handleArchive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
            title={form.subEstado === 'archivado' ? 'Reactivar' : 'Archivar'}
          >
            <Archive className="w-3.5 h-3.5" />
            {form.subEstado === 'archivado' ? 'Reactivar' : 'Archivar'}
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            title="Eliminar permanentemente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CARD: Información básica */}
      <Section title="📝 Información">
        <Field label="Descripción / Brief">
          <textarea
            value={form.descripcion ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
            onBlur={(e) => setDescripcion(e.target.value)}
            placeholder="¿Qué hay que diseñar? Referencias, especificaciones, etc."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
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
          <Field label="También para estas marcas (opcional)">
            <div className="flex flex-wrap gap-1.5">
              {marcas
                .filter((m) => m.slug !== form.marcaSlug)
                .map((m) => {
                  const on = extras.has(m.slug)
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => toggleExtra(m.slug)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        on
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      <span>{m.emoji ?? '🏷️'}</span>
                      <span>{m.nombre}</span>
                    </button>
                  )
                })}
            </div>
          </Field>
        )}
      </Section>

      {/* CARD: Fechas */}
      <Section title="📅 Fechas">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de entrega" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={form.fechaEntrega ?? ''}
              onChange={(e) => setFecha('fechaEntrega', e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            />
          </Field>
          <Field label="Fecha de diseño" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={form.fechaDiseno ?? ''}
              onChange={(e) => setFecha('fechaDiseno', e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            />
          </Field>
        </div>
      </Section>

      {/* CARD: Enlaces de Drive */}
      <Section title="📁 Enlaces de Drive">
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
      <Section title="📹 Reunión de revisión">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora" icon={<Clock className="w-3.5 h-3.5" />}>
            <input
              type="time"
              value={form.horaReunion ?? ''}
              onChange={(e) => setHora(e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
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
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
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
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-emerald-600 hover:underline w-fit"
              >
                <Video className="w-4 h-4" /> Unirse por Google Meet <ExternalLink className="w-3.5 h-3.5" />
              </a>
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

      {/* META + timeline si archivada */}
      <Section title="ℹ Estado y tiempo">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>Creada: {formatDateTimeES(form.createdAt)}</span>
          <span>·</span>
          <span>Última edición: {formatDateTimeES(form.updatedAt)}</span>
          {form.startedAt && (
            <>
              <span>·</span>
              <span><Hourglass className="inline w-3 h-3 mr-1" />Empezada: {formatDateTimeES(form.startedAt)}</span>
            </>
          )}
          {form.archivedAt && (
            <>
              <span>·</span>
              <span>Archivada: {formatDateTimeES(form.archivedAt)}</span>
            </>
          )}
          {duracion && (
            <>
              <span>·</span>
              <span className="font-medium" style={{ color: '#a78bfa' }}>Duró: {duracion}</span>
            </>
          )}
        </div>
      </Section>

      {/* STICKY save bar */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-2 z-30">
        <span className="text-xs text-muted-foreground">
          {isSaving ? '💾 Guardando…' : '✓ Auto-guarda al salir de cada campo'}
        </span>
        <button
          onClick={() => router.push('/diseno')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          <Save className="w-3.5 h-3.5" />
          Volver al Kanban
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-componentes
   ============================================================ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
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
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
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
        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="px-3 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>
          <a
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en Drive"
            className="px-3 py-2 border border-border rounded-md hover:bg-muted transition-colors inline-flex items-center gap-1"
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
  const current = SUBESTADO_OPTIONS.find((o) => o.value === value) ?? SUBESTADO_OPTIONS[0]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SubEstadoDiseno)}
      className="text-xs px-2 py-0.5 rounded-md font-medium border-0 cursor-pointer"
      style={{ backgroundColor: `${current.color}1f`, color: current.color }}
    >
      {SUBESTADO_OPTIONS.map((o) => (
        <option key={o.value} value={o.value} style={{ color: 'var(--foreground)', backgroundColor: 'var(--background)' }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
