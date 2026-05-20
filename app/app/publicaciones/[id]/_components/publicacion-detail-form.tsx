// app/app/publicaciones/[id]/_components/publicacion-detail-form.tsx
// Layout estilo Metricool refinado:
//  - HEADER: marca + badges + título + tabs de plataformas debajo del título
//  - SPLIT: copy + preview
//  - TOOLBAR: cada icono abre popover hacia arriba (tipo, objetivos, música, tomas, etc.)
//  - ZONA INFERIOR: checklist a la izquierda bonito + resto a la derecha
'use client'

import { useState, useTransition, useRef, useEffect, useLayoutEffect } from 'react'
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

// Tipos de popover (solo uno abierto a la vez)
type PopoverKey = 'tipo' | 'objetivos' | 'portada' | 'musica' | 'tomas' | 'emoji' | null

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
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null)
  const [previewPlatform, setPreviewPlatform] = useState<string>(
    initial.plataformas?.[0] ?? 'Instagram',
  )

  const copyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Cierra popover al click fuera
  useEffect(() => {
    if (!openPopover) return
    function onClick(e: MouseEvent) {
      if (!toolbarRef.current?.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [openPopover])

  // Auto-resize del textarea: crece con el contenido (no rows fijo)
  function autoResizeTextarea() {
    const ta = copyTextareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(Math.max(ta.scrollHeight, 180), 600) + 'px'
  }

  // Resize inicial al montar (para pubs con copy largo precargado)
  useLayoutEffect(() => {
    autoResizeTextarea()
  }, [])

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

  // Preview adaptativo
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
            <Badge variant="outline" className="text-xs">{ESTADO_TAREA_LABEL[form.estado_tarea]}</Badge>
          </div>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Nombre de la publicación…"
            className="w-full text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-muted focus:border-primary focus:outline-none transition-colors py-1 mb-3"
          />

          {/* Tabs plataformas debajo del título (estilo Metricool) */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
                  title={`${p.label} — click: activar/desactivar · doble-click: previsualizar`}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-background border-border text-muted-foreground opacity-60 hover:opacity-100'
                  } ${isPreview && isSelected ? 'ring-2 ring-primary/40' : ''}`}
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleDuplicate} disabled={isDuplicating} variant="outline" size="sm">📋 Duplicar</Button>
          <Button onClick={handleDelete} disabled={isDeleting} variant="outline" size="sm" className="text-destructive hover:text-destructive">🗑️</Button>
        </div>
      </div>

      {/* SPLIT — copy + preview */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        <Card>
          <CardContent className="p-0">
            {/* Copy textarea con auto-resize */}
            <div className="px-3 pt-3">
              <textarea
                ref={copyTextareaRef}
                value={form.copy}
                onChange={(e) => {
                  setForm((s) => ({ ...s, copy: e.target.value }))
                  autoResizeTextarea()
                }}
                placeholder="Escribí el copy de la publicación aquí…"
                maxLength={COPY_MAX}
                style={{ minHeight: '180px', maxHeight: '600px' }}
                className="w-full p-3 rounded-md border-0 bg-background text-sm focus:outline-none resize-none overflow-y-auto"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pb-2">
                <div className="flex items-center gap-3">
                  <span className={hashtagCount > 30 ? 'text-orange-600 font-medium' : ''}>{hashtagCount} / 30 #</span>
                  <span className={form.copy.length > COPY_MAX * 0.9 ? 'text-orange-600 font-medium' : ''}>{form.copy.length} / {COPY_MAX}</span>
                </div>
                <span className="text-[10px]">Preview: {PLATAFORMAS.find((p) => p.key === previewPlatform)?.label}</span>
              </div>
            </div>

            {/* TOOLBAR con popovers expandibles */}
            <div ref={toolbarRef} className="border-t bg-muted/20 px-2 py-2 relative">
              <div className="flex items-end justify-start gap-1 flex-wrap">
                {/* Tipo de contenido */}
                <ToolbarBtnPopover
                  icon="🎬"
                  label="Tipo"
                  title="Tipo de contenido"
                  active={openPopover === 'tipo'}
                  onClick={() => setOpenPopover(openPopover === 'tipo' ? null : 'tipo')}
                  badge={form.tipo_contenido[0]}
                >
                  <div className="font-semibold text-xs mb-2 text-muted-foreground">Tipo de contenido</div>
                  <div className="flex flex-wrap gap-1.5 max-w-[280px]">
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
                      >{t}</button>
                    ))}
                  </div>
                </ToolbarBtnPopover>

                {/* Objetivos */}
                <ToolbarBtnPopover
                  icon="🎯"
                  label="Objetivo"
                  title="Objetivos de la publicación"
                  active={openPopover === 'objetivos'}
                  onClick={() => setOpenPopover(openPopover === 'objetivos' ? null : 'objetivos')}
                  badge={form.objetivos[0]}
                >
                  <div className="font-semibold text-xs mb-2 text-muted-foreground">Objetivos</div>
                  <div className="flex flex-wrap gap-1.5 max-w-[260px]">
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
                      >{o}</button>
                    ))}
                  </div>
                </ToolbarBtnPopover>

                {/* Portada (imagen) */}
                <ToolbarBtnPopover
                  icon="🖼️"
                  label="Portada"
                  title="Portada cruda y editada"
                  active={openPopover === 'portada'}
                  onClick={() => setOpenPopover(openPopover === 'portada' ? null : 'portada')}
                  badge={form.portada_editada_url ? '✓' : form.portada_cruda_url ? '~' : undefined}
                >
                  <div className="space-y-2 w-[280px]">
                    <div className="font-semibold text-xs text-muted-foreground">Portada</div>
                    <label className="block text-xs">
                      <span className="text-muted-foreground">🖼️ Cruda (sin editar)</span>
                      <input
                        type="url"
                        value={form.portada_cruda_url}
                        onChange={(e) => setForm((s) => ({ ...s, portada_cruda_url: e.target.value }))}
                        placeholder="https://drive.google.com/…"
                        className="w-full h-8 px-2 rounded border bg-background text-xs mt-1"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="text-muted-foreground">🎨 Editada (final)</span>
                      <input
                        type="url"
                        value={form.portada_editada_url}
                        onChange={(e) => setForm((s) => ({ ...s, portada_editada_url: e.target.value }))}
                        placeholder="https://drive.google.com/…"
                        className="w-full h-8 px-2 rounded border bg-background text-xs mt-1"
                      />
                    </label>
                  </div>
                </ToolbarBtnPopover>

                {/* Música */}
                <ToolbarBtnPopover
                  icon="🎵"
                  label="Música"
                  title="Enlace de música"
                  active={openPopover === 'musica'}
                  onClick={() => setOpenPopover(openPopover === 'musica' ? null : 'musica')}
                  badge={form.enlace_musica ? '✓' : undefined}
                >
                  <div className="space-y-2 w-[280px]">
                    <div className="font-semibold text-xs text-muted-foreground">Música</div>
                    <input
                      type="url"
                      value={form.enlace_musica}
                      onChange={(e) => setForm((s) => ({ ...s, enlace_musica: e.target.value }))}
                      placeholder="https://vt.tiktok.com/… o Spotify"
                      className="w-full h-9 px-2 rounded border bg-background text-xs"
                      autoFocus
                    />
                    {form.enlace_musica && (
                      <a href={form.enlace_musica} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        ↗ Abrir música
                      </a>
                    )}
                  </div>
                </ToolbarBtnPopover>

                {/* Tomas */}
                <ToolbarBtnPopover
                  icon="📎"
                  label="Tomas"
                  title="Enlace de tomas (Drive)"
                  active={openPopover === 'tomas'}
                  onClick={() => setOpenPopover(openPopover === 'tomas' ? null : 'tomas')}
                  badge={form.enlace_tomas ? '✓' : undefined}
                >
                  <div className="space-y-2 w-[280px]">
                    <div className="font-semibold text-xs text-muted-foreground">Carpeta de tomas</div>
                    <input
                      type="url"
                      value={form.enlace_tomas}
                      onChange={(e) => setForm((s) => ({ ...s, enlace_tomas: e.target.value }))}
                      placeholder="https://drive.google.com/drive/folders/…"
                      className="w-full h-9 px-2 rounded border bg-background text-xs"
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Si compartís el folder como público, vas a ver las tomas en el preview →
                    </p>
                    {form.enlace_tomas && (
                      <a href={form.enlace_tomas} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        ↗ Abrir carpeta
                      </a>
                    )}
                  </div>
                </ToolbarBtnPopover>

                {/* Hashtag */}
                <ToolbarBtn
                  icon="#"
                  label="Hashtag"
                  title="Agregar # en el copy"
                  onClick={() => insertAtCursor(' #')}
                />

                {/* Enlace */}
                <ToolbarBtn
                  icon="🔗"
                  label="Enlace"
                  title="Pegar URL en el copy"
                  onClick={() => {
                    const url = prompt('URL del enlace:')
                    if (url) insertAtCursor(' ' + url + ' ')
                  }}
                />

                {/* Emoji */}
                <ToolbarBtnPopover
                  icon="😊"
                  label="Emoji"
                  title="Insertar emoji en el copy"
                  active={openPopover === 'emoji'}
                  onClick={() => setOpenPopover(openPopover === 'emoji' ? null : 'emoji')}
                >
                  <div className="w-[280px]">
                    <div className="font-semibold text-xs mb-2 text-muted-foreground">Insertar emoji</div>
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJI_PICKER.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            insertAtCursor(e)
                            setOpenPopover(null)
                          }}
                          className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-base"
                        >{e}</button>
                      ))}
                    </div>
                  </div>
                </ToolbarBtnPopover>

                {/* IA */}
                <ToolbarBtn icon="🤖" label="IA" title="Asistente IA (próximo)" disabled />
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
                <Badge variant="outline" className="text-[9px]">
                  {previewMode === 'editada' && '✅ Editada'}
                  {previewMode === 'cruda' && '🖼️ Cruda'}
                  {previewMode === 'drive' && '📁 Tomas'}
                  {previewMode === 'empty' && '➖'}
                </Badge>
              </div>
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
                      Pegá URL en 🖼️ Portada o 📎 Tomas
                    </div>
                  </div>
                )}
              </div>
              {form.copy && (
                <div className="p-3 text-xs whitespace-pre-wrap line-clamp-6">
                  <span className="font-semibold">{brandHandle}</span> {form.copy}
                </div>
              )}
            </CardContent>
          </Card>
          {previewMode === 'drive' && form.enlace_tomas && (
            <a href={form.enlace_tomas} target="_blank" rel="noopener noreferrer" className="block mt-2 text-center text-xs text-blue-600 hover:underline">
              ↗ Abrir carpeta de tomas en Drive
            </a>
          )}
        </div>
      </div>

      {/* ZONA INFERIOR — checklist a la izquierda, resto a la derecha */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* IZQUIERDA: Checklist + Asignación */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                ✓ Progreso del workflow
              </h3>
              <div className="space-y-1.5">
                <ChecklistRow label="Copy listo" icon="📝" value={checklist.copy_listo} onToggle={() => toggleCheck('copy_listo')} />
                <ChecklistRow label="Música" icon="🎵" value={checklist.musica_lista} onToggle={() => toggleCheck('musica_lista')} />
                <ChecklistRow label="Portada lista" icon="🖼️" value={checklist.portada_lista} onToggle={() => toggleCheck('portada_lista')} />
                <ChecklistRow label="Diseñado" icon="🎨" value={checklist.disenado} onToggle={() => toggleCheck('disenado')} />
                <ChecklistRow label="Editado" icon="✂️" value={checklist.editado} onToggle={() => toggleCheck('editado')} />
                <ChecklistRow label="Aprobado" icon="✅" value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                👤 Asignación
              </h3>
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
                    >{ESTADO_TAREA_LABEL[e]}</button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DERECHA: Estado workflow + fechas + textareas */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 grid md:grid-cols-2 gap-4">
              <label className="block text-xs">
                <span className="text-muted-foreground">🎯 Estado workflow</span>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
                  className="w-full h-9 px-2 rounded border border-input bg-background mt-1"
                >
                  {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>)}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">📅 Fecha publicación</span>
                <input type="date" value={form.fecha_publicacion} onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">✂️ Fecha edición</span>
                <input type="date" value={form.fecha_edicion} onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">🎨 Fecha diseño</span>
                <input type="date" value={form.fecha_diseno} onChange={(e) => setForm((s) => ({ ...s, fecha_diseno: e.target.value }))} className="w-full h-9 px-2 rounded border border-input bg-background mt-1" />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                  🎬 Guión / Indicaciones
                </label>
                <textarea
                  value={form.guion}
                  onChange={(e) => setForm((s) => ({ ...s, guion: e.target.value }))}
                  rows={4}
                  placeholder="Gancho, escenas, tomas, voz en off…"
                  className="w-full p-2 rounded-md border bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                    🧐 Opción 2
                  </label>
                  <textarea
                    value={form.opcion_2}
                    onChange={(e) => setForm((s) => ({ ...s, opcion_2: e.target.value }))}
                    rows={3}
                    placeholder="Versión B del copy o guión alternativo…"
                    className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                    📝 Notas internas
                  </label>
                  <textarea
                    value={form.notas}
                    onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                    rows={3}
                    placeholder="Notas privadas del equipo…"
                    className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

function ToolbarBtnPopover({
  icon, label, title, onClick, active, children, badge,
}: {
  icon: string
  label: string
  title: string
  onClick?: () => void
  active?: boolean
  children: React.ReactNode
  badge?: string
}) {
  return (
    <div className="relative">
      {active && (
        <div
          className="absolute bottom-full left-0 mb-2 z-20 bg-background border rounded-lg shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {children}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-md transition-colors ${
          active ? 'bg-primary/15 text-primary' : 'hover:bg-muted'
        }`}
      >
        <span className="text-lg leading-none">{icon}</span>
        <span className="text-[10px] font-medium leading-none">{label}</span>
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
            {badge.length > 4 ? badge.slice(0, 3) + '…' : badge}
          </span>
        )}
      </button>
    </div>
  )
}

function ChecklistRow({ label, icon, value, onToggle }: { label: string; icon: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-2 rounded-md border transition-colors text-left ${
        value
          ? 'bg-primary/10 border-primary/40'
          : 'bg-background border-border hover:bg-muted/50'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[11px] ${
        value ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
      }`}>
        {value ? '✓' : ''}
      </span>
      <span className="text-base">{icon}</span>
      <span className={`text-sm flex-1 ${value ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </button>
  )
}
