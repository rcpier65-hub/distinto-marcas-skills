// app/app/publicaciones/kanban/_components/kanban-board.tsx
// Client component con @dnd-kit que maneja drag-and-drop entre columnas.
//
// Arquitectura:
//  - DndContext: capa global de eventos drag
//  - SortableContext por columna: agrupa items dentro de la columna
//  - useSortable en cada card: permite drag + reorder
//  - Optimistic UI: estado local cambia inmediato, server async + rollback si falla
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { cambiarEstadoPublicacion } from '../../_actions'
import { ESTADO_PUBLICACION_LABEL, type EstadoPublicacion } from '@/lib/types/database'

// 10 columnas — orden del workflow editorial
const ESTADOS_ORDER: EstadoPublicacion[] = [
  'tareas', 'idear', 'editando', 'editar', 'disenar', 'disenando',
  'aprobar', 'programar', 'programar_anuncios', 'enviado', 'archivado',
]

// Estilo de header por estado (color visual del workflow)
const ESTADO_HEADER_STYLE: Record<EstadoPublicacion, string> = {
  tareas: 'bg-gray-100 dark:bg-gray-800 border-gray-300',
  idear: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
  editando: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300',
  editar: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400',
  disenar: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300',
  disenando: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-400',
  aprobar: 'bg-green-100 dark:bg-green-900/30 border-green-400',
  programar: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400',
  programar_anuncios: 'bg-teal-100 dark:bg-teal-900/30 border-teal-400',
  enviado: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400',
  archivado: 'bg-gray-50 dark:bg-gray-900/50 border-gray-200',
}

export type KanbanPub = {
  id: string
  nombre: string
  estado: EstadoPublicacion
  fecha_publicacion: string | null
  plataformas: string[]
  tipo_contenido: string[]
  editor_nombre: string | null
  marca: {
    slug: string
    emoji_marca: string | null
    color_primario_hex: string | null
  } | null
}

export function KanbanBoard({ initialPubs }: { initialPubs: KanbanPub[] }) {
  const router = useRouter()
  const [pubs, setPubs] = useState<KanbanPub[]>(initialPubs)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sensors: pointer (mouse/touch) + keyboard (a11y)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },  // necesita 5px de drag antes de iniciar (evita clicks accidentales)
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Agrupar publicaciones por estado
  const pubsByEstado: Record<EstadoPublicacion, KanbanPub[]> = ESTADOS_ORDER.reduce(
    (acc, e) => ({ ...acc, [e]: pubs.filter((p) => p.estado === e) }),
    {} as Record<EstadoPublicacion, KanbanPub[]>,
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const draggedPub = pubs.find((p) => p.id === activeId)
    if (!draggedPub) return

    // El "over" puede ser otro item (mismo grupo o columna distinta) o una columna vacía.
    // Detectamos el estado destino:
    let targetEstado: EstadoPublicacion | null = null
    if (ESTADOS_ORDER.includes(overId as EstadoPublicacion)) {
      // Soltó sobre el droppable de columna directamente (columna vacía)
      targetEstado = overId as EstadoPublicacion
    } else {
      // Soltó sobre otra card — la estado destino es el de esa card
      const overPub = pubs.find((p) => p.id === overId)
      if (overPub) targetEstado = overPub.estado
    }

    if (!targetEstado || targetEstado === draggedPub.estado) return

    // Optimistic update
    const prevPubs = pubs
    setPubs((curr) => curr.map((p) => p.id === activeId ? { ...p, estado: targetEstado! } : p))

    const result = await cambiarEstadoPublicacion(activeId, targetEstado)
    if (result.ok) {
      toast.success(`→ ${ESTADO_PUBLICACION_LABEL[targetEstado]}`)
      router.refresh()
    } else {
      // Rollback
      setPubs(prevPubs)
      toast.error(`Error: ${result.error}`)
    }
  }

  const activePub = activeId ? pubs.find((p) => p.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-6">
        {ESTADOS_ORDER.map((estado) => (
          <KanbanColumn
            key={estado}
            estado={estado}
            pubs={pubsByEstado[estado]}
          />
        ))}
      </div>

      {/* Overlay: card que sigue al cursor mientras arrastrás */}
      <DragOverlay>
        {activePub ? <KanbanCard pub={activePub} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// ============================================================
// KanbanColumn — droppable + sortable container
// ============================================================
function KanbanColumn({ estado, pubs }: { estado: EstadoPublicacion; pubs: KanbanPub[] }) {
  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col">
      {/* Column header */}
      <div className={`rounded-t-md px-3 py-2 border-t border-l border-r ${ESTADO_HEADER_STYLE[estado]}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide">{ESTADO_PUBLICACION_LABEL[estado]}</span>
          <Badge variant="outline" className="text-[10px] bg-background/50">{pubs.length}</Badge>
        </div>
      </div>

      {/* Sortable list */}
      <SortableContext id={estado} items={pubs.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ColumnDroppable estado={estado}>
          <div className={`flex-1 flex flex-col gap-2 p-2 rounded-b-md border-l border-r border-b bg-muted/20 min-h-[200px] ${ESTADO_HEADER_STYLE[estado].replace('bg-', 'border-').split(' ').pop() ?? ''}`}>
            {pubs.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-8 italic">
                Soltá una card acá
              </div>
            ) : (
              pubs.map((p) => <KanbanCard key={p.id} pub={p} />)
            )}
          </div>
        </ColumnDroppable>
      </SortableContext>
    </div>
  )
}

// Wrapper que hace droppable la columna completa (importante para columnas vacías)
function ColumnDroppable({ estado, children }: { estado: EstadoPublicacion; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppableColumn(estado)
  return (
    <div ref={setNodeRef} className={`flex-1 ${isOver ? 'ring-2 ring-primary ring-inset rounded-b-md' : ''}`}>
      {children}
    </div>
  )
}

// Helper: usa useDroppable de @dnd-kit para hacer la columna droppable
function useDroppableColumn(estado: EstadoPublicacion) {
  return useDroppable({ id: estado })
}

// ============================================================
// KanbanCard — draggable card
// ============================================================
function KanbanCard({ pub, isOverlay }: { pub: KanbanPub; isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pub.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Card visual
  const cardContent = (
    <div
      className={`bg-background border rounded-md p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging && !isOverlay ? 'opacity-30' : ''
      } ${isOverlay ? 'shadow-2xl ring-2 ring-primary rotate-2' : ''}`}
    >
      <div className="flex items-start gap-2 mb-1.5">
        {/* Color bar de marca */}
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: pub.marca?.color_primario_hex ?? '#999' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-base shrink-0">{pub.marca?.emoji_marca ?? '📊'}</span>
            <span className="text-[10px] font-mono text-muted-foreground truncate">{pub.marca?.slug}</span>
          </div>
          <Link
            href={`/publicaciones/${pub.id}`}
            className="text-sm font-medium leading-tight hover:underline block"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}  // evita que el click en link inicie drag
          >
            {pub.nombre}
          </Link>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1 flex-wrap text-[10px] text-muted-foreground">
        {pub.fecha_publicacion && <span className="font-mono">📅 {pub.fecha_publicacion.slice(5)}</span>}
        {pub.tipo_contenido[0] && (
          <span className="px-1.5 py-0.5 rounded bg-muted">{pub.tipo_contenido[0]}</span>
        )}
        {pub.editor_nombre && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-foreground">✏️ {pub.editor_nombre}</span>
        )}
      </div>

      {/* Plataformas */}
      {pub.plataformas.length > 0 && (
        <div className="flex items-center gap-0.5 mt-1.5">
          {pub.plataformas.slice(0, 4).map((p) => (
            <span key={p} className="text-xs" title={p}>
              {p === 'Instagram' && '📷'}
              {p === 'Facebook' && '👤'}
              {p === 'Tiktok' && '🎵'}
              {p === 'Youtube' && '▶️'}
              {p === 'Pinterest' && '📌'}
              {p === 'WhatsApp' && '💬'}
              {p === 'Exterior' && '🌐'}
            </span>
          ))}
          {pub.plataformas.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{pub.plataformas.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )

  if (isOverlay) return cardContent

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {cardContent}
    </div>
  )
}
