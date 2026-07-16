// app/app/dashboard/_components/marcas-grid.tsx
// Grilla de marcas + toggle "Tareas por marca" (Pedro 13-jul): al activarlo,
// cada card muestra sus tareas rápidas pendientes (NO publicaciones), de quien
// sea (Lorena, Ailyn, Pedro…). Es client porque el toggle es estado local.
'use client'

import { useState } from 'react'
import { ListTodo } from 'lucide-react'
import { MarcaCard, type MarcaCardData, type TareaMarca } from './marca-card'

export function MarcasGrid({
  cards,
  tareasPorMarca,
}: {
  cards: MarcaCardData[]
  tareasPorMarca: Record<string, TareaMarca[]>
}) {
  const [mostrarTareas, setMostrarTareas] = useState(false)
  const total = Object.values(tareasPorMarca).reduce((n, arr) => n + arr.length, 0)

  return (
    <>
      {/* Opciones (derecha): activar tareas por marca */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setMostrarTareas((v) => !v)}
          title="Muestra las tareas rápidas pendientes de cada marca"
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
            mostrarTareas
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          {mostrarTareas ? 'Ocultar tareas por marca' : 'Activar tareas por marca'}
          {total > 0 && (
            <span
              className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                mostrarTareas ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
              }`}
            >
              {total}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((m) => (
          <MarcaCard
            key={m.slug}
            marca={m}
            tareas={tareasPorMarca[m.slug] ?? []}
            mostrarTareas={mostrarTareas}
          />
        ))}
      </div>
    </>
  )
}
