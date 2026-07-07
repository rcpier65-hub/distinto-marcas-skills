// app/app/comentarios/_components/comentario-row.tsx
//
// Fila editable de comentario. 2 presentaciones que comparten contenido:
//   - ComentarioRow  → <tr> para la tabla en DESKTOP
//   - ComentarioCard → tarjeta apilada para MOBILE (sin scroll horizontal)
// Estado (seleccionado/texto/categoría) se controla desde el padre vía callbacks.
'use client'

import type { ComentarioInboxRow, ComentarioCategoria } from '@/lib/types/database'
import { CATEGORIA_LABEL } from '@/lib/comentarios/clasificador'

type Props = {
  row: ComentarioInboxRow
  selected: boolean
  textoEditado: string
  categoriaEditada: ComentarioCategoria
  onToggleSelect: () => void
  onChangeTexto: (text: string) => void
  onChangeCategoria: (cat: ComentarioCategoria) => void
  onSkip: () => void
  onEliminar: () => void
  onResponder: () => void
  responding?: boolean
  eliminando?: boolean
}

/**
 * Badge visual de plataforma. Rosa = IG, azul = FB, negro = TT.
 * Clases inline estáticas para que sean purgables por Tailwind.
 */
const NETWORK_BADGE: Record<string, { label: string; classes: string }> = {
  instagram: { label: 'IG', classes: 'bg-pink-500/15 text-pink-700 border-pink-500/30' },
  facebook: { label: 'FB', classes: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  tiktok: { label: 'TT', classes: 'bg-zinc-900/10 text-zinc-900 border-zinc-900/30 dark:bg-white/10 dark:text-white dark:border-white/30' },
}

/* ── Bloques compartidos ─────────────────────────────────────── */

function CommentMeta({ row }: { row: ComentarioInboxRow }) {
  const fechaCorta = new Date(row.comment_created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
  const badge = NETWORK_BADGE[row.network]
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {badge ? (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`} title={row.network}>
          {badge.label}
        </span>
      ) : (
        <span className="text-base">💬</span>
      )}
      {row.author_avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.author_avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      {row.author_display_name ? (
        <>
          <span className="font-semibold">{row.author_display_name}</span>
          {row.author_username && !/^\d+$/.test(row.author_username) && (
            <span className="text-muted-foreground text-[10px]">@{row.author_username}</span>
          )}
        </>
      ) : (
        <span className="font-semibold">@{row.author_username}</span>
      )}
      <span className="text-muted-foreground">· {fechaCorta}</span>
      {row.post_link && (
        <a href={row.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[10px]">
          ↗ ver post
        </a>
      )}
    </div>
  )
}

function PostContext({ row }: { row: ComentarioInboxRow }) {
  if (!row.post_text_preview) return null
  return (
    <div className="flex items-start gap-2 mt-2 p-2 rounded bg-muted/40 border border-border/50">
      {row.post_media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.post_media_url} alt="post" className="w-12 h-12 object-cover rounded shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      <div className="text-[10px] text-muted-foreground line-clamp-2">{row.post_text_preview}</div>
    </div>
  )
}

function CategoriaSelect({
  categoriaEditada, onChangeCategoria, className = '',
}: { categoriaEditada: ComentarioCategoria; onChangeCategoria: (c: ComentarioCategoria) => void; className?: string }) {
  return (
    <select
      value={categoriaEditada}
      onChange={(e) => onChangeCategoria(e.target.value as ComentarioCategoria)}
      className={`h-8 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      style={{ borderLeftColor: CATEGORIA_LABEL[categoriaEditada].color, borderLeftWidth: '3px' }}
    >
      {(Object.keys(CATEGORIA_LABEL) as ComentarioCategoria[]).map((cat) => (
        <option key={cat} value={cat}>{CATEGORIA_LABEL[cat].emoji} {CATEGORIA_LABEL[cat].label}</option>
      ))}
    </select>
  )
}

function CharCount({ row, textoEditado, onChangeTexto }: Pick<Props, 'row' | 'textoEditado' | 'onChangeTexto'>) {
  return (
    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
      <span>{textoEditado.length} caracteres</span>
      {row.respuesta_sugerida && textoEditado !== row.respuesta_sugerida && (
        <button
          type="button"
          onClick={() => onChangeTexto(row.respuesta_sugerida ?? '')}
          className="text-primary hover:underline"
          title="Volver al texto original sugerido por IA (perdés tus ediciones)"
        >
          ↶ revertir a sugerencia
        </button>
      )}
    </div>
  )
}

/* ── DESKTOP: fila de tabla ──────────────────────────────────── */

export function ComentarioRow({
  row, selected, textoEditado, categoriaEditada,
  onToggleSelect, onChangeTexto, onChangeCategoria, onSkip, onEliminar, onResponder,
  responding = false, eliminando = false,
}: Props) {
  return (
    <tr className={`border-b border-border ${selected ? 'bg-primary/5' : 'hover:bg-muted/30'} transition-colors`}>
      <td className="py-3 px-2 align-top">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-4 h-4 cursor-pointer mt-1" />
      </td>
      <td className="py-3 px-2 align-top max-w-md">
        <div className="space-y-1.5">
          <CommentMeta row={row} />
          <div className="text-sm leading-snug">{row.comment_text}</div>
          <PostContext row={row} />
        </div>
      </td>
      <td className="py-3 px-2 align-top">
        <CategoriaSelect categoriaEditada={categoriaEditada} onChangeCategoria={onChangeCategoria} />
        <button
          type="button" onClick={onSkip} disabled={responding || eliminando}
          className="mt-2 w-full h-8 px-2 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Marcar como leído — no se responde, se saca de pendientes"
        >
          ✓ Marcar como leído
        </button>
        <button
          type="button" onClick={onEliminar} disabled={responding || eliminando}
          className="mt-2 w-full h-8 px-2 text-xs rounded-md border border-red-500/30 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
          title="Eliminar — borra el comentario de la red (FB/IG/TikTok) y lo saca del inbox. No se puede deshacer."
        >
          {eliminando ? '⏳ Eliminando…' : '🗑️ Eliminar'}
        </button>
      </td>
      <td className="py-3 px-2 align-top">
        <textarea
          value={textoEditado} onChange={(e) => onChangeTexto(e.target.value)}
          placeholder="Escribí la respuesta…" rows={3}
          className="w-full min-w-[280px] px-2 py-1.5 rounded-md border bg-background text-xs leading-snug focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <CharCount row={row} textoEditado={textoEditado} onChangeTexto={onChangeTexto} />
      </td>
      <td className="py-3 px-2 align-top">
        <button
          onClick={onResponder} disabled={responding || !textoEditado.trim()}
          className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
          title={!textoEditado.trim() ? 'Escribe una respuesta primero' : 'Responder este comentario en Metricool (pasa a respondido)'}
        >
          {responding ? '⏳' : '📤 Responder'}
        </button>
      </td>
    </tr>
  )
}

/* ── MOBILE: tarjeta apilada (sin scroll horizontal) ─────────── */

export function ComentarioCard({
  row, selected, textoEditado, categoriaEditada,
  onToggleSelect, onChangeTexto, onChangeCategoria, onSkip, onEliminar, onResponder,
  responding = false, eliminando = false,
}: Props) {
  return (
    <div className={`rounded-xl border bg-card p-3 space-y-2.5 ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}>
      {/* Cabecera: checkbox + autor/meta */}
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-4 h-4 cursor-pointer mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <CommentMeta row={row} />
        </div>
      </div>

      {/* Comentario del cliente */}
      <div className="text-sm leading-snug break-words">{row.comment_text}</div>
      <PostContext row={row} />

      {/* Categoría */}
      <CategoriaSelect categoriaEditada={categoriaEditada} onChangeCategoria={onChangeCategoria} className="w-full" />

      {/* Respuesta editable — ancho completo, SIN min-width (eso causaba el scroll) */}
      <div>
        <textarea
          value={textoEditado} onChange={(e) => onChangeTexto(e.target.value)}
          placeholder="Escribe la respuesta…" rows={3}
          className="w-full px-2.5 py-2 rounded-md border bg-background text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <CharCount row={row} textoEditado={textoEditado} onChangeTexto={onChangeTexto} />
      </div>

      {/* Acciones: Responder (principal) + leído + eliminar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResponder} disabled={responding || eliminando || !textoEditado.trim()}
          className="flex-1 h-10 px-3 text-sm rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {responding ? '⏳ Enviando…' : '📤 Responder'}
        </button>
        <button
          type="button" onClick={onSkip} disabled={responding || eliminando}
          className="h-10 px-3 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
          title="Marcar como leído — se saca de pendientes sin responder"
        >
          ✓
        </button>
        <button
          type="button" onClick={onEliminar} disabled={responding || eliminando}
          className="h-10 px-3 text-sm rounded-md border border-red-500/30 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
          title="Eliminar — borra el comentario de la red y lo saca del inbox"
        >
          {eliminando ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  )
}
