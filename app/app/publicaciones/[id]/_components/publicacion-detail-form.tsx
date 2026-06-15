// app/app/publicaciones/[id]/_components/publicacion-detail-form.tsx
// Layout estilo Metricool refinado:
//  - HEADER: marca + badges + título + tabs de plataformas debajo del título
//  - SPLIT: copy + preview
//  - TOOLBAR: cada icono abre popover hacia arriba (tipo, objetivos, música, tomas, etc.)
//  - ZONA INFERIOR: checklist a la izquierda bonito + resto a la derecha
'use client'

import { useState, useTransition, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Globe, MessageCircle, Pin,
  Target, ImageIcon, Music2, FolderOpen, Smile, Film,
  CalendarDays, Scissors, User as UserIcon, Palette, FileText, CheckCircle2,
  Copy as CopyIcon, Trash2, Lightbulb, StickyNote, Sparkles,
  Download, Video as VideoIcon, Check, Pencil, ChevronDown,
  Volume2, VolumeX, Maximize2, X, Table2, Type as TypeIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updatePublicacion, deletePublicacion, togglePublicacionField, generarCopysConIA } from '../_actions'
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
// (solo aparece en hover/active para mantener look limpio en idle).
// Pinterest / WhatsApp / Exterior se quitaron del menú fijo; ahora se
// pueden agregar como "otra plataforma" en el input custom (ver botón
// "＋ Otra" en la sección de tabs).
const PLATAFORMAS = [
  { key: 'Instagram', Icon: InstagramIcon, label: 'Instagram', brand: '#E1306C' },
  { key: 'Facebook',  Icon: FacebookIcon,  label: 'Facebook',  brand: '#1877F2' },
  { key: 'Tiktok',    Icon: TikTokIcon,    label: 'TikTok',    brand: '#000000' },
  { key: 'Youtube',   Icon: YoutubeIcon,   label: 'YouTube',   brand: '#FF0000' },
] as const

const TIPO_OPTS = ['REEL', 'POST', 'CARRUSEL', 'STORY', 'REEL FRASE', 'VIDEO REEL TIKTOK', 'VIDEO']
const OBJETIVO_OPTS = ['Normal', 'Anuncio', 'Conversión', 'Alcance', 'Engagement']

/**
 * Extrae el file ID de un link de Drive. Soporta los 3 formatos comunes:
 *   - https://drive.google.com/file/d/{ID}/view
 *   - https://drive.google.com/open?id={ID}
 *   - https://drive.google.com/uc?id={ID}
 * Si no hay match, devuelve null y el player muestra fallback.
 */
function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null
  // /file/d/{ID}/
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  // ?id={ID} o &id={ID}
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}

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
  // Copys generados por IA (Claude). null = panel cerrado. Pedro elige uno y
  // se carga en el textarea; no se guarda hasta que toca "Guardar cambios".
  const [iaOpciones, setIaOpciones] = useState<string[] | null>(null)
  const [isGenerando, startGenerar] = useTransition()
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null)
  // Plataforma custom inline: cuando el equipo necesita marcar la pub
  // para un canal que no es Instagram/Facebook/TikTok/YouTube (banner,
  // exterior, pieza impresa, etc.).
  const [addingCustomPlat, setAddingCustomPlat] = useState(false)
  const [customPlatInput, setCustomPlatInput] = useState('')
  // Toggle audio del preview de video: 'con' = video con música (final),
  // 'sin' = video sin música (track limpio). Default: 'con' si hay con
  // música; si no, 'sin'.
  const [videoAudioMode, setVideoAudioMode] = useState<'con' | 'sin'>('con')
  // Modal del guion completo. Pedro pidió que "Ver guion completo"
  // abra un popup centrado en lugar de expandir el textarea inline
  // (que empujaba la página hacia abajo).
  const [guionModalOpen, setGuionModalOpen] = useState(false)
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

  // Genera 3 copys con Claude a partir del guion + voz de marca. Usa los
  // valores ACTUALES del form (aunque no estén guardados) para que Pedro pueda
  // pegar un guion y generar al toque.
  function handleGenerarCopy() {
    startGenerar(async () => {
      const r = await generarCopysConIA({
        publicacionId: initial.id,
        guion: form.guion,
        nombre: form.nombre,
        tipoContenido: form.tipo_contenido,
        plataformas: form.plataformas,
        copyActual: form.copy,
      })
      if (r.ok) {
        setIaOpciones(r.opciones)
        toast.success(`Claude generó ${r.opciones.length} opciones ✨`)
      } else {
        toast.error(r.error, { duration: 9000 })
      }
    })
  }

  // Pedro elige una opción → se carga en el textarea (sin guardar).
  function usarOpcionCopy(texto: string) {
    setForm((s) => ({ ...s, copy: texto }))
    setIaOpciones(null)
    toast.success('Copy cargado — revísalo y guarda ✓')
    setTimeout(() => autoResizeTextarea(), 0)
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
    /* Root wrapper. Antes el HEADER (chips marca/estado + título + tabs
       plataformas + Duplicar/Eliminar) estaba FUERA del grid en su
       propia fila, y eso empujaba el preview lateral hacia abajo. Pedro
       pidió que el preview arranque a la altura del chip "kintu" (parte
       superior del HEADER), así que ahora el HEADER vive como primer
       hijo de la columna izquierda del grid; META footer y STICKY save
       bar quedan FUERA del grid (hermanos), por eso necesitamos un
       wrapper pb-20 que envuelva todo. */
    <div className="pb-20">
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
      {/* COLUMNA IZQUIERDA — HEADER + Card del copy + resto */}
      <div className="space-y-4 min-w-0">
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
                  className={`group flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-all border-2 ${
                    isSelected
                      ? 'shadow-sm'
                      : 'bg-background border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                  } ${isPreview && isSelected ? 'ring-2 ring-[#ba41f7]/40' : ''}`}
                  style={
                    isSelected
                      ? {
                          // Color de marca social en TODO el chip cuando está activo:
                          // borde + fondo tintado + texto. Mucho más visible que el
                          // 'bg-foreground/5' anterior que era casi invisible.
                          borderColor: p.brand,
                          backgroundColor: `${p.brand}14`, // ~8% opacity tint
                          color: p.brand,
                        }
                      : undefined
                  }
                >
                  {/* Wrapper span para colorear el SVG via currentColor.
                      Los iconos custom (InstagramIcon, FacebookIcon, etc.)
                      no aceptan style prop según su typing, así que el
                      color va en el wrapper y el SVG lo hereda. */}
                  <span
                    className="inline-flex w-4 h-4 transition-colors"
                    style={{ color: isSelected ? p.brand : undefined }}
                  >
                    <p.Icon className="w-4 h-4" />
                  </span>
                  <span>{p.label}</span>
                </button>
              )
            })}

            {/* Chips custom — plataformas que el equipo agregó manual
                (banner, exterior, etc.) que ya están en form.plataformas
                pero NO en el array fijo de arriba. Click para quitarlas. */}
            {form.plataformas
              .filter((p) => !PLATAFORMAS.some((fixed) => fixed.key === p))
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleArrayItem('plataformas', p)}
                  title="Click para quitar esta plataforma"
                  className="group flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-all border-2 shadow-sm"
                  style={{
                    // Accent violeta de Distinto para chips custom
                    borderColor: '#ba41f7',
                    backgroundColor: '#ba41f714', // ~8% opacity tint
                    color: '#ba41f7',
                  }}
                >
                  <span>{p}</span>
                  <span className="opacity-50 group-hover:opacity-100 text-xs">×</span>
                </button>
              ))}

            {/* Botón "＋ Otra" → input inline → agrega plataforma custom */}
            {addingCustomPlat ? (
              <input
                type="text"
                autoFocus
                value={customPlatInput}
                onChange={(e) => setCustomPlatInput(e.target.value)}
                onBlur={() => {
                  const v = customPlatInput.trim()
                  if (v && !form.plataformas.includes(v)) {
                    setForm((s) => ({ ...s, plataformas: [...s.plataformas, v] }))
                  }
                  setCustomPlatInput('')
                  setAddingCustomPlat(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  } else if (e.key === 'Escape') {
                    setCustomPlatInput('')
                    setAddingCustomPlat(false)
                  }
                }}
                placeholder="Banner, Exterior…"
                className="h-10 px-4 rounded-full text-sm border border-dashed border-foreground/30 bg-background focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 placeholder:text-muted-foreground/60 min-w-[160px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingCustomPlat(true)}
                title="Agregar otra plataforma (Banner, Exterior, etc.)"
                className="flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium border border-dashed border-foreground/25 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <span className="text-base leading-none">＋</span>
                <span>Otra</span>
              </button>
            )}
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

      {/* COPY + WORKFLOW LATERAL: el Card del copy ahora tiene un
          sidebar izquierdo (180px) con el progreso del workflow.
          Permite a Pedro ver el avance mientras edita el copy.
          Nota: el grid wrapper y el wrapper col-izq antes vivían aquí,
          se subieron al return root para que el preview lateral arranque
          a la altura del HEADER, no debajo de él.
          overflow-visible: shadcn Card trae overflow-hidden por default
          y eso recortaba los popovers del toolbar que se abren arriba
          (Pedro hacía clic en "Tipo" y no veía la info). */}
        <Card className="overflow-visible">
          <div className="flex">
            {/* Sidebar lateral — workflow + propiedades.
                Pedro pidió tener WORKFLOW y PROPIEDADES en el mismo
                bloque vertical al costado del copy, para no scrollear
                buscando estado/editor/fechas mientras edita el texto. */}
            <aside className="w-[240px] shrink-0 border-r border-border bg-muted/30 p-3 space-y-4">
              {/* Workflow checklist */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Workflow
                </h3>
                <div className="space-y-1">
                  <ChecklistRowCompact label="Copy listo"    icon={<FileText className="w-3.5 h-3.5" />}    value={checklist.copy_listo}     onToggle={() => toggleCheck('copy_listo')} />
                  <ChecklistRowCompact label="Música"        icon={<Music2 className="w-3.5 h-3.5" />}      value={checklist.musica_lista}   onToggle={() => toggleCheck('musica_lista')} />
                  <ChecklistRowCompact label="Portada lista" icon={<ImageIcon className="w-3.5 h-3.5" />}   value={checklist.portada_lista}  onToggle={() => toggleCheck('portada_lista')} />
                  <ChecklistRowCompact label="Diseñado"      icon={<Palette className="w-3.5 h-3.5" />}     value={checklist.disenado}       onToggle={() => toggleCheck('disenado')} />
                  <ChecklistRowCompact label="Editado"       icon={<Scissors className="w-3.5 h-3.5" />}    value={checklist.editado}        onToggle={() => toggleCheck('editado')} />
                  <ChecklistRowCompact label="Aprobado"      icon={<CheckCircle2 className="w-3.5 h-3.5" />} value={checklist.video_aprobado} onToggle={() => toggleCheck('video_aprobado')} />
                </div>
              </div>

              {/* Propiedades (Estado, Editor, Publicación, Edición, Sub-estado).
                  Estética moderna 2024-25:
                  - Inputs con bg tintado sutil (no blanco puro)
                  - Border casi invisible idle, focus ring accent violeta
                  - Chevron custom para selects (no el feo del browser)
                  - Icono inline en cada label
                  - Sub-estado tarea = segmented control estilo iOS */}
              <div className="space-y-2.5 border-t border-border/60 pt-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Propiedades
                </h3>

                {/* Estado */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3 h-3" /> Estado
                  </label>
                  <div className="relative">
                    <select
                      value={form.estado}
                      onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as EstadoPublicacion }))}
                      className="w-full h-9 pl-3 pr-8 rounded-lg bg-background/70 border border-border/40 text-[12px] font-medium appearance-none cursor-pointer transition-all hover:bg-background hover:border-border focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/30 focus:border-[#ba41f7]/50 focus:bg-background"
                    >
                      {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>)}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Editor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3 h-3" /> Editor
                  </label>
                  <div className="relative">
                    <select
                      value={form.editor_id}
                      onChange={(e) => setForm((s) => ({ ...s, editor_id: e.target.value }))}
                      className="w-full h-9 pl-3 pr-8 rounded-lg bg-background/70 border border-border/40 text-[12px] font-medium appearance-none cursor-pointer transition-all hover:bg-background hover:border-border focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/30 focus:border-[#ba41f7]/50 focus:bg-background"
                    >
                      <option value="">— Sin asignar —</option>
                      {editores.map((ed) => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Publicación */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" /> Publicación
                  </label>
                  <input
                    type="date"
                    value={form.fecha_publicacion}
                    onChange={(e) => setForm((s) => ({ ...s, fecha_publicacion: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-background/70 border border-border/40 text-[12px] font-medium transition-all hover:bg-background hover:border-border focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/30 focus:border-[#ba41f7]/50 focus:bg-background"
                  />
                </div>

                {/* Edición */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors className="w-3 h-3" /> Edición
                  </label>
                  <input
                    type="date"
                    value={form.fecha_edicion}
                    onChange={(e) => setForm((s) => ({ ...s, fecha_edicion: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-background/70 border border-border/40 text-[12px] font-medium transition-all hover:bg-background hover:border-border focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/30 focus:border-[#ba41f7]/50 focus:bg-background"
                  />
                </div>

                {/* Sub-estado tarea — segmented control estilo iOS.
                    Track sutil, pill activo blanco con sombra muy ligera. */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider block">
                    Sub-estado
                  </label>
                  <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
                    {ESTADOS_TAREA.map((e) => {
                      const active = form.estado_tarea === e
                      return (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setForm((s) => ({ ...s, estado_tarea: e }))}
                          className={`flex-1 h-7 px-1 rounded-md text-[10px] font-medium transition-all leading-none ${
                            active
                              ? 'bg-background text-foreground shadow-sm ring-1 ring-black/[0.04]'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >{ESTADO_TAREA_LABEL[e]}</button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </aside>
            {/* Contenido del Card del Copy — todo lo que estaba antes */}
            <div className="p-0 flex flex-col flex-1 min-w-0">
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
              <div className="flex items-center gap-2">
                {/* Generar copy con IA (Claude): analiza el guion + voz de marca
                    y devuelve 3 opciones. Mismo flujo que Pedro hacía en Notion. */}
                <button
                  type="button"
                  onClick={handleGenerarCopy}
                  disabled={isGenerando}
                  title="Genera 3 copys con Claude a partir del guion y la voz de la marca"
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[10px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #ba41f7, #7c3aed)' }}
                >
                  <Sparkles className={`w-3 h-3 ${isGenerando ? 'animate-pulse' : ''}`} />
                  {isGenerando ? 'Generando…' : 'Generar con IA'}
                </button>
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
            </div>
            {/* Panel de copys generados por IA (Claude). Aparece al tocar
                "Generar con IA"; Pedro elige una opción y se carga en el
                textarea (sin guardar todavía). */}
            {(isGenerando || iaOpciones) && (
              <div className="mx-3 mt-3 rounded-lg border border-[#ba41f7]/30 bg-[#ba41f7]/[0.04]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#ba41f7]/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c3aed]">
                    <Sparkles className={`w-3.5 h-3.5 ${isGenerando ? 'animate-pulse' : ''}`} />
                    {isGenerando ? 'Claude está escribiendo copys…' : 'Elige una opción'}
                  </div>
                  {iaOpciones && !isGenerando && (
                    <button
                      type="button"
                      onClick={() => setIaOpciones(null)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Cerrar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isGenerando ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Analizando el guion y la voz de la marca… toma unos segundos.
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {iaOpciones!.map((op, i) => (
                      <div key={i} className="rounded-md border bg-background p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c3aed]">
                            Opción {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => usarOpcionCopy(op)}
                            className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold text-white"
                            style={{ background: '#ba41f7' }}
                          >
                            <Check className="w-3 h-3" /> Usar este
                          </button>
                        </div>
                        <p className="text-xs whitespace-pre-wrap text-foreground/90 max-h-40 overflow-y-auto">{op}</p>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleGenerarCopy}
                        disabled={isGenerando}
                        className="text-[10px] text-[#7c3aed] hover:underline disabled:opacity-50"
                      >
                        ↻ Regenerar opciones
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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

            {/* TOOLBAR con popovers expandibles.
                IMPORTANTE: NO usar overflow-x-auto aquí. Los browsers
                convierten overflow-y: visible → auto cuando el otro eje
                tiene auto, y eso recorta los popovers que salen hacia
                arriba (Pedro hizo clic en "Tipo" y no veía el popover).
                Con min-w-[68px] × 6 + gap-2 los iconos caben en ~440px,
                en desktop normal no hace falta scroll. Si en mobile no
                caben, flex-wrap los pasa a 2 filas (mejor que clipear). */}
            <div ref={toolbarRef} className="border-t bg-muted/20 px-3 py-2 relative">
              <div className="flex items-end justify-start gap-2 flex-wrap">
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
                  {/* Antes flex-wrap con max-w 280px provocaba que
                      "REEL FRASE" y "VIDEO REEL TIKTOK" se cortaran en
                      varias líneas dentro del chip. Ahora: lista vertical
                      con whitespace-nowrap así cada chip queda en 1 línea. */}
                  <div className="flex flex-col gap-1.5 w-[200px]">
                    {TIPO_OPTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleArrayItem('tipo_contenido', t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap text-center ${
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
                    <div className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Cruda (sin editar)</span>
                      <div className="mt-1">
                        <LinkInput
                          value={form.portada_cruda_url}
                          onChange={(v) => setForm((s) => ({ ...s, portada_cruda_url: v }))}
                          placeholder="https://drive.google.com/…"
                        />
                      </div>
                    </div>
                    <div className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Palette className="w-3 h-3" /> Editada (final)</span>
                      <div className="mt-1">
                        <LinkInput
                          value={form.portada_editada_url}
                          onChange={(v) => setForm((s) => ({ ...s, portada_editada_url: v }))}
                          placeholder="https://drive.google.com/…"
                        />
                      </div>
                    </div>
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
                    <LinkInput
                      value={form.enlace_musica}
                      onChange={(v) => setForm((s) => ({ ...s, enlace_musica: v }))}
                      placeholder="https://vt.tiktok.com/… o Spotify"
                    />
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
                    <div className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <VideoIcon className="w-3 h-3" /> Sin música
                      </span>
                      <div className="mt-1">
                        <LinkInput
                          value={form.video_sin_musica_url}
                          onChange={(v) => setForm((s) => ({ ...s, video_sin_musica_url: v }))}
                          placeholder="https://drive.google.com/file/d/…"
                        />
                      </div>
                    </div>
                    <div className="block text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Music2 className="w-3 h-3" /> Con música
                      </span>
                      <div className="mt-1">
                        <LinkInput
                          value={form.video_con_musica_url}
                          onChange={(v) => setForm((s) => ({ ...s, video_con_musica_url: v }))}
                          placeholder="https://drive.google.com/file/d/…"
                        />
                      </div>
                    </div>
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
                    <LinkInput
                      value={form.enlace_tomas}
                      onChange={(v) => setForm((s) => ({ ...s, enlace_tomas: v }))}
                      placeholder="https://drive.google.com/drive/folders/…"
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

                {/* Removidos por pedido de Pedro (2026-06-05):
                    Hashtag, Enlace, Emoji, IA — no se usan en el flujo
                    operativo y agregan ruido al toolbar. */}
              </div>
            </div>

            {/* GUION TÉCNICO inline — debajo del toolbar, dentro del Card
                del copy. Pedro pidió tenerlo acá en vez de en una card
                separada al final. Textarea libre que acepta cualquier
                contenido pegado (incluido tablas de Word con tabs y
                newlines preservados). Auto-save al onBlur del form. */}
            <div className="border-t bg-background">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-[#ba41f7]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Guion técnico
                  </span>
                  {form.guion && (
                    <span className="text-[10px] text-muted-foreground/60">
                      · {form.guion.split('\n').length} líneas
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setGuionModalOpen(true)}
                  className="text-[10px] text-[#ba41f7] hover:underline flex items-center gap-1 font-medium"
                  title="Abrir guion completo en popup"
                >
                  <Maximize2 className="w-3 h-3" />
                  Ver guion completo
                </button>
              </div>
              <textarea
                value={form.guion ?? ''}
                onChange={(e) => setForm((s) => ({ ...s, guion: e.target.value }))}
                placeholder="Pega el guion técnico aquí. Acepta tablas de Word, Notion, o texto plano."
                rows={4}
                /* Textarea inline siempre 4 filas. La vista "completa"
                   ahora abre en modal (ver GuionModal abajo) en lugar
                   de expandir aquí, así no empuja el resto de la
                   página hacia abajo. */
                className="w-full px-4 pt-1 pb-3 text-[12px] font-mono leading-snug bg-background border-0 focus:outline-none focus:ring-0 resize-y placeholder:text-muted-foreground/40 placeholder:font-sans transition-all"
                spellCheck={false}
              />
            </div>
            </div>{/* Fin contenido del Card del copy (sidebar workflow al lado) */}
          </div>{/* Fin flex wrapper Card del copy */}
        </Card>

        {/* PROPIEDADES movido al sidebar lateral izquierdo del Card del
            copy (junto con el Workflow). Pedro pidió tener Estado/Editor/
            Publicación/Edición/Sub-estado siempre visible al costado del
            editor de copy, sin scrollear. */}

        {/* PROGRESO WORKFLOW: el bloque grande se movió al sidebar lateral
            izquierdo del Card del COPY (más arriba en este mismo archivo).
            Pedro pidió tenerlo al costado del editor de copy en vez de
            apilado abajo, así puede ver el avance del workflow mientras
            edita el texto del post. */}

        {/* Removidos por pedido de Pedro (2026-06-05):
            "Versión 2 (video alt.)" y "Notas internas". La versión 2 se
            superpone con el panel "Videos editados (Drive)" del header
            del copy (que ya tiene Sin/Con música). Las notas internas
            no se usan en el flujo. Los campos form.opcion_2 y form.notas
            se preservan en BD por si los reactivamos. */}
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
              {/* Aspect 9:16 (vertical TikTok/Reel 1920×1080 → invertido).
                  Si hay video URL: render iframe de Drive con toggle
                  audio (con música / sin música). Si no, fallback a la
                  portada (editada > cruda > carpeta tomas > placeholder). */}
              {(() => {
                const conMusicaId = extractDriveFileId(form.video_con_musica_url)
                const sinMusicaId = extractDriveFileId(form.video_sin_musica_url)
                const hayVideo = !!(conMusicaId || sinMusicaId)
                // Default audio mode: si solo hay sin música, mostrar esa
                const effectiveMode: 'con' | 'sin' =
                  videoAudioMode === 'con' && !conMusicaId ? 'sin'
                  : videoAudioMode === 'sin' && !sinMusicaId ? 'con'
                  : videoAudioMode
                const activeId = effectiveMode === 'con' ? conMusicaId : sinMusicaId

                return (
                  <div className="aspect-[9/16] bg-black flex items-center justify-center relative">
                    {hayVideo && activeId ? (
                      <>
                        <iframe
                          key={activeId} // forzar reload al cambiar audio mode
                          src={`https://drive.google.com/file/d/${activeId}/preview`}
                          className="w-full h-full"
                          allow="autoplay"
                          allowFullScreen
                          title={effectiveMode === 'con' ? 'Video con música' : 'Video sin música'}
                        />
                        {/* Toggle audio overlay — solo si HAY ambos URLs */}
                        {conMusicaId && sinMusicaId && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-full bg-black/70 backdrop-blur-sm">
                            <button
                              type="button"
                              onClick={() => setVideoAudioMode('sin')}
                              title="Sin música (track limpio)"
                              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                                effectiveMode === 'sin'
                                  ? 'bg-white text-black shadow-md'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <VolumeX className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setVideoAudioMode('con')}
                              title="Con música (video final)"
                              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                                effectiveMode === 'con'
                                  ? 'bg-[#ba41f7] text-white shadow-md'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : previewMode === 'editada' || previewMode === 'cruda' ? (
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
                        Sin video ni portada
                        <div className="text-[10px] mt-1 text-white/40">
                          Pegá URL en Videos, Portada o Tomas
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {/* Removido por pedido de Pedro (2026-06-05):
                  vista previa del copy con @brandHandle (estilo
                  Instagram caption). Pedro la ve redundante con el
                  Card del copy editable a la izquierda — solo necesita
                  el video preview, no el mock del caption. */}
            </CardContent>
          </Card>
          {previewMode === 'drive' && form.enlace_tomas && (
            <a href={form.enlace_tomas} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-blue-600 hover:underline">
              ↗ Abrir carpeta de tomas en Drive
            </a>
          )}

          {/* Removido por pedido de Pedro (2026-06-05):
              "Descargar video" con cards Sin/Con música. Era duplicado
              porque el popover "Videos" del toolbar ya tiene los enlaces
              con el componente LinkInput (copiar/abrir/editar). */}
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

      {/* MODAL GUION COMPLETO
          Se abre con el botón "Ver guion completo" del Card del copy.
          Patrón: backdrop + card centrada. El textarea adentro edita
          el MISMO form.guion que el textarea inline (no hay copia de
          estado), así cualquier cambio se persiste al cerrar y se
          refleja en el textarea pequeño. */}
      {guionModalOpen && (
        <GuionModal
          value={form.guion ?? ''}
          onChange={(v) => setForm((s) => ({ ...s, guion: v }))}
          onClose={() => setGuionModalOpen(false)}
        />
      )}
    </div>
  )
}

/* ============================================================
   GuionModal — popup full-size para editar el guion
   ============================================================ */

/**
 * Parsea un guion que viene como tabla (con `|` o `\t` entre columnas)
 * y devuelve headers + rows. Si no parece tabla → null y se muestra
 * el texto plano.
 *
 * Heurística:
 *  - Necesita al menos 2 líneas no vacías.
 *  - Detecta separador dominante: prefiere `|` (lo más común en Notion);
 *    cae a `\t` si pegaron desde Word o Google Docs.
 *  - Todas las filas deben dividirse en >= 2 columnas con ese separador.
 */
function parseGuionAsTable(text: string): { headers: string[]; rows: string[][] } | null {
  const raw = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (raw.length < 2) return null

  const usePipe = raw[0].includes('|')
  const useTab = !usePipe && raw[0].includes('\t')
  if (!usePipe && !useTab) return null

  const sep = usePipe ? /\s*\|\s*/ : /\t+/
  // .filter(Boolean) elimina celdas vacías que aparecen si el texto
  // tiene un `|` al inicio o al final ("| a | b |" → ['', 'a', 'b', '']).
  const split = (l: string) => l.split(sep).filter((c) => c.length > 0)

  const rows = raw.map(split)
  if (!rows.every((r) => r.length >= 2)) return null

  const [headers, ...body] = rows
  return { headers, rows: body }
}

function GuionModal({
  value, onChange, onClose,
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  /* Modo de visualización: tabla renderizada vs textarea editable.
     Por default arranca en 'table' si el contenido parece tabla; sino
     en 'text' para no mostrar una tabla vacía/rara. */
  const tableData = useMemo(() => parseGuionAsTable(value), [value])
  const [mode, setMode] = useState<'table' | 'text'>(() => (tableData ? 'table' : 'text'))

  /* Si Pedro pega contenido en modo texto y de pronto pasa a parecer
     tabla, dejarlo decidir cuándo cambiar — no forzar el mode aquí.
     Solo forzamos a 'text' si elige 'table' pero no hay tabla parseable. */
  useEffect(() => {
    if (mode === 'table' && !tableData) setMode('text')
  }, [tableData, mode])

  // Cerrar con tecla Esc + bloquear scroll del body mientras está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const lineCount = value ? value.split('\n').length : 0
  const charCount = value.length

  return (
    /* z-50 por encima del STICKY save bar (z-30) y popovers del
       toolbar (z-20). Backdrop click cierra; clicks dentro NO. */
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        /* max-w-5xl y max-h-[95vh] = look "hoja de Word" pidió Pedro.
           Tan grande como caiga en pantalla, no centrado en un cuadrito
           chico como antes. */
        className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* HEADER con título + toggle Tabla/Texto + close */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="w-4 h-4 text-[#ba41f7] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
              Guion técnico
            </span>
            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
              · {lineCount} {lineCount === 1 ? 'línea' : 'líneas'} · {charCount} chars
            </span>
          </div>

          {/* TOGGLE Tabla / Texto — segmented control estilo iOS.
              Si no hay tabla detectada, el botón Tabla queda disabled
              con tooltip explicativo. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => tableData && setMode('table')}
                disabled={!tableData}
                title={tableData ? 'Ver como tabla' : 'No se detectó formato de tabla (con | o tabs)'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  mode === 'table'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/[0.04]'
                    : 'text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground'
                }`}
              >
                <Table2 className="w-3 h-3" /> Tabla
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  mode === 'text'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/[0.04]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TypeIcon className="w-3 h-3" /> Texto
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY — tabla renderizada O textarea editable */}
        {mode === 'table' && tableData ? (
          <div className="flex-1 overflow-auto px-6 py-6 bg-muted/10">
            {/* Render tipo "hoja de doc": fondo levemente diferente,
                tabla con bordes claros, headers con fondo, padding
                generoso. */}
            <div className="max-w-4xl mx-auto bg-background rounded-lg ring-1 ring-border shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-muted/40">
                    {tableData.headers.map((h, i) => (
                      <th
                        key={i}
                        className="text-left font-semibold text-foreground px-4 py-3 border-b border-border align-top"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/20 transition-colors">
                      {tableData.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="text-foreground px-4 py-3 border-b border-border/60 align-top leading-relaxed whitespace-pre-wrap break-words"
                        >
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Modo lectura. Para editar, cambia a <span className="font-medium">Texto</span>.
            </p>
          </div>
        ) : (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pega el guion técnico aquí. Acepta tablas de Word, Notion (con | o tabs entre columnas), o texto plano."
            className="flex-1 w-full px-6 py-5 text-[13px] font-mono leading-relaxed bg-background border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-muted-foreground/40 placeholder:font-sans"
            spellCheck={false}
          />
        )}

        {/* FOOTER */}
        <div className="px-5 py-2.5 border-t bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {mode === 'table'
              ? 'Vista tabla detectada. Esc para cerrar.'
              : 'Esc para cerrar. Los cambios se guardan con el botón Guardar abajo.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#ba41f7] hover:underline font-medium"
          >
            Cerrar
          </button>
        </div>
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
      aria-label={title}
      className={`flex flex-col items-center justify-center gap-1.5 min-w-[68px] px-2.5 pt-5 pb-2 rounded-lg transition-colors ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
            ? 'bg-[#ba41f7]/12 text-[#ba41f7]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="leading-none">{icon}</span>
      <span className="text-[11px] font-medium leading-none whitespace-nowrap">{label}</span>
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
        aria-label={title}
        className={`relative flex flex-col items-center justify-center gap-1.5 min-w-[68px] px-2.5 pt-5 pb-2 rounded-lg transition-colors ${
          active
            ? 'bg-[#ba41f7]/12 text-[#ba41f7]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <span className="leading-none">{icon}</span>
        <span className="text-[11px] font-medium leading-none whitespace-nowrap">{label}</span>
        {badge && (
          /* Badge pegado al borde superior del botón (top-0) en lugar
             de superpuesto. Antes "-top-2" + "py-2.5" hacían que el
             badge cubriera los primeros 10px del icono (Pedro vio que
             "REEL FRASE" tapaba el film icon, "Normal" tapaba la
             diana, etc.). Ahora con pt-5 el botón tiene 20px de
             padding-top y el badge en top-0 h-[18px] queda íntegro
             arriba del icono SIN solaparlo. */
          <span className="absolute top-0.5 right-1 h-[18px] px-2 rounded-full bg-[#ba41f7] text-white text-[10px] font-bold flex items-center justify-center leading-none whitespace-nowrap shadow-sm">
            {badge.length > 14 ? badge.slice(0, 13) + '…' : badge}
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

/**
 * Input para URLs con 3 zonas de interacción cuando hay valor:
 *   [📋 Copy] [centro = link openable que truncate] [✏️ Edit]
 *
 * Estados:
 *   - Sin valor o `editing=true` → input editable normal
 *   - Con valor → vista compacta de 3 zonas (sin botón editar permite
 *     editar = botón ✏️ a la derecha)
 *
 * Interacción:
 *   - Click 📋   → copia al clipboard + feedback ✓ por 1.5s
 *   - Click centro → abre en nueva pestaña (target=_blank)
 *   - Click ✏️   → entra en modo edit (input con autoFocus)
 *   - En edit: Enter / blur guarda, Escape cancela
 *
 * Usado para portada cruda/editada, música, videos editados, tomas.
 * Si el equipo necesita cambiar el link, click en ✏️ y nuevo URL.
 */
function LinkInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [copied, setCopied] = useState(false)

  // Sincronizar draft si el valor cambia desde afuera (ej. sync Notion)
  useEffect(() => {
    setDraft(value)
  }, [value])

  function commitEdit() {
    const next = draft.trim()
    if (next !== value) onChange(next)
    setEditing(false)
  }
  function cancelEdit() {
    setDraft(value)
    setEditing(false)
  }
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silenciar — algunos browsers bloquean clipboard en non-https
    }
  }

  // Sin valor o editando → input normal editable
  if (editing || !value) {
    return (
      <input
        type="url"
        value={draft}
        autoFocus={editing}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            cancelEdit()
          }
        }}
        placeholder={placeholder}
        className="w-full h-8 px-2 rounded border bg-background text-xs"
      />
    )
  }

  // Con valor → vista 3 zonas
  return (
    <div className="flex items-stretch h-8 rounded border border-input bg-background overflow-hidden">
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? '¡Copiado!' : 'Copiar link'}
        className="px-2 flex items-center justify-center border-r border-input hover:bg-muted shrink-0 transition-colors"
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-600" />
          : <CopyIcon className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en nueva pestaña"
        className="flex-1 min-w-0 px-2 flex items-center text-xs text-blue-600 hover:underline truncate"
      >
        {value}
      </a>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Editar / cambiar link"
        className="px-2 flex items-center justify-center border-l border-input hover:bg-muted shrink-0 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  )
}
