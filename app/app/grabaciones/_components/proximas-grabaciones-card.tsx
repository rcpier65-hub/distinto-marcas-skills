// app/app/grabaciones/_components/proximas-grabaciones-card.tsx
//
// Card "Próximas grabaciones (7 días)" — Pedro pidió un panel al
// estilo del aviso que tiene el editor en /inicio, pero embebido en
// /grabaciones. Lista compacta con marca + fecha + hora de las
// grabaciones planeadas en la próxima semana (rolling: desde hoy
// hasta hoy + 7 días).
'use client'

import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MarcaLogo } from '@/components/marca-logo'
import { formatHora12, sufijoAmPm } from '@/lib/utils/format-hora'

export type ProximaGrabacion = {
  id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  marca_color: string | null
  fecha: string           // YYYY-MM-DD
  hora: string | null     // HH:MM o null si all-day
  estado: string          // planeada / cumplida / cancelada
}

type Props = {
  grabaciones: ProximaGrabacion[]
  hoyIso: string
}

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_ABREV = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/* Devuelve "MAR 23 jun" para una fecha. */
function fechaPill(iso: string): { dia: string; numero: number; mes: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    dia: DIAS_ABREV[date.getDay()],
    numero: d,
    mes: MESES_ABREV[m - 1],
  }
}

/* "Hoy" / "Mañana" / "En 3 días" */
function distanciaTextual(iso: string, hoyIso: string): string | null {
  const [y1, m1, d1] = iso.split('-').map(Number)
  const [y2, m2, d2] = hoyIso.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1).getTime()
  const b = new Date(y2, m2 - 1, d2).getTime()
  const dias = Math.round((a - b) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return null
}

export function ProximasGrabacionesCard({ grabaciones, hoyIso }: Props) {
  const total = grabaciones.length

  return (
    <Card className="hover:shadow-md transition-shadow border-[#ba41f7]/20 bg-gradient-to-br from-[#ba41f7]/5 to-pink-50/40">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#ba41f7]/15 text-[#ba41f7] flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight">Próximas grabaciones</h3>
            <p className="text-[10.5px] text-muted-foreground">
              Próximos 7 días · <strong className="text-foreground">{total}</strong> agendada{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Lista */}
        {grabaciones.length === 0 ? (
          <div className="text-center py-6 px-2">
            <div className="text-3xl mb-2" aria-hidden>🌤️</div>
            <p className="text-[12px] font-medium text-foreground">Semana tranquila</p>
            <p className="text-[10.5px] text-muted-foreground mt-1">
              Sin grabaciones planeadas en los próximos 7 días
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 pt-1 border-t border-border/60">
            {grabaciones.map((g) => {
              const f = fechaPill(g.fecha)
              const distancia = distanciaTextual(g.fecha, hoyIso)
              const color = g.marca_color ?? '#737373'
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-white/60 transition-colors"
                >
                  {/* Mini-pill fecha (3 líneas: día, número, mes) */}
                  <div
                    className="flex flex-col items-center justify-center w-10 h-11 rounded-md shrink-0 shadow-sm"
                    style={{ background: `${color}18`, border: `1px solid ${color}40` }}
                    title={f.dia + ' ' + f.numero + ' ' + f.mes}
                  >
                    <span className="text-[8.5px] uppercase font-bold leading-none" style={{ color }}>{f.dia}</span>
                    <span className="text-[14px] font-bold leading-none mt-0.5" style={{ color }}>{f.numero}</span>
                    <span className="text-[7.5px] uppercase leading-none mt-0.5" style={{ color }}>{f.mes}</span>
                  </div>
                  {/* Marca + hora */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <MarcaLogo
                      slug={g.marca_slug}
                      nombre={g.marca_nombre}
                      emoji={g.marca_emoji}
                      size={20}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-medium truncate leading-tight">{g.marca_nombre}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {g.hora
                          ? <>{formatHora12(g.hora)} <span className="opacity-70">{sufijoAmPm(g.hora)}</span></>
                          : 'Sin hora'}
                        {distancia && <span className="text-[#ba41f7] font-semibold"> · {distancia}</span>}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
