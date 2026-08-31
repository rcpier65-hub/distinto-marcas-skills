// app/app/dashboard/_components/marca-card.tsx
// Tarjeta de marca con toggle Activa/Inactiva. "Pedir grilla" navega a /grilla/[slug].
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Power, Plus, ListTodo } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarcaLogo } from '@/components/marca-logo'
import { toggleMarcaActiva } from '../_actions'
import { crearTareaEnMarca } from '@/app/tareas/_actions'
import { sincronizarPublicacionesGcal } from '../_gcal-actions'

export type MarcaCardData = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
  activa: boolean
  /* Publicaciones sincronizadas con Google Calendar (marcas.sync_pubs_gcal).
     Opcional: columna self-healing, puede no existir aún. */
  sync_pubs_gcal?: boolean | null
}

/* Tarea rápida pendiente de esta marca (NO publicaciones). */
export type TareaMarca = {
  id: string
  texto: string
  persona: string | null   // dueño/asignado
  creador: string | null   // quién la creó
}

export function MarcaCard({
  marca,
  tareas = [],
  mostrarTareas = false,
}: {
  marca: MarcaCardData
  tareas?: TareaMarca[]
  mostrarTareas?: boolean
}) {
  const [activa, setActiva] = useState(marca.activa)
  const [syncPubs, setSyncPubs] = useState(false)
  const [sincronizada, setSincronizada] = useState(!!marca.sync_pubs_gcal)

  async function sincronizarGcal() {
    if (syncPubs) return
    setSyncPubs(true)
    const r = await sincronizarPublicacionesGcal(marca.slug)
    setSyncPubs(false)
    if (!r.ok) { toast.error(r.error, { duration: 8000 }); return }
    setSincronizada(true)
    const partes = [
      r.creadas > 0 ? `${r.creadas} eventos creados` : null,
      r.actualizadas > 0 ? `${r.actualizadas} actualizados` : null,
      r.fallidas > 0 ? `⚠ ${r.fallidas} fallaron` : null,
    ].filter(Boolean).join(' · ')
    toast.success(
      r.total === 0
        ? `${marca.nombre}: sin publicaciones con fecha de esta semana en adelante.`
        : `📆 ${marca.nombre}: ${partes || 'todo al día'} — el cliente recibe la invitación de cada publicación (6–8 pm).`,
      { duration: 7000 },
    )
  }
  const [pending, startTransition] = useTransition()

  /* "+ Tarea": crea una tarea rápida ya asociada a esta marca. Se sincroniza
     sola con /tareas (es una fila normal de `tareas`). */
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [creando, setCreando] = useState(false)
  const [locales, setLocales] = useState<TareaMarca[]>([])
  const lista = [...locales, ...tareas]

  async function agregarTarea() {
    const t = texto.trim()
    if (!t || creando) return
    setCreando(true)
    const r = await crearTareaEnMarca(marca.slug, t)
    setCreando(false)
    if (r.ok) {
      setLocales((c) => [{ id: r.tarea.id, texto: r.tarea.texto, persona: r.tarea.teamMemberNombre, creador: r.tarea.teamMemberNombre }, ...c])
      setTexto('')
      setAbierto(false)
      toast.success(`✅ Tarea agregada a ${marca.nombre} — ya está en Tareas`)
    } else {
      toast.error(r.error)
    }
  }

  function toggle() {
    const next = !activa
    setActiva(next) // optimista
    startTransition(async () => {
      const r = await toggleMarcaActiva(marca.slug, next)
      if (!r.ok) {
        setActiva(!next) // revertir
        toast.error(r.error)
      } else {
        toast.success(next ? `✅ ${marca.nombre} activada` : `${marca.nombre} desactivada (oculta del menú)`)
      }
    })
  }

  return (
    <Card className={`transition-all ${activa ? 'hover:shadow-md' : 'opacity-60'}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <CardTitle className="flex items-center gap-3 min-w-0 flex-1">
            <MarcaLogo slug={marca.slug} nombre={marca.nombre} emoji={marca.emoji_marca} size={44} />
            <span className="text-base truncate min-w-0">{marca.nombre}</span>
          </CardTitle>
          {/* Toggle activa / inactiva */}
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            title={activa ? 'Desactivar marca (se oculta del menú y selectores)' : 'Activar marca'}
            className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
              activa
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {activa ? 'Activa' : 'Inactiva'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {marca.slug}
          </Badge>
        </div>

        {marca.color_primario_hex && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: marca.color_primario_hex }}
            />
            <code className="text-xs text-muted-foreground">{marca.color_primario_hex}</code>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/grilla/${marca.slug}`}
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3"
          >
            🟢 Pedir grilla
          </Link>
          <Link
            href={`/publicaciones?marca=${marca.slug}`}
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium border bg-background hover:bg-muted h-10 px-3"
          >
            📋 Publicaciones
          </Link>
        </div>

        {/* Sincronizar publicaciones → Google Calendar (evento 6–8 pm por
            publicación, invitando al cliente). Pedro 31-ago-2026: "clientes
            quieren que sus publicaciones también se pongan en su calendario". */}
        <button
          type="button"
          onClick={sincronizarGcal}
          disabled={syncPubs}
          title="Manda las publicaciones (de esta semana en adelante) al Google Calendar como eventos de 6 a 8 pm, invitando al cliente con sus correos. Re-tócalo cuando cambien fechas."
          className={`w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border transition-colors disabled:opacity-60 ${
            sincronizada
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {syncPubs ? '⏳ Sincronizando…' : sincronizada ? '📆 Calendario sincronizado · re-sincronizar' : '📆 Sincronizar publicaciones al calendario'}
        </button>

        {/* ===== Tareas rápidas de esta marca (NO publicaciones) ===== */}
        <div className="pt-1 space-y-2">
          {!abierto ? (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              title={`Agregar una tarea rápida a ${marca.nombre} (aparece en Tareas)`}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tarea
              {lista.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {lista.length}
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); agregarTarea() }
                  if (e.key === 'Escape') { setAbierto(false); setTexto('') }
                }}
                placeholder={`Tarea para ${marca.nombre}…`}
                disabled={creando}
                className="flex-1 h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={agregarTarea}
                disabled={!texto.trim() || creando}
                className="h-8 px-2.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {creando ? '…' : 'Añadir'}
              </button>
              <button
                type="button"
                onClick={() => { setAbierto(false); setTexto('') }}
                className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>
          )}

          {/* Lista de pendientes — solo si el toggle "Tareas por marca" está activo */}
          {mostrarTareas && (
            lista.length > 0 ? (
              <ul className="space-y-1">
                {lista.map((t) => (
                  <li key={t.id} className="flex items-start gap-1.5 text-xs rounded-md bg-muted/50 px-2 py-1.5">
                    <ListTodo className="w-3.5 h-3.5 shrink-0 mt-[1px] text-muted-foreground" />
                    <span className="flex-1 min-w-0 break-words">{t.texto}</span>
                    {t.persona && (
                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-background border border-border rounded px-1.5 py-[1px]">
                        {t.persona}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Sin tareas pendientes.</p>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
