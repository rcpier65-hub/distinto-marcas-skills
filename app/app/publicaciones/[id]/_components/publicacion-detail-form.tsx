// app/app/publicaciones/[id]/_components/publicacion-detail-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updatePublicacion, deletePublicacion, togglePublicacionField } from '../_actions'
import { duplicarPublicacion } from '../../_actions'
import { ESTADO_PUBLICACION_LABEL, type EstadoPublicacion, type PublicacionRow } from '@/lib/types/database'

const ESTADOS: EstadoPublicacion[] = [
  'tareas', 'idear', 'editando', 'editar', 'disenar',
  'enviado', 'aprobar', 'programar', 'programar_anuncios', 'archivado',
]

const PLATAFORMAS_OPTS = ['Instagram', 'Facebook', 'Tiktok', 'Pinterest', 'Youtube', 'WhatsApp', 'Exterior']
const TIPO_OPTS = ['REEL', 'POST', 'CARRUSEL', 'STORY', 'REEL FRASE', 'VIDEO REEL TIKTOK', 'VIDEO']
const OBJETIVO_OPTS = ['Normal', 'Anuncio', 'Conversión', 'Alcance', 'Engagement']

type Marca = {
  id: string
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
} | null

type Props = {
  publicacion: PublicacionRow
  marca: Marca
}

export function PublicacionDetailForm({ publicacion: initial, marca }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isDuplicating, startDuplicate] = useTransition()
  const [form, setForm] = useState({
    nombre: initial.nombre,
    estado: initial.estado,
    fecha_publicacion: initial.fecha_publicacion ?? '',
    fecha_edicion: initial.fecha_edicion ?? '',
    fecha_diseno: initial.fecha_diseno ?? '',
    plataformas: initial.plataformas ?? [],
    tipo_contenido: initial.tipo_contenido ?? [],
    objetivos: initial.objetivos ?? [],
    copy: initial.copy ?? '',
    guion: initial.guion ?? '',
    enlace_tomas: initial.enlace_tomas ?? '',
    enlace_musica: initial.enlace_musica ?? '',
    portada_cruda_url: initial.portada_cruda_url ?? '',
    portada_editada_url: initial.portada_editada_url ?? '',
    editor_nombre: initial.editor_nombre ?? '',
    notas: initial.notas ?? '',
  })

  const [checklist, setChecklist] = useState({
    copy_listo: initial.copy_listo,
    musica_lista: initial.musica_lista,
    portada_lista: initial.portada_lista,
    disenado: initial.disenado,
    editado: initial.editado,
    video_aprobado: initial.video_aprobado,
  })

  function toggleArray(key: 'plataformas' | 'tipo_contenido' | 'objetivos', value: string) {
    setForm((s) => {
      const arr = s[key]
      return {
        ...s,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  function toggleCheck(field: keyof typeof checklist) {
    const newValue = !checklist[field]
    setChecklist((s) => ({ ...s, [field]: newValue }))
    // Auto-save inmediato para checks (UX rápida)
    startTransition(async () => {
      const result = await togglePublicacionField(initial.id, field, newValue)
      if (!result.ok) {
        toast.error(`Error: ${result.error}`)
        setChecklist((s) => ({ ...s, [field]: !newValue }))  // rollback
      }
    })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePublicacion(initial.id, {
        ...form,
        fecha_publicacion: form.fecha_publicacion || null,
        fecha_edicion: form.fecha_edicion || null,
        fecha_diseno: form.fecha_diseno || null,
        copy: form.copy || null,
        guion: form.guion || null,
        enlace_tomas: form.enlace_tomas || null,
        enlace_musica: form.enlace_musica || null,
        portada_cruda_url: form.portada_cruda_url || null,
        portada_editada_url: form.portada_editada_url || null,
        editor_nombre: form.editor_nombre || null,
        notas: form.notas || null,
      })
      if (result.ok) {
        toast.success('Cambios guardados')
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${initial.nombre}"? Esta acción no se puede deshacer.`)) return
    startDelete(async () => {
      try {
        await deletePublicacion(initial.id)
        toast.success('Publicación eliminada')
      } catch (e) {
        toast.error(`Error: ${(e as Error).message}`)
      }
    })
  }

  function handleDuplicate() {
    startDuplicate(async () => {
      try {
        await duplicarPublicacion(initial.id)
        toast.success('Publicación duplicada — editá la copia')
      } catch (e) {
        toast.error(`Error: ${(e as Error).message}`)
      }
    })
  }

  const marcaColor = marca?.color_primario_hex ?? '#283B6F'

  return (
    <div className="space-y-6">
      {/* HEADER — Title + acciones */}
      <div className="flex items-start gap-4">
        <div
          className="w-2 self-stretch rounded-full"
          style={{ backgroundColor: marcaColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {marca && (
              <span className="text-3xl">{marca.emoji_marca ?? '📊'}</span>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {marca?.slug}
            </Badge>
          </div>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
            className="w-full text-3xl font-bold bg-transparent border-0 border-b border-transparent hover:border-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? 'Guardando…' : '💾 Guardar'}
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            variant="outline"
            size="sm"
          >
            {isDuplicating ? 'Duplicando…' : '📋 Duplicar'}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? 'Eliminando…' : '🗑️ Eliminar'}
          </Button>
        </div>
      </div>

      {/* PROPIEDADES — tabla compacta key-value */}
      <Card>
        <CardContent className="p-0 divide-y">
          <PropRow label="📅 Fecha publicación">
            <input
              type="date"
              value={form.fecha_publicacion}
              onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))}
              className="bg-transparent border-0 focus:outline-none w-full"
            />
          </PropRow>

          <PropRow label="🎯 Estado">
            <select
              value={form.estado}
              onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
              className="bg-transparent border-0 focus:outline-none w-full"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>
              ))}
            </select>
          </PropRow>

          <PropRow label="📱 Plataformas">
            <div className="flex flex-wrap gap-1.5">
              {PLATAFORMAS_OPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleArray('plataformas', p)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    form.plataformas.includes(p)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </PropRow>

          <PropRow label="🎬 Tipo de contenido">
            <div className="flex flex-wrap gap-1.5">
              {TIPO_OPTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleArray('tipo_contenido', t)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    form.tipo_contenido.includes(t)
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </PropRow>

          <PropRow label="🎯 Objetivos">
            <div className="flex flex-wrap gap-1.5">
              {OBJETIVO_OPTS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleArray('objetivos', o)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    form.objetivos.includes(o)
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </PropRow>

          <PropRow label="✏️ Editor">
            <input
              type="text"
              value={form.editor_nombre}
              onChange={(e) => setForm((s) => ({ ...s, editor_nombre: e.target.value }))}
              placeholder="Nombre del editor"
              className="bg-transparent border-0 focus:outline-none w-full"
            />
          </PropRow>

          <PropRow label="🎨 Fecha edición">
            <input
              type="date"
              value={form.fecha_edicion}
              onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))}
              className="bg-transparent border-0 focus:outline-none w-full"
            />
          </PropRow>

          <PropRow label="🖌️ Fecha diseño">
            <input
              type="date"
              value={form.fecha_diseno}
              onChange={(e) => setForm((s) => ({ ...s, fecha_diseno: e.target.value }))}
              className="bg-transparent border-0 focus:outline-none w-full"
            />
          </PropRow>
        </CardContent>
      </Card>

      {/* CHECKLIST de progreso */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Checklist de progreso
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ChecklistItem label="📝 Copy listo" value={checklist.copy_listo} onToggle={() => toggleCheck('copy_listo')} />
            <ChecklistItem label="🎵 Música lista" value={checklist.musica_lista} onToggle={() => toggleCheck('musica_lista')} />
            <ChecklistItem label="🖼️ Portada lista" value={checklist.portada_lista} onToggle={() => toggleCheck('portada_lista')} />
            <ChecklistItem label="🎨 Diseñado" value={checklist.disenado} onToggle={() => toggleCheck('disenado')} />
            <ChecklistItem label="✂️ Editado" value={checklist.editado} onToggle={() => toggleCheck('editado')} />
            <ChecklistItem label="✅ Video aprobado" value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
          </div>
        </CardContent>
      </Card>

      {/* ENLACES */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Recursos / Enlaces
          </h3>
          <div className="space-y-3">
            <UrlField
              label="🎬 Enlace tomas (Drive)"
              value={form.enlace_tomas}
              onChange={(v) => setForm((s) => ({ ...s, enlace_tomas: v }))}
            />
            <UrlField
              label="🎵 Enlace música"
              value={form.enlace_musica}
              onChange={(v) => setForm((s) => ({ ...s, enlace_musica: v }))}
            />
            <UrlField
              label="🖼️ Portada cruda"
              value={form.portada_cruda_url}
              onChange={(v) => setForm((s) => ({ ...s, portada_cruda_url: v }))}
            />
            <UrlField
              label="🎨 Portada editada"
              value={form.portada_editada_url}
              onChange={(v) => setForm((s) => ({ ...s, portada_editada_url: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* COPY */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Copy (texto a publicar)
          </h3>
          <textarea
            value={form.copy}
            onChange={(e) => setForm((s) => ({ ...s, copy: e.target.value }))}
            placeholder="El texto exacto que se publicará en redes…"
            rows={8}
            className="w-full p-3 rounded-md border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">{form.copy.length} caracteres</p>
        </CardContent>
      </Card>

      {/* GUIÓN / INDICACIONES */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Guión / Indicaciones de grabación
          </h3>
          <textarea
            value={form.guion}
            onChange={(e) => setForm((s) => ({ ...s, guion: e.target.value }))}
            placeholder="Gancho, escenas, tomas, voz en off…"
            rows={10}
            className="w-full p-3 rounded-md border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      {/* NOTAS internas */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Notas internas
          </h3>
          <textarea
            value={form.notas}
            onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
            placeholder="Notas privadas del equipo (no se publican)…"
            rows={3}
            className="w-full p-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      {/* META */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div>
          Creada {new Date(initial.created_at).toLocaleString('es-PE')}
          {' · '}
          Última edición {new Date(initial.updated_at).toLocaleString('es-PE')}
        </div>
        {initial.notion_url && (
          <a
            href={initial.notion_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            ↗ Ver en Notion (referencia)
          </a>
        )}
      </div>

      {/* Botón guardar flotante final */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="lg" className="shadow-lg">
          {isPending ? 'Guardando…' : '💾 Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Sub-componentes
// ============================================================

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function ChecklistItem({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 p-2.5 rounded-md border transition-colors text-left ${
        value
          ? 'bg-primary/10 border-primary/40 text-foreground'
          : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
      }`}
    >
      <span className={`inline-block w-4 h-4 rounded border flex items-center justify-center text-xs ${
        value ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
      }`}>
        {value ? '✓' : ''}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  )
}

function UrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[180px_1fr_auto] items-center gap-3">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          Abrir ↗
        </a>
      )}
    </div>
  )
}
