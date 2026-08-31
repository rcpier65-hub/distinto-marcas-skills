'use client'

/* Panel de activación del módulo Influencers POR MARCA (solo directores).
   Chips con toggle: activar una marca hace que Influencers aparezca en su
   sidebar y en las pestañas de /influencers. Pedro 31-ago-2026. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Settings2, Loader2 } from 'lucide-react'
import { toggleInfluencersMarca } from '../_actions'

type MarcaFlag = { slug: string; nombre: string; emoji: string | null; activo: boolean }

export function MarcasInfluencersAdmin({ marcas }: { marcas: MarcaFlag[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(marcas.map((m) => [m.slug, m.activo])),
  )
  const [cargando, setCargando] = useState<string | null>(null)

  async function toggle(m: MarcaFlag) {
    if (cargando) return
    const nuevo = !flags[m.slug]
    setCargando(m.slug)
    const r = await toggleInfluencersMarca(m.slug, nuevo)
    setCargando(null)
    if (!r.ok) { toast.error(r.error); return }
    setFlags((cur) => ({ ...cur, [m.slug]: nuevo }))
    toast.success(nuevo
      ? `✅ Influencers activado para ${m.nombre}`
      : `Influencers desactivado para ${m.nombre}`)
    router.refresh()
  }

  return (
    <section className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #f1f1f3' }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-2 text-[13px] font-medium"
        style={{ color: '#6b7280' }}
      >
        <Settings2 className="w-4 h-4" />
        Marcas con Influencers ({marcas.filter((m) => flags[m.slug]).length}) {abierto ? '▴' : '▾'}
      </button>

      {abierto && (
        <>
          <p className="mt-2 text-[12px]" style={{ color: '#9ca3af' }}>
            Activa el módulo solo en las marcas que trabajan con influencers — únicamente esas lo ven en su menú.
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {marcas.map((m) => {
              const on = flags[m.slug]
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => toggle(m)}
                  disabled={cargando !== null}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium disabled:opacity-60"
                  style={on
                    ? { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d' }
                    : { background: '#f9fafb', border: '1px solid #e5e7eb', color: '#9ca3af' }}
                  title={on ? 'Desactivar Influencers para esta marca' : 'Activar Influencers para esta marca'}
                >
                  {cargando === m.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>{on ? '●' : '○'}</span>}
                  {m.emoji} {m.nombre}
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
