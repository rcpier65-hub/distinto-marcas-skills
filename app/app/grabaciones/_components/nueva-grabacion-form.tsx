// app/app/grabaciones/_components/nueva-grabacion-form.tsx
//
// Form para crear nueva grabación con los mismos campos que Google Calendar:
// Marca, Título, Fecha, Hora inicio, Duración, Descripción, y checkbox para
// reunión con Meet + invitados. Pedro pidió "las mismas opciones que en
// Google Calendar... en eventos debes sincronizarse" — esto crea un evento
// con dateTime (no all-day) en GCal vía el server action.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createGrabacion } from '../_actions'

type MarcaOption = {
  slug: string
  nombre: string
  emoji_marca: string | null
}

const DURACIONES = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
]

export function NuevaGrabacionForm({ marcas }: { marcas: MarcaOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState(marcas[0]?.slug ?? '')
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [hora, setHora] = useState('10:00')
  const [duracion, setDuracion] = useState(60)
  const [descripcion, setDescripcion] = useState('')
  const [esMeet, setEsMeet] = useState(false)
  const [invitados, setInvitados] = useState('')
  const [isPending, startTransition] = useTransition()

  const marcaSeleccionada = marcas.find((m) => m.slug === slug)
  /* Título default — se calcula al render si el user no escribió uno.
     No lo guardamos en el state hasta que el user lo edite explícitamente
     para que al cambiar de marca el placeholder siga reflejando la marca. */
  const tituloDefault = marcaSeleccionada
    ? `Grabación – ${marcaSeleccionada.nombre}`
    : 'Grabación'

  function reset() {
    setTitulo('')
    setDescripcion('')
    setInvitados('')
    setEsMeet(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug || !fecha || !hora) {
      toast.error('Marca, fecha y hora son obligatorios')
      return
    }
    startTransition(async () => {
      const invitadosArr = esMeet
        ? invitados
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
        : []

      const result = await createGrabacion({
        marca_slug: slug,
        titulo: titulo.trim() || tituloDefault,
        fecha_planeada: fecha,
        hora_planeada: hora,
        duracion_min: duracion,
        descripcion: descripcion.trim() || null,
        es_reunion_meet: esMeet,
        invitados_emails: invitadosArr,
      })

      if (result.ok) {
        const msg = result.gcalSynced
          ? (esMeet ? 'Grabación creada + Meet en Google Calendar' : 'Grabación creada + evento en Google Calendar')
          : 'Grabación creada (Google Calendar no conectado)'
        toast.success(msg)
        if (result.meetLink) {
          toast.message('Link de Meet copiado al portapapeles', { description: result.meetLink })
          try { await navigator.clipboard.writeText(result.meetLink) } catch { /* ok */ }
        }
        reset()
        setOpen(false)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        + Nueva grabación
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 p-4 rounded-lg border space-y-3"
      style={{ maxWidth: 640 }}
    >
      {/* Marca + Título en una fila */}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Marca</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-9 w-full px-2 rounded-md border bg-background text-sm"
          >
            {marcas.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.emoji_marca ?? '📊'} {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Título del evento</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={tituloDefault}
            className="h-9 w-full px-2 rounded-md border bg-background text-sm"
          />
        </div>
      </div>

      {/* Fecha + Hora + Duración */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-9 w-full px-2 rounded-md border bg-background text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Hora inicio</label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            step={300}
            className="h-9 w-full px-2 rounded-md border bg-background text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Duración</label>
          <select
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
            className="h-9 w-full px-2 rounded-md border bg-background text-sm"
          >
            {DURACIONES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Descripción / Notas</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. 10 videos para mayo, traer el guion impreso, etc."
          rows={2}
          className="w-full px-2 py-1.5 rounded-md border bg-background text-sm"
        />
      </div>

      {/* Checkbox reunión Meet */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={esMeet}
          onChange={(e) => setEsMeet(e.target.checked)}
          className="h-4 w-4 cursor-pointer"
        />
        <span className="text-sm">📹 Es reunión con <strong>Google Meet</strong> (invitar emails)</span>
      </label>

      {/* Invitados — solo si es Meet */}
      {esMeet && (
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Emails de invitados</label>
          <textarea
            value={invitados}
            onChange={(e) => setInvitados(e.target.value)}
            placeholder="cliente@empresa.com, otro@empresa.com"
            rows={2}
            className="w-full px-2 py-1.5 rounded-md border bg-background text-sm"
          />
          <div className="text-[10.5px] text-muted-foreground mt-1">
            Separa con comas o espacios. Google les manda invitación automática.
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Creando…' : (esMeet ? 'Crear con Meet' : 'Crear evento')}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); reset() }}
          className="h-9 px-3 rounded-md border text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
