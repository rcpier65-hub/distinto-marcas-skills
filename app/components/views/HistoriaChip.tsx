'use client'
import { useRouter } from 'next/navigation'

export type HistoriaCal = {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  plataformas: string[]
  estado: string
  marcaNombre: string
  marcaSlug: string
  color: string
}

/** Compact one-line chip for Publicaciones calendar (Ailyn/Lorena shared stories). */
export function HistoriaChip({ h }: { h: HistoriaCal }) {
  const router = useRouter()
  const plats = (h.plataformas ?? []).map((p) => p.slice(0, 2).toUpperCase()).join('/')
  return (
    <button
      type="button"
      title={`${h.marcaNombre}: ${h.titulo}`}
      onClick={(e) => { e.stopPropagation(); router.push('/historias') }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, width: '100%',
        height: 18, padding: '0 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
        background: 'rgba(236,72,153,0.12)', color: '#db2777',
        fontSize: 10, fontWeight: 700, fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      <span style={{ opacity: 0.9 }}>◐</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.titulo}</span>
      {plats ? <span style={{ opacity: 0.7, fontSize: 9 }}>{plats}</span> : null}
    </button>
  )
}
