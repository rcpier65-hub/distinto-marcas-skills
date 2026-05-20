// app/app/publicaciones/[id]/_components/publicacion-detail-form.tsx
// Layout Metricool-style 2 zonas verticales:
//  - ZONA SUPERIOR (split): copy + preview lado a lado
//  - ZONA INFERIOR (grid): configuración completa visible — plataformas,
//    recursos, checklist, fechas, editor, notas. NO en accordion.
// Preview: portada_editada > portada_cruda > Drive folder embed (tomas crudas) > placeholder
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updatePublicacion, deletePublicacion, togglePublicacionField } from '../_actions'
import { duplicarPublicacion } from '../../_actions'
import {
  ESTADO_PUBLICACION_LABEL,
  ESTADO_TAREA_LABEL,
  type EstadoPublicacion,
  type EstadoTarea,
  type PublicacionRow,
  type EditorRow,
} from '@/lib/types/database'

const ESTADOS: EstadoPublicacion[] = [
  'tareas', 'idear', 'editando', 'editar', 'disenar',
  'enviado', 'aprobar', 'programar', 'programar_anuncios', 'archivado',
]

const ESTADOS_TAREA: EstadoTarea[] = ['sin_empezar', 'en_progreso', 'listo']

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

const EMOJI_PICKER = [
  '😀', '😊', '😍', '🥰', '😎', '🤩', '😂', '🤣', '😉', '😘',
  '👍', '👏', '🙌', '✨', '⭐', '🌟', '💯', '🔥', '💪', '🎉',
  '❤️', '💙', '💜', '🧡', '💛', '💚', '🤍', '💖', '✅', '❌',
  '🎵', '🎬', '📸', '🛍️', '💼', '📈', '💡', '🚀', '🎁', '🎯',
  '🌿', '🌱', '☀️', '🌙', '🪑', '🛋️', '💡', '🏠', '🏗️', '🪴',
]

// Helper: extrae el folder ID de un Drive URL
// Soporta: /folders/ID o ?id=ID
function extractDriveFolderId(url: string): string | null {
  if (!url) return null
  const m1 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}

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
  editores: EditorRow[]
}

export function PublicacionDetailForm({ publicacion: initial, marca, editores }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isDuplicating, startDuplicate] = useTransition()
  const [showEmoji, setShowEmoji] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<string>(
    initial.plataformas?.[0] ?? 'Instagram',
  )

  const copyTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [form, setForm] = useState({
    nombre: initial.nombre,
    estado: initial.estado,
    estado_tarea: initial.estado_tarea ?? 'sin_empezar',
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
    editor_id: initial.editor_id ?? '',
    opcion_2: initial.opcion_2 ?? '',
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

  function toggleArrayItem(key: 'plataformas' | 'tipo_contenido' | 'objetivos', value: string) {
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

  function insertAtCursor(text: string) {
    const ta = copyTextareaRef.current
    if (!ta) {
      setForm((s) => ({ ...s, copy: s.copy + text }))
      return
    }
    const start = ta.selectionStart ?? form.copy.length
    const end = ta.selectionEnd ?? form.copy.length
    const newCopy = form.copy.slice(0, start) + text + form.copy.slice(end)
    setForm((s) => ({ ...s, copy: newCopy }))
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    }, 0)
  }

  function handleAddHashtag() { insertAtCursor(' #') }
  function handleAddLink() {
    const url = prompt('URL del enlace:')
    if (url) insertAtCursor(' ' + url + ' ')
  }
  function handleAddImage() {
    const url = prompt('URL de la imagen / portada:\n(podés pegar link de Drive, Imgur, o cualquier URL pública)')
    if (!url) return
    if (form.portada_cruda_url) {
      setForm((s) => ({ ...s, portada_editada_url: url }))
      toast.success('Portada editada actualizada')
    } else {
      setForm((s) => ({ ...s, portada_cruda_url: url }))
      toast.success('Portada cruda actualizada')
    }
  }
  function handleAddAttach() {
    const url = prompt('URL de Google Drive / archivo:\n(se guarda en "Enlace tomas")')
    if (url) {
      setForm((s) => ({ ...s, enlace_tomas: url }))
      toast.success('Enlace de tomas actualizado')
    }
  }
  function handleAddMusic() {
    const url = prompt('URL de música (TikTok / Spotify):')
    if (url) {
      setForm((s) => ({ ...s, enlace_musica: url }))
      toast.success('Música agregada')
    }
  }
  function handleEmojiSelect(emoji: string) {
    insertAtCursor(emoji)
    setShowEmoji(false)
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
        editor_id: form.editor_id || null,
        opcion_2: form.opcion_2 || null,
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
      try { await deletePublicacion(initial.id) }
      catch (e) { toast.error(`Error: ${(e as Error).message}`) }
    })
  }

  function handleDuplicate() {
    startDuplicate(async () => {
      try { await duplicarPublicacion(initial.id) }
      catch (e) { toast.error(`Error: ${(e as Error).message}`) }
    })
  }

  const brandHandle = marca ? `${marca.slug.replace(/-/g, '')}sac` : 'marca'
  const COPY_MAX = 2200
  const hashtagCount = (form.copy.match(/#\w+/g) ?? []).length

  // PREVIEW LOGIC: jerarquía de qué mostrar
  const driveFolderId = extractDriveFolderId(form.enlace_tomas)
  const previewMode: 'editada' | 'cruda' | 'drive' | 'empty' =
    form.portada_editada_url ? 'editada'
    : form.portada_cruda_url ? 'cruda'
    : driveFolderId ? 'drive'
    : 'empty'

  return (
    <div className="space-y-4 pb-20">
      {/* HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: marca?.color_primario_hex ?? '#283B6F' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {marca && <span className="text-2xl">{marca.emoji_marca ?? '📊'}</span>}
            <Badge variant="outline" className="font-mono text-xs">{marca?.slug}</Badge>
            <Badge variant={form.estado === 'programar' || form.estado === 'enviado' ? 'default' : 'secondary'}>
              {ESTADO_PUBLICACION_LABEL[form.estado]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {ESTADO_TAREA_LABEL[form.estado_tarea]}
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
          <Button onClick={handleDuplicate} disabled={isDuplicating} variant="outline" size="sm">📋 Duplicar</Button>
          <Button onClick={handleDelete} disabled={isDeleting} variant="outline" size="sm" className="text-destructive hover:text-destructive">🗑️</Button>
        </div>
      </div>

      {/* ZONA SUPERIOR: editor (copy) + preview */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        {/* Editor copy */}
        <Card>
          <CardContent className="p-0">
            <div className="px-3 pt-3 relative">
              <textarea
                ref={copyTextareaRef}
                value={form.copy}
                onChange={(e) => setForm((s) => ({ ...s, copy: e.target.value }))}
                placeholder="Escribí el copy de la publicación aquí…"
                rows={16}
                maxLength={COPY_MAX}
                className="w-full p-3 rounded-md border-0 bg-background text-sm focus:outline-none resize-none"
              />

              {showEmoji && (
                <div className="absolute bottom-full left-3 mb-2 z-10 bg-background border rounded-lg shadow-lg p-2 w-[280px]">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-semibold text-muted-foreground">Insertar emoji</span>
                    <button type="button" onClick={() => setShowEmoji(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJI_PICKER.map((e) => (
                      <button key={e} type="button" onClick={() => handleEmojiSelect(e)} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-base">{e}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pb-2">
                <div className="flex items-center gap-3">
                  <span className={hashtagCount > 30 ? 'text-orange-600 font-medium' : ''}>{hashtagCount} / 30 #</span>
                  <span className={form.copy.length > COPY_MAX * 0.9 ? 'text-orange-600 font-medium' : ''}>{form.copy.length} / {COPY_MAX}</span>
                </div>
                <span className="text-[10px]">Preview: {PLATAFORMAS.find((p) => p.key === previewPlatform)?.label}</span>
              </div>
            </div>

            {/* TOOLBAR funcional con labels */}
            <div className="border-t bg-muted/20 px-2 py-2">
              <div className="flex items-end justify-start gap-1 flex-wrap">
                <ToolbarBtn label="Imagen" icon="🖼️" onClick={handleAddImage} title="Pegar URL de portada" />
                <ToolbarBtn label="Emoji" icon="😊" onClick={() => setShowEmoji((v) => !v)} title="Insertar emoji" active={showEmoji} />
                <ToolbarBtn label="Hashtag" icon="#" onClick={handleAddHashtag} title="Agregar # al copy" />
                <ToolbarBtn label="Enlace" icon="🔗" onClick={handleAddLink} title="Pegar URL en el copy" />
                <ToolbarBtn label="Tomas" icon="📎" onClick={handleAddAttach} title="Pegar URL de Drive / tomas" />
                <ToolbarBtn label="Música" icon="🎵" onClick={handleAddMusic} title="Pegar URL de música" />
                <ToolbarBtn label="IA" icon="🤖" disabled title="Asistente IA (próximo)" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: (marca?.color_primario_hex ?? '#283B6F') + '20',
                    color: marca?.color_primario_hex ?? '#283B6F',
                  }}
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
                {/* Indicador modo preview */}
                <Badge variant="outline" className="text-[9px]">
                  {previewMode === 'editada' && '✅ Editada'}
                  {previewMode === 'cruda' && '🖼️ Cruda'}
                  {previewMode === 'drive' && '📁 Tomas'}
                  {previewMode === 'empty' && '➖'}
                </Badge>
              </div>

              {/* MEDIA AREA — adaptativa según jerarquía */}
              <div className="aspect-[9/16] bg-black flex items-center justify-center relative">
                {previewMode === 'editada' || previewMode === 'cruda' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewMode === 'editada' ? form.portada_editada_url : form.portada_cruda_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : previewMode === 'drive' && driveFolderId ? (
                  <iframe
                    src={`https://drive.google.com/embeddedfolderview?id=${driveFolderId}#grid`}
                    className="w-full h-full bg-white"
                    title="Carpeta de tomas en Drive"
                  />
                ) : (
                  <div className="text-white/60 text-sm text-center px-4">
                    Imagen/vídeo no disponible
                    <div className="text-[10px] mt-1 text-white/40">
                      Pegá URL desde la toolbar 🖼️ o agregá link a Drive en 📎 Tomas
                    </div>
                  </div>
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

          {/* Link directo a Drive si está en modo "drive" */}
          {previewMode === 'drive' && form.enlace_tomas && (
            <a
              href={form.enlace_tomas}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-center text-xs text-blue-600 hover:underline"
            >
              ↗ Abrir carpeta de tomas en Drive
            </a>
          )}
        </div>
      </div>

      {/* ZONA INFERIOR — Configuración completa visible (estilo Metricool) */}
      <Card>
        <CardContent className="p-4 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            ⚙️ Configuración de la publicación
          </h2>

          {/* SECTION 1: Plataformas (los iconos ahora viven acá) */}
          <Section title="📱 Plataformas">
            <div className="flex items-center gap-2 flex-wrap">
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
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                        : 'bg-background border-border opacity-50 hover:opacity-100'
                    } ${isPreview ? 'scale-105' : ''}`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-[10px] font-medium">{p.label}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* SECTION 2: Tipo + Objetivos */}
          <div className="grid md:grid-cols-2 gap-5">
            <Section title="🎬 Tipo de contenido">
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
            </Section>

            <Section title="🎯 Objetivos">
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
            </Section>
          </div>

          {/* SECTION 3: Recursos / Enlaces */}
          <Section title="🔗 Recursos / Enlaces">
            <div className="grid md:grid-cols-2 gap-2">
              <UrlField label="🎬 Tomas (Drive)" value={form.enlace_tomas} onChange={(v) => setForm((s) => ({ ...s, enlace_tomas: v }))} />
              <UrlField label="🎵 Música" value={form.enlace_musica} onChange={(v) => setForm((s) => ({ ...s, enlace_musica: v }))} />
              <UrlField label="🖼️ Portada cruda" value={form.portada_cruda_url} onChange={(v) => setForm((s) => ({ ...s, portada_cruda_url: v }))} />
              <UrlField label="🎨 Portada editada" value={form.portada_editada_url} onChange={(v) => setForm((s) => ({ ...s, portada_editada_url: v }))} />
            </div>
          </Section>

          {/* SECTION 4: Checklist + Editor + Sub-estado */}
          <div className="grid md:grid-cols-3 gap-5">
            <Section title="✓ Checklist (auto-guarda)" className="md:col-span-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <ChecklistItem label="📝 Copy listo" value={checklist.copy_listo} onToggle={() => toggleCheck('copy_listo')} />
                <ChecklistItem label="🎵 Música" value={checklist.musica_lista} onToggle={() => toggleCheck('musica_lista')} />
                <ChecklistItem label="🖼️ Portada" value={checklist.portada_lista} onToggle={() => toggleCheck('portada_lista')} />
                <ChecklistItem label="🎨 Diseñado" value={checklist.disenado} onToggle={() => toggleCheck('disenado')} />
                <ChecklistItem label="✂️ Editado" value={checklist.editado} onToggle={() => toggleCheck('editado')} />
                <ChecklistItem label="✅ Aprobado" value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
              </div>
            </Section>

            <Section title="👤 Asignación">
              <div className="space-y-2">
                <label className="block text-xs">
                  <span className="text-muted-foreground">Editor</span>
                  <select
                    value={form.editor_id}
                    onChange={(e) => setForm((s) => ({ ...s, editor_id: e.target.value }))}
                    className="w-full h-9 px-2 rounded border border-input bg-background mt-1"
                  >
                    <option value="">— Sin asignar —</option>
                    {editores.map((ed) => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                  </select>
                </label>
                <div className="block text-xs">
                  <span className="text-muted-foreground block mb-1">Sub-estado</span>
                  <div className="flex gap-1">
                    {ESTADOS_TAREA.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, estado_tarea: e }))}
                        className={`flex-1 h-7 px-1 rounded text-[10px] border transition-colors ${
                          form.estado_tarea === e
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {ESTADO_TAREA_LABEL[e]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* SECTION 5: Fechas */}
          <Section title="📅 Fechas">
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-xs">
                <span className="text-muted-foreground">Publicación</span>
                <input type="date" value={form.fecha_publicacion} onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">Edición</span>
                <input type="date" value={form.fecha_edicion} onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">Diseño</span>
                <input type="date" value={form.fecha_diseno} onChange={(e) => setForm((s) => ({ ...s, fecha_diseno: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
            </div>
          </Section>

          {/* SECTION 6: Estado workflow */}
          <Section title="🎯 Estado del workflow">
            <select
              value={form.estado}
              onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
              className="w-full h-9 px-3 rounded border border-input bg-background text-sm"
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>)}
            </select>
          </Section>

          {/* SECTION 7: Guión + Opción 2 + Notas */}
          <div className="grid md:grid-cols-3 gap-5">
            <Section title="🎬 Guión / Indicaciones">
              <textarea
                value={form.guion}
                onChange={(e) => setForm((s) => ({ ...s, guion: e.target.value }))}
                rows={5}
                placeholder="Gancho, escenas, tomas, voz en off…"
                className="w-full p-2 rounded-md border bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Section>
            <Section title="🧐 Opción 2 (variante)">
              <textarea
                value={form.opcion_2}
                onChange={(e) => setForm((s) => ({ ...s, opcion_2: e.target.value }))}
                rows={5}
                placeholder="Versión B del copy o guión alternativo…"
                className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Section>
            <Section title="📝 Notas internas">
              <textarea
                value={form.notas}
                onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                rows={5}
                placeholder="Notas privadas del equipo (no se publican)…"
                className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Section>
          </div>
        </CardContent>
      </Card>

      {/* META footer */}
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
      <div className="fixed bottom-0 left-0 right-0 px-6 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-end gap-2 z-30">
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

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  )
}

function ToolbarBtn({
  icon, label, title, onClick, disabled, active,
}: {
  icon: string
  label: string
  title: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-md transition-colors ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
            ? 'bg-primary/15 text-primary'
            : 'hover:bg-muted'
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
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
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="flex-1 h-8 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {value && (
          <a href={value} target="_blank" rel="noopener noreferrer" className="h-8 px-2 rounded-md border bg-background text-xs text-blue-600 hover:bg-muted flex items-center">
            ↗
          </a>
        )}
      </div>
    </div>
  )
}
