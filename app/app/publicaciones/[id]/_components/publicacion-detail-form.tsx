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
import {
  Globe, MessageCircle, Pin,
  Target, ImageIcon, Music2, FolderOpen, Smile, Film,
  CalendarDays, Scissors, User as UserIcon, Palette, FileText, CheckCircle2,
  Copy as CopyIcon, Trash2, Lightbulb, StickyNote, Sparkles,
  Download, Video as VideoIcon,
} from 'lucide-react'
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

/**
 * Iconos de redes sociales — SVG inline porque lucide-react los deprecó
 * por temas de marca/copyright. Usamos `fill="currentColor"` para que
 * hereden el color del parent (paleta Distinto) y matchee con los demás
 * iconos lucide.
 */
function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}
function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}
function YoutubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  )
}
function TikTokIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09z"/>
    </svg>
  )
}

// Plataformas con iconos custom/lucide + color de marca social
// (solo aparece en hover/active para mantener look limpio en idle)
const PLATAFORMAS = [
  { key: 'Instagram', Icon: InstagramIcon, label: 'Instagram', brand: '#E1306C' },
  { key: 'Facebook',  Icon: FacebookIcon,  label: 'Facebook',  brand: '#1877F2' },
  { key: 'Tiktok',    Icon: TikTokIcon,    label: 'TikTok',    brand: '#000000' },
  { key: 'Youtube',   Icon: YoutubeIcon,   label: 'YouTube',   brand: '#FF0000' },
  { key: 'Pinterest', Icon: Pin,           label: 'Pinterest', brand: '#E60023' },
  { key: 'WhatsApp',  Icon: MessageCircle, label: 'WhatsApp',  brand: '#25D366' },
  { key: 'Exterior',  Icon: Globe,         label: 'Exterior',  brand: '#6B7280' },
] as const

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
type PopoverKey = 'tipo' | 'objetivos' | 'portada' | 'musica' | 'tomas' | 'emoji' | 'videos' | null

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
    video_sin_musica_url: initial.video_sin_musica_url ?? '',  // Migration 025
    video_con_musica_url: initial.video_con_musica_url ?? '',  // Migration 025
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
        video_sin_musica_url: form.video_sin_musica_url || null,  // Migration 025
        video_con_musica_url: form.video_con_musica_url || null,  // Migration 025
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

          {/* Tabs grandes de plataformas — estilo Notion/marca Distinto.
              Pills más sólidos con icono lucide + label. Color de marca social
              solo en hover/active para mantener look limpio en estado idle. */}
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
                  title={`${p.label} — click: activar/desactivar · doble-click: previsualizar`}
                  className={`group flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all border ${
                    isSelected
                      ? 'bg-foreground/5 border-foreground/15 text-foreground shadow-sm'
                      : 'bg-background border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${isPreview && isSelected ? 'ring-2 ring-[#ba41f7]/30' : ''}`}
                  style={isSelected ? { borderColor: `${p.brand}33` } : undefined}
                >
                  <p.Icon
                    className="w-4 h-4 transition-colors"
                    style={{ color: isSelected ? p.brand : undefined }}
                  />
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleDuplicate} disabled={isDuplicating} variant="outline" size="sm" className="gap-1.5">
            <CopyIcon className="w-3.5 h-3.5" /> Duplicar
          </Button>
          <Button onClick={handleDelete} disabled={isDeleting} variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* SPLIT — columna izquierda (todo: copy + props + workflow +
          guion + opción 2 + notas + guion técnico) + columna derecha (preview sticky).
          items-start hace que cada columna tenga su altura natural y
          el preview puede ser sticky mientras vos scrolleás en la izquierda. */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4 items-start">
        {/* Wrapper de la columna izquierda — apila todas las secciones */}
        <div className="space-y-3 min-w-0">
        <Card>
          <CardContent className="p-0 flex flex-col">
            {/* Header de sección "1. COPY" + botón copiar al portapapeles.
                Pedro publica manualmente y quiere copiar con 1 click el
                texto del copy para pegarlo en Instagram/Facebook. */}
            <div className="px-4 pt-3 pb-2 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ba41f7]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  1. Copy
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!form.copy) return
                  try {
                    await navigator.clipboard.writeText(form.copy)
                    toast.success('Copy copiado al portapapeles 📋')
                  } catch {
                    toast.error('No se pudo copiar — copiá manualmente')
                  }
                }}
                disabled={!form.copy}
                title="Copiar copy al portapapeles"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[10px] font-medium border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CopyIcon className="w-3 h-3" />
                Copiar
              </button>
            </div>
            {/* Copy textarea — altura modesta porque copy suele ser corto.
                Crece hasta ~280px con su propio contenido, no se estira
                al alto del preview (eso causaba hueco gigante). */}
            <div className="px-3 pt-3 flex flex-col">
              <textarea
                ref={copyTextareaRef}
                value={form.copy}
                onChange={(e) => {
                  setForm((s) => ({ ...s, copy: e.target.value }))
                  autoResizeTextarea()
                }}
                placeholder="Escribí el copy de la publicación aquí…"
                maxLength={COPY_MAX}
                style={{ minHeight: '110px', maxHeight: '280px' }}
                className="w-full p-3 rounded-md border-0 bg-background text-sm focus:outline-none resize-none overflow-y-auto"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground px-2 py-2 border-t mt-2">
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
                  icon={<Film className="w-5 h-5" />}
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
                  icon={<Target className="w-5 h-5" />}
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
                  icon={<ImageIcon className="w-5 h-5" />}
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
                  icon={<Music2 className="w-5 h-5" />}
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

                {/* Videos editados — 2 versiones (sin música + con música).
                    El editor pega ambos URLs Drive acá. Pedro descarga
                    desde los botones grandes bajo el preview. */}
                <ToolbarBtnPopover
                  icon={<VideoIcon className="w-5 h-5" />}
                  label="Videos"
                  title="Versiones del video editado (con/sin música)"
                  active={openPopover === 'videos'}
                  onClick={() => setOpenPopover(openPopover === 'videos' ? null : 'videos')}
                  badge={
                    form.video_sin_musica_url && form.video_con_musica_url ? '2'
                    : form.video_sin_musica_url || form.video_con_musica_url ? '1'
                    : undefined
                  }
                >
                  <div className="space-y-3 w-[320px]">
                    <div className="font-semibold text-xs text-muted-foreground">Videos editados (Drive)</div>
                    <label className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <VideoIcon className="w-3 h-3" /> Sin música
                      </span>
                      <input
                        type="url"
                        value={form.video_sin_musica_url}
                        onChange={(e) => setForm((s) => ({ ...s, video_sin_musica_url: e.target.value }))}
                        placeholder="https://drive.google.com/file/d/…"
                        className="w-full h-9 px-2 rounded border bg-background text-xs mt-1"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Music2 className="w-3 h-3" /> Con música
                      </span>
                      <input
                        type="url"
                        value={form.video_con_musica_url}
                        onChange={(e) => setForm((s) => ({ ...s, video_con_musica_url: e.target.value }))}
                        placeholder="https://drive.google.com/file/d/…"
                        className="w-full h-9 px-2 rounded border bg-background text-xs mt-1"
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Los botones de descarga aparecen debajo del preview cuando hay URL.
                    </p>
                  </div>
                </ToolbarBtnPopover>

                {/* Tomas */}
                <ToolbarBtnPopover
                  icon={<FolderOpen className="w-5 h-5" />}
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
                  icon={<span className="text-lg font-bold leading-none">#</span>}
                  label="Hashtag"
                  title="Agregar # en el copy"
                  onClick={() => insertAtCursor(' #')}
                />

                {/* Enlace */}
                <ToolbarBtn
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                  label="Enlace"
                  title="Pegar URL en el copy"
                  onClick={() => {
                    const url = prompt('URL del enlace:')
                    if (url) insertAtCursor(' ' + url + ' ')
                  }}
                />

                {/* Emoji */}
                <ToolbarBtnPopover
                  icon={<Smile className="w-5 h-5" />}
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

        {/* PROPIEDADES — antes estaba en columna derecha, ahora apilada
            debajo del copy en la columna izquierda según pedido de Pedro. */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Propiedades
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">
                <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <span>🎯</span> Estado
                </span>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
                  className="w-full h-8 px-2 rounded border border-input bg-background mt-1 text-xs"
                >
                  {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>)}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <span>👤</span> Editor
                </span>
                <select
                  value={form.editor_id}
                  onChange={(e) => setForm((s) => ({ ...s, editor_id: e.target.value }))}
                  className="w-full h-8 px-2 rounded border border-input bg-background mt-1 text-xs"
                >
                  <option value="">— Sin asignar —</option>
                  {editores.map((ed) => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <span>📅</span> Publicación
                </span>
                <input
                  type="date"
                  value={form.fecha_publicacion}
                  onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))}
                  className="w-full h-8 px-2 rounded border border-input bg-background mt-1 text-xs"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <span>✂️</span> Edición
                </span>
                <input
                  type="date"
                  value={form.fecha_edicion}
                  onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))}
                  className="w-full h-8 px-2 rounded border border-input bg-background mt-1 text-xs"
                />
              </label>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground text-[10px] block mb-1">Sub-estado tarea</span>
              <div className="flex gap-1">
                {ESTADOS_TAREA.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, estado_tarea: e }))}
                    className={`flex-1 h-7 px-1 rounded text-[10px] border transition-colors ${
                      form.estado_tarea === e
                        ? 'bg-[#ba41f7] text-white border-[#ba41f7]'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >{ESTADO_TAREA_LABEL[e]}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PROGRESO WORKFLOW — checklist con 6 ítems */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              ✓ Progreso workflow
            </h3>
            <div className="space-y-1">
              <ChecklistRowCompact label="Copy listo"    icon={<span className="text-sm leading-none">📝</span>} value={checklist.copy_listo}     onToggle={() => toggleCheck('copy_listo')} />
              <ChecklistRowCompact label="Música"        icon={<span className="text-sm leading-none">🎵</span>} value={checklist.musica_lista}   onToggle={() => toggleCheck('musica_lista')} />
              <ChecklistRowCompact label="Portada lista" icon={<span className="text-sm leading-none">🖼️</span>} value={checklist.portada_lista}  onToggle={() => toggleCheck('portada_lista')} />
              <ChecklistRowCompact label="Diseñado"      icon={<span className="text-sm leading-none">🎨</span>} value={checklist.disenado}       onToggle={() => toggleCheck('disenado')} />
              <ChecklistRowCompact label="Editado"       icon={<span className="text-sm leading-none">✂️</span>} value={checklist.editado}        onToggle={() => toggleCheck('editado')} />
              <ChecklistRowCompact label="Aprobado"      icon={<span className="text-sm leading-none">✅</span>} value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
            </div>
          </CardContent>
        </Card>

        {/* 2 CARDS EN FILA — Versión 2 (video alt) / Notas.
            La card "Guión / Indicaciones" se removió porque Pedro la usa
            como lo mismo que el Guión Técnico (tabla de escenas abajo).
            El campo form.guion se preserva en BD, solo dejamos de mostrarlo. */}
        <div className="grid lg:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>🎞️</span> Versión 2 (video alt.)
              </label>
              <textarea
                value={form.opcion_2}
                onChange={(e) => setForm((s) => ({ ...s, opcion_2: e.target.value }))}
                rows={5}
                placeholder="Segunda versión del video (ej: con música vs sin música)…"
                className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>📝</span> Notas internas
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                rows={5}
                placeholder="Notas privadas del equipo…"
                className="w-full p-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40"
              />
            </CardContent>
          </Card>
        </div>
        {/* Fin del grid 2 cards */}
        </div>
        {/* Fin columna izquierda */}

        {/* COLUMNA DERECHA — Preview sticky. Solo el preview, lo demás
            quedó apilado en la columna izquierda según pedido de Pedro. */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
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
            <a href={form.enlace_tomas} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-blue-600 hover:underline">
              ↗ Abrir carpeta de tomas en Drive
            </a>
          )}

          {/* BOTONES DE DESCARGA — 2 versiones del video editado.
              Pedro entra desde celular y descarga el que necesita en
              el momento. Botones grandes (h-12) para ser tappables fácil
              con el dedo. Solo aparecen si hay URL cargado. */}
          {(form.video_sin_musica_url || form.video_con_musica_url) && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                Descargar video
              </div>
              {form.video_sin_musica_url && (
                <a
                  href={form.video_sin_musica_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 h-12 px-4 rounded-lg border border-input bg-background hover:bg-muted hover:border-[#ba41f7]/40 transition-colors active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center shrink-0">
                    <VideoIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">Sin música</div>
                    <div className="text-[10px] text-muted-foreground">Tocá para abrir en Drive</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                </a>
              )}
              {form.video_con_musica_url && (
                <a
                  href={form.video_con_musica_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 h-12 px-4 rounded-lg border border-input bg-background hover:bg-muted hover:border-[#ba41f7]/40 transition-colors active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#ba41f7]/10 flex items-center justify-center shrink-0">
                    <Music2 className="w-4 h-4 text-[#ba41f7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">Con música</div>
                    <div className="text-[10px] text-muted-foreground">Tocá para abrir en Drive</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Fin SPLIT */}

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
  icon: React.ReactNode    // Lucide icon, ReactNode o (legacy) string
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
      className={`flex flex-col items-center justify-center gap-1 min-w-[64px] px-2.5 py-2 rounded-md transition-colors ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
            ? 'bg-[#ba41f7]/12 text-[#ba41f7]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="leading-none">{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}

function ToolbarBtnPopover({
  icon, label, title, onClick, active, children, badge,
}: {
  icon: React.ReactNode    // Acepta lucide icon, string emoji, o cualquier ReactNode
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
        className={`relative flex flex-col items-center justify-center gap-1 min-w-[64px] px-2.5 py-2 rounded-md transition-colors ${
          active
            ? 'bg-[#ba41f7]/12 text-[#ba41f7]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <span className="leading-none">{icon}</span>
        <span className="text-[10px] font-medium leading-none">{label}</span>
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#ba41f7] text-white text-[9px] font-bold flex items-center justify-center leading-none">
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

/* Versión compacta del ChecklistRow para el sidebar derecho del SPLIT.
   Sin borde card-like, más slim, óptimo cuando hay 6 items uno encima
   del otro en columna estrecha (~340px). */
function ChecklistRowCompact({ label, icon, value, onToggle }: { label: string; icon: React.ReactNode; value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-1.5 py-1 rounded transition-colors text-left text-xs ${
        value ? 'text-foreground' : 'text-muted-foreground hover:bg-muted/40'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded border text-[10px] flex-shrink-0 ${
        value ? 'bg-[#ba41f7] border-[#ba41f7] text-white' : 'border-input'
      }`}>
        {value ? '✓' : ''}
      </span>
      <span className="leading-none shrink-0 text-muted-foreground">{icon}</span>
      <span className={`flex-1 leading-tight ${value ? 'line-through opacity-60' : ''}`}>{label}</span>
    </button>
  )
}
