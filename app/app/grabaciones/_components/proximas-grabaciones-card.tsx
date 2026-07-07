// app/app/grabaciones/_components/proximas-grabaciones-card.tsx
//
// Panel glass full-width "Próximas grabaciones (7 días)". Pedro pidió
// que sea LO PRIMERO de la página y con estilo glassmorphism. Lista en
// grid horizontal (usa todo el ancho) las grabaciones planeadas de la
// próxima semana, con pill de fecha tintado del color de la marca.
'use client'

import { CalendarClock } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { formatHora12 } from '@/lib/utils/format-hora'

export type ProximaGrabacion = {
  id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  marca_color: string | null
  fecha: string           // YYYY-MM-DD
  hora: string | null     // HH:MM o null si all-day
  estado: string
}

type Props = {
  grabaciones: ProximaGrabacion[]
  hoyIso: string
}

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_ABREV = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function fechaPill(iso: string): { dia: string; numero: number; mes: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { dia: DIAS_ABREV[date.getDay()], numero: d, mes: MESES_ABREV[m - 1] }
}

/* Diferencia en días entre iso y hoyIso (ambos YYYY-MM-DD) → etiqueta. */
function distanciaTextual(iso: string, hoyIso: string): string | null {
  const [y1, m1, d1] = iso.split('-').map(Number)
  const [y2, m2, d2] = hoyIso.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1).getTime()
  const b = new Date(y2, m2 - 1, d2).getTime()
  const dias = Math.round((a - b) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias > 1) return `En ${dias} días`
  return null
}

export function ProximasGrabacionesCard({ grabaciones, hoyIso }: Props) {
  const total = grabaciones.length
  /* Pedro: "pon seis grabaciones para que no quede vacío". Máx 6 ítems
     (= 2 filas limpias en grid de 3 columnas). El resto se resume en
     un "+N más" para no ocupar demasiado alto. */
  const MAX = 6
  const visibles = grabaciones.slice(0, MAX)
  const restantes = total - visibles.length

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/60 ring-1 ring-black/[0.04] shadow-[0_8px_40px_-12px_rgba(186,65,247,0.18)]"
      style={{
        background:
          'linear-gradient(135deg, rgba(186,65,247,0.10) 0%, rgba(244,114,182,0.07) 45%, rgba(255,255,255,0.55) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Glow decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(186,65,247,0.35), transparent 70%)' }}
      />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-white/70 ring-1 ring-[#ba41f7]/25 text-[#ba41f7] flex items-center justify-center shrink-0 shadow-sm">
            <CalendarClock className="w-5.5 h-5.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[17px] tracking-tight leading-tight">Próximas grabaciones</h2>
            <p className="text-[12px] text-muted-foreground">
              Lo que viene ·{' '}
              <strong className="text-foreground">{total}</strong> agendada{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Contenido */}
        {grabaciones.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="text-4xl mb-2" aria-hidden>🌤️</div>
            <p className="text-[13px] font-semibold text-foreground">Todo despejado</p>
            <p className="text-[11.5px] text-muted-foreground mt-1">
              No hay grabaciones planeadas por venir
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {visibles.map((g) => {
              const f = fechaPill(g.fecha)
              const distancia = distanciaTextual(g.fecha, hoyIso)
              const color = g.marca_color ?? '#737373'
              const esHoy = distancia === 'Hoy'
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/65 ring-1 ring-black/[0.05] hover:bg-white/90 hover:ring-black/10 transition-all shadow-sm"
                >
                  {/* Pill fecha (día / número / mes) tintado del color de marca */}
                  <div
                    className="flex flex-col items-center justify-center w-12 h-13 py-1.5 rounded-xl shrink-0"
                    style={{ background: `${color}1a`, border: `1px solid ${color}44` }}
                  >
                    <span className="text-[8.5px] uppercase font-bold leading-none tracking-wide" style={{ color }}>{f.dia}</span>
                    <span className="text-[17px] font-extrabold leading-none mt-0.5" style={{ color }}>{f.numero}</span>
                    <span className="text-[7.5px] uppercase leading-none mt-0.5" style={{ color }}>{f.mes}</span>
                  </div>
                  {/* Marca + hora */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MarcaLogo slug={g.marca_slug} nombre={g.marca_nombre} emoji={g.marca_emoji} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate leading-tight">{g.marca_nombre}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {/* formatHora12 YA incluye AM/PM. Antes se le sumaba
                            sufijoAmPm() → salía "2:00 PM PM" (Pedro: "la hora
                            sale mal en algunas"). */}
                        {g.hora ? formatHora12(g.hora) : 'Sin hora'}
                      </p>
                    </div>
                    {distancia && (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                          esHoy ? 'bg-[#ba41f7] text-white' : 'bg-[#ba41f7]/12 text-[#ba41f7]'
                        }`}
                      >
                        {distancia}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {restantes > 0 && (
          <p className="text-[11px] text-muted-foreground mt-3 text-center font-medium">
            +{restantes} grabación{restantes === 1 ? '' : 'es'} más por venir
          </p>
        )}
      </div>
    </section>
  )
}
