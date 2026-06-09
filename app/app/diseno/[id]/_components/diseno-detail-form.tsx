'use client'

/* DisenoDetailForm — vista simple para tareas de diseño standalone.
 *
 * Pedro pidió: solo lo relevante para diseño puro, sin Copy/Música/
 * Portada/Tomas/Guion que aplica solo a publicaciones de redes.
 *
 * Auto-save: cada campo guarda al onBlur. No requiere botón Guardar.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Calendar, Clock, Folder, Image as ImageIcon, Users,
  Save, Trash2, Archive, Hourglass, Copy as CopyIcon, ExternalLink,
} from 'lucide-react'
import { updateDisenoEntry, archivarTarea } from '../../_actions'
import { deletePublicacion } from '@/app/publicaciones/[id]/_actions'
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
  subEstado: string
  driveMaterialUrl: string | null
  driveResultadoUrl: string | null
  horaReunion: string | null
  invitadosEmails: string[]
  startedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  marcaEmoji: string | null
  marcaNombre: string
  marcaColor: string
}

export function DisenoDetailForm({ publicacion }: { publicacion: Publicacion }) {
  const router = useRouter()
  const [form, setForm] = useState(publicacion)
  const [, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

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
        <div className="flex items-center gap-2 shrink-0">
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
        <Field label="Invitados (correos separados por coma)" icon={<Users className="w-3.5 h-3.5" />}>
          <textarea
            value={form.invitadosEmails.join(', ')}
            onChange={(e) => setForm((s) => ({
              ...s, invitadosEmails: e.target.value.split(/[,;\n]/).map((x) => x.trim()),
            }))}
            onBlur={(e) => setInvitados(e.target.value)}
            placeholder="cliente@empresa.com, otrocorreo@cliente.com"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </Field>
        {form.horaReunion && (
          <div className="px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            ⚠ Sync con Google Calendar en proceso. La reunión queda guardada y se sincronizará automáticamente cuando se conecte.
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
