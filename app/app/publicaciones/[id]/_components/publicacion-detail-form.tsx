// app/app/publicaciones/[id]/_components/publicacion-detail-form.tsx
// Layout split-view estilo Metricool/Buffer:
//  - Izquierda (60%): editor de copy con tabs de plataformas + propiedades inline
//  - Derecha (40%): preview tipo Instagram con la portada y el copy
//  - Bottom: save bar sticky
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

const PLATAFORMAS = [
  { key: 'Instagram', icon: '📷', label: 'Instagram' },
  { key: 'Facebook', icon: '👤', label: 'Facebook' },
  { key: 'Tiktok', icon: '🎵', label: 'TikTok' },
  { key: 'Youtube', icon: '▶️', label: 'YouTube' },
  { key: 'Pinterest', icon: '📌', label: 'Pinterest' },
  { key: 'WhatsApp', icon: '💬', label: 'WhatsApp' },
  { key: 'Exterior', icon: '🌐', label: 'Exterior' },
]

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
  const [showMore, setShowMore] = useState(false)

  // Plataforma activa para el preview (default: primera del array, o Instagram)
  const [previewPlatform, setPreviewPlatform] = useState<string>(
    initial.plataformas?.[0] ?? 'Instagram',
  )

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

  function toggleArrayItem(
    key: 'plataformas' | 'tipo_contenido' | 'objetivos',
    value: string,
  ) {
    setForm((s) => {
      const arr = s[key]
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...s, [key]: next }
    })
  }

  function toggleCheck(field: keyof typeof checklist) {
    const newValue = !checklist[field]
    setChecklist((s) => ({ ...s, [field]: newValue }))
    startTransition(async () => {
      const result = await togglePublicacionField(initial.id, field, newValue)
      if (!result.ok) {
        toast.error(`Error: ${result.error}`)
        setChecklist((s) => ({ ...s, [field]: !newValue }))
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
        toast.success('Cambios guardados ✓')
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
      } catch (e) {
        toast.error(`Error: ${(e as Error).message}`)
      }
    })
  }

  function handleDuplicate() {
    startDuplicate(async () => {
      try {
        await duplicarPublicacion(initial.id)
      } catch (e) {
        toast.error(`Error: ${(e as Error).message}`)
      }
    })
  }

  // Imagen del preview: editada > cruda > placeholder
  const previewImageUrl = form.portada_editada_url || form.portada_cruda_url || null
  // Brand handle estimado (basado en slug — el cliente puede ajustarlo en futuro)
  const brandHandle = marca ? `${marca.slug.replace(/-/g, '')}sac` : 'marca'
  const COPY_MAX = 2200  // límite Instagram
  const hashtagCount = (form.copy.match(/#\w+/g) ?? []).length

  return (
    <div className="space-y-4">
      {/* HEADER ─ title + acciones */}
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded-full bg-primary" style={{ backgroundColor: marca?.color_primario_hex ?? undefined }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {marca && <span className="text-2xl">{marca.emoji_marca ?? '📊'}</span>}
            <Badge variant="outline" className="font-mono text-xs">{marca?.slug}</Badge>
            <Badge variant={form.estado === 'programar' || form.estado === 'enviado' ? 'default' : 'secondary'}>
              {ESTADO_PUBLICACION_LABEL[form.estado]}
            </Badge>
          </div>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Nombre de la publicación…"
            className="w-full text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-muted focus:border-primary focus:outline-none transition-colors py-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleDuplicate} disabled={isDuplicating} variant="outline" size="sm">
            📋 Duplicar
          </Button>
          <Button onClick={handleDelete} disabled={isDeleting} variant="outline" size="sm" className="text-destructive hover:text-destructive">
            🗑️
          </Button>
        </div>
      </div>

      {/* SPLIT VIEW: editor | preview */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* LEFT — Editor */}
        <Card>
          <CardContent className="p-0">
            {/* Tabs de plataformas */}
            <div className="flex items-center gap-1 px-3 pt-3 border-b">
              {PLATAFORMAS.map((p) => {
                const isSelected = form.plataformas.includes(p.key)
                const isPreview = previewPlatform === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      toggleArrayItem('plataformas', p.key)
                      if (!isSelected) setPreviewPlatform(p.key)
                    }}
                    onDoubleClick={() => setPreviewPlatform(p.key)}
                    title={`${p.label} — click: agregar/quitar · doble-click: previsualizar`}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                      isSelected
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-muted/40 opacity-50 hover:opacity-80'
                    } ${isPreview ? 'scale-110' : ''}`}
                  >
                    {p.icon}
                  </button>
                )
              })}
              <div className="flex-1" />
              {/* Selector tipo (compact) */}
              <select
                value={form.tipo_contenido[0] ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((s) => ({ ...s, tipo_contenido: v ? [v] : [] }))
                }}
                className="h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="">Tipo…</option>
                {TIPO_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* COPY textarea grande */}
            <div className="p-3">
              <textarea
                value={form.copy}
                onChange={(e) => setForm((s) => ({ ...s, copy: e.target.value }))}
                placeholder="Escribí el copy de la publicación aquí…"
                rows={14}
                maxLength={COPY_MAX}
                className="w-full p-3 rounded-md border-0 bg-background text-sm focus:outline-none resize-none font-mono"
              />
              {/* Contadores */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-3 pb-1">
                <div className="flex items-center gap-3">
                  <span>{hashtagCount} / 30 #</span>
                  <span className={form.copy.length > COPY_MAX * 0.9 ? 'text-orange-600 font-medium' : ''}>
                    {form.copy.length} / {COPY_MAX}
                  </span>
                </div>
                <span className="text-[10px]">{PLATAFORMAS.find((p) => p.key === previewPlatform)?.label} preview</span>
              </div>
            </div>

            {/* Toolbar inferior con iconos */}
            <div className="flex items-center gap-1 px-3 py-2 border-t bg-muted/30">
              <ToolbarBtn title="Subir imagen / portada (próximo)" disabled>🖼️</ToolbarBtn>
              <ToolbarBtn title="Insertar emoji (próximo)" disabled>😊</ToolbarBtn>
              <ToolbarBtn
                title="Agregar hashtag"
                onClick={() => setForm((s) => ({ ...s, copy: s.copy + ' #' }))}
              >#</ToolbarBtn>
              <ToolbarBtn
                title="Insertar enlace"
                onClick={() => {
                  const url = prompt('URL del enlace:')
                  if (url) setForm((s) => ({ ...s, copy: s.copy + ' ' + url }))
                }}
              >🔗</ToolbarBtn>
              <ToolbarBtn title="Asistente IA (próximo)" disabled>🤖</ToolbarBtn>
              <ToolbarBtn title="Adjuntar guión / archivo (próximo)" disabled>📎</ToolbarBtn>
              <div className="flex-1" />
              <input
                type="text"
                value={form.editor_nombre}
                onChange={(e) => setForm((s) => ({ ...s, editor_nombre: e.target.value }))}
                placeholder="Editor (nombre)…"
                className="h-8 px-2 rounded-md border border-input bg-background text-xs w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Preview sticky */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header tipo Instagram */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: (marca?.color_primario_hex ?? '#283B6F') + '20', color: marca?.color_primario_hex ?? '#283B6F' }}
                >
                  {marca?.emoji_marca ?? '📊'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{brandHandle}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {form.fecha_publicacion
                      ? new Date(form.fecha_publicacion + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
                      : 'Sin fecha'}
                    {' · '}{PLATAFORMAS.find((p) => p.key === previewPlatform)?.label}
                  </div>
                </div>
              </div>
              {/* Media area */}
              <div className="aspect-[9/16] bg-black flex items-center justify-center relative">
                {previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="text-white/60 text-sm">Imagen/vídeo no disponible</div>
                )}
              </div>
              {/* Caption preview */}
              {form.copy && (
                <div className="p-3 text-xs whitespace-pre-wrap line-clamp-6">
                  <span className="font-semibold">{brandHandle}</span> {form.copy}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini panel "estado" */}
          <Card className="mt-3">
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="block">
                  <span className="text-muted-foreground">Fecha</span>
                  <input
                    type="date"
                    value={form.fecha_publicacion}
                    onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))}
                    className="w-full h-8 px-2 rounded border border-input bg-background mt-0.5"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground">Estado</span>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
                    className="w-full h-8 px-2 rounded border border-input bg-background mt-0.5"
                  >
                    {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>)}
                  </select>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MORE PROPERTIES — colapsable */}
      <Card>
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-sm font-medium"
          >
            <span>⚙️ Más propiedades (objetivos, guión, enlaces, checklist…)</span>
            <span className="text-xs text-muted-foreground">{showMore ? '▲ Ocultar' : '▼ Mostrar'}</span>
          </button>

          {showMore && (
            <div className="p-4 border-t space-y-4">
              {/* Objetivos */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Objetivos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {OBJETIVO_OPTS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleArrayItem('objetivos', o)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.objetivos.includes(o)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Múltiples tipos de contenido (multi-select) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Tipos de contenido (multi)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIPO_OPTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleArrayItem('tipo_contenido', t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.tipo_contenido.includes(t)
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enlaces */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Enlaces / Recursos
                </label>
                <UrlField label="🎬 Tomas (Drive)" value={form.enlace_tomas} onChange={(v) => setForm((s) => ({ ...s, enlace_tomas: v }))} />
                <UrlField label="🎵 Música" value={form.enlace_musica} onChange={(v) => setForm((s) => ({ ...s, enlace_musica: v }))} />
                <UrlField label="🖼️ Portada cruda" value={form.portada_cruda_url} onChange={(v) => setForm((s) => ({ ...s, portada_cruda_url: v }))} />
                <UrlField label="🎨 Portada editada" value={form.portada_editada_url} onChange={(v) => setForm((s) => ({ ...s, portada_editada_url: v }))} />
              </div>

              {/* Fechas auxiliares */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs">
                  <span className="text-muted-foreground">Fecha edición</span>
                  <input type="date" value={form.fecha_edicion} onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Fecha diseño</span>
                  <input type="date" value={form.fecha_diseno} onChange={(e) => setForm((s) => ({ ...s, fecha_diseno: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
                </label>
              </div>

              {/* Guión */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Guión / Indicaciones de grabación
                </label>
                <textarea
                  value={form.guion}
                  onChange={(e) => setForm((s) => ({ ...s, guion: e.target.value }))}
                  rows={6}
                  placeholder="Gancho, escenas, tomas, voz en off…"
                  className="w-full p-3 rounded-md border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Checklist */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Checklist de progreso (auto-guarda)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <ChecklistItem label="📝 Copy listo" value={checklist.copy_listo} onToggle={() => toggleCheck('copy_listo')} />
                  <ChecklistItem label="🎵 Música" value={checklist.musica_lista} onToggle={() => toggleCheck('musica_lista')} />
                  <ChecklistItem label="🖼️ Portada" value={checklist.portada_lista} onToggle={() => toggleCheck('portada_lista')} />
                  <ChecklistItem label="🎨 Diseñado" value={checklist.disenado} onToggle={() => toggleCheck('disenado')} />
                  <ChecklistItem label="✂️ Editado" value={checklist.editado} onToggle={() => toggleCheck('editado')} />
                  <ChecklistItem label="✅ Aprobado" value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Notas internas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                  rows={3}
                  placeholder="Notas privadas del equipo (no se publican)…"
                  className="w-full p-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* META */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Creada {new Date(initial.created_at).toLocaleString('es-PE')}
          {' · '}
          Editada {new Date(initial.updated_at).toLocaleString('es-PE')}
        </div>
        {initial.notion_url && (
          <a href={initial.notion_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            ↗ Notion (ref)
          </a>
        )}
      </div>

      {/* STICKY save bar */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push('/publicaciones')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isPending} size="lg">
          {isPending ? 'Guardando…' : '💾 Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Sub-componentes
// ============================================================

function ToolbarBtn({
  children, title, onClick, disabled,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-8 h-8 rounded-md flex items-center justify-center text-base hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function ChecklistItem({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors text-left ${
        value
          ? 'bg-primary/10 border-primary/40 text-foreground'
          : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
      }`}
    >
      <span className={`inline-block w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
        value ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
      }`}>
        {value ? '✓' : ''}
      </span>
      <span className="text-xs">{label}</span>
    </button>
  )
}

function UrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        className="h-8 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
          Abrir ↗
        </a>
      )}
    </div>
  )
}
