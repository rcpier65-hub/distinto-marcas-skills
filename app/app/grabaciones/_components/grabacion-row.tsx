// app/app/grabaciones/_components/grabacion-row.tsx
//
// Fila de grabación en la tabla con acciones inline: marcar cumplida,
// cancelar, editar fecha real / videos / notas.
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateGrabacionEstado, deleteGrabacion } from '../_actions'
import type { GrabacionEstado } from '@/lib/types/database'

type Props = {
  id: string
  marca_nombre: string
  marca_emoji: string | null
  fecha_planeada: string
  fecha_real: string | null
  estado: GrabacionEstado
  videos_grabados: number | null
  notas: string | null
}

const ESTADO_COLORS: Record<GrabacionEstado, string> = {
  planeada: 'bg-amber-100 text-amber-900 border-amber-200',
  cumplida: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  cancelada: 'bg-rose-100 text-rose-900 border-rose-200',
}

const ESTADO_EMOJI: Record<GrabacionEstado, string> = {
  planeada: '🕒',
  cumplida: '✅',
  cancelada: '❌',
}

export function GrabacionRow(props: Props) {
  const [estado, setEstado] = useState(props.estado)
  const [fechaReal, setFechaReal] = useState(props.fecha_real ?? '')
  const [videos, setVideos] = useState(props.videos_grabados?.toString() ?? '')
  const [notas, setNotas] = useState(props.notas ?? '')
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChangeEstado(next: GrabacionEstado) {
    startTransition(async () => {
      const result = await updateGrabacionEstado({
        id: props.id,
        estado: next,
        fecha_real: next === 'cumplida' ? (fechaReal || new Date().toISOString().slice(0, 10)) : null,
        videos_grabados: next === 'cumplida' && videos ? parseInt(videos, 10) : null,
        notas: notas || null,
      })
      if (result.ok) {
        setEstado(next)
        toast.success(`Grabación → ${next}`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await updateGrabacionEstado({
        id: props.id,
        estado,
        fecha_real: fechaReal || null,
        videos_grabados: videos ? parseInt(videos, 10) : null,
        notas: notas || null,
      })
      if (result.ok) {
        setEditing(false)
        toast.success('Cambios guardados')
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`¿Borrar grabación planeada para el ${props.fecha_planeada}? Esto NO se puede deshacer.`)) return
    startTransition(async () => {
      const result = await deleteGrabacion(props.id)
      if (result.ok) toast.success('Borrada')
      else toast.error(`Error: ${result.error}`)
    })
  }

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{props.marca_emoji ?? '📊'}</span>
          <span className="font-medium text-sm">{props.marca_nombre}</span>
        </div>
      </td>
      <td className="py-2 px-3 font-mono text-xs">{props.fecha_planeada}</td>
      <td className="py-2 px-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[estado]}`}>
          {ESTADO_EMOJI[estado]} {estado}
        </span>
      </td>
      <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
        {editing ? (
          <input
            type="date"
            value={fechaReal}
            onChange={(e) => setFechaReal(e.target.value)}
            className="h-7 px-1 border rounded text-xs"
          />
        ) : (
          fechaReal || '—'
        )}
      </td>
      <td className="py-2 px-3 text-xs">
        {editing ? (
          <input
            type="number"
            value={videos}
            onChange={(e) => setVideos(e.target.value)}
            placeholder="0"
            min="0"
            className="h-7 w-16 px-1 border rounded text-xs"
          />
        ) : (
          props.videos_grabados ?? '—'
        )}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground max-w-xs">
        {editing ? (
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas opcionales"
            className="h-7 w-full px-1 border rounded text-xs"
          />
        ) : (
          <span className="line-clamp-1">{notas || '—'}</span>
        )}
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1 justify-end flex-wrap">
          {!editing ? (
            <>
              {estado !== 'cumplida' && (
                <button
                  onClick={() => handleChangeEstado('cumplida')}
                  disabled={isPending}
                  className="h-7 px-2 text-xs rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-50"
                  title="Marcar como cumplida"
                >
                  ✅ Cumplida
                </button>
              )}
              {estado !== 'cancelada' && estado !== 'cumplida' && (
                <button
                  onClick={() => handleChangeEstado('cancelada')}
                  disabled={isPending}
                  className="h-7 px-2 text-xs rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50"
                  title="Marcar como cancelada"
                >
                  ❌ Cancelar
                </button>
              )}
              {estado !== 'planeada' && (
                <button
                  onClick={() => handleChangeEstado('planeada')}
                  disabled={isPending}
                  className="h-7 px-2 text-xs rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 disabled:opacity-50"
                  title="Volver a planeada"
                >
                  🕒 Reabrir
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                disabled={isPending}
                className="h-7 px-2 text-xs rounded border hover:bg-muted disabled:opacity-50"
                title="Editar fecha/videos/notas"
              >
                ✏️ Editar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="h-7 w-7 text-xs rounded border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                title="Borrar grabación"
              >
                🗑
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isPending}
                className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
              >
                {isPending ? '…' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setFechaReal(props.fecha_real ?? '')
                  setVideos(props.videos_grabados?.toString() ?? '')
                  setNotas(props.notas ?? '')
                }}
                disabled={isPending}
                className="h-7 px-2 text-xs rounded border disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
