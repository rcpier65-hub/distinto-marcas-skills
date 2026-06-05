// app/app/comentarios/_components/comentario-row.tsx
//
// 1 fila editable inline. Estado local de seleccionado/respuesta_editada/categoria
// se controla desde el padre vía callbacks (controlled component).
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
  onResponder: () => void
  responding?: boolean
}

/**
 * Badge visual de plataforma. Rosa = IG, azul = FB, negro = TT.
 * Mucho más claro que un emoji solo (un 👍 se confunde con "like").
 * Tailwind clases inline para que cada caso sea estático y purgable.
 */
const NETWORK_BADGE: Record<string, { label: string; classes: string }> = {
  instagram: {
    label: 'IG',
    classes: 'bg-pink-500/15 text-pink-700 border-pink-500/30',
  },
  facebook: {
    label: 'FB',
    classes: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
  tiktok: {
    label: 'TT',
    classes: 'bg-zinc-900/10 text-zinc-900 border-zinc-900/30 dark:bg-white/10 dark:text-white dark:border-white/30',
  },
}

export function ComentarioRow({
  row,
  selected,
  textoEditado,
  categoriaEditada,
  onToggleSelect,
  onChangeTexto,
  onChangeCategoria,
  onSkip,
  onResponder,
  responding = false,
}: Props) {
  const fechaCorta = new Date(row.comment_created_at).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <tr className={`border-b border-border ${selected ? 'bg-primary/5' : 'hover:bg-muted/30'} transition-colors`}>
      {/* Checkbox */}
      <td className="py-3 px-2 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-4 h-4 cursor-pointer mt-1"
        />
      </td>

      {/* Comentario + autor + contexto del post */}
      <td className="py-3 px-2 align-top max-w-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {(() => {
              const badge = NETWORK_BADGE[row.network]
              if (!badge) {
                return <span className="text-base">💬</span>
              }
              return (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`}
                  title={row.network}
                >
                  {badge.label}
                </span>
              )
            })()}
            {/* Avatar de FB si existe — micro pero ayuda a humanizar */}
            {row.author_avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.author_avatar_url}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            {/* Nombre humano si existe (FB), sino fallback al @username (IG) */}
            {row.author_display_name ? (
              <>
                <span className="font-semibold">{row.author_display_name}</span>
                {/* En FB el username es solo dígitos — lo escondemos. En IG sí mostrarlo */}
                {row.author_username && !/^\d+$/.test(row.author_username) && (
                  <span className="text-muted-foreground text-[10px]">@{row.author_username}</span>
                )}
              </>
            ) : (
              <span className="font-semibold">@{row.author_username}</span>
            )}
            <span className="text-muted-foreground">· {fechaCorta}</span>
            {row.post_link && (
              <a
                href={row.post_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-[10px]"
              >
                ↗ ver post
              </a>
            )}
          </div>

          <div className="text-sm leading-snug">{row.comment_text}</div>

          {/* Post context preview */}
          {row.post_text_preview && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded bg-muted/40 border border-border/50">
              {row.post_media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.post_media_url}
                  alt="post"
                  className="w-12 h-12 object-cover rounded shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
              <div className="text-[10px] text-muted-foreground line-clamp-2">
                {row.post_text_preview}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Categoría — dropdown editable */}
      <td className="py-3 px-2 align-top">
        <select
          value={categoriaEditada}
          onChange={(e) => onChangeCategoria(e.target.value as ComentarioCategoria)}
          className="h-8 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderLeftColor: CATEGORIA_LABEL[categoriaEditada].color, borderLeftWidth: '3px' }}
        >
          {(Object.keys(CATEGORIA_LABEL) as ComentarioCategoria[]).map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIA_LABEL[cat].emoji} {CATEGORIA_LABEL[cat].label}
            </option>
          ))}
        </select>
        {/* Marcar como leído — para comentarios que NO se responden pero se sacan de pendientes */}
        <button
          type="button"
          onClick={onSkip}
          disabled={responding}
          className="mt-2 w-full h-8 px-2 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Marcar como leído — no se responde, se saca de pendientes"
        >
          ✓ Marcar como leído
        </button>
      </td>

      {/* Respuesta editable */}
      <td className="py-3 px-2 align-top">
        <textarea
          value={textoEditado}
          onChange={(e) => onChangeTexto(e.target.value)}
          placeholder="Escribí la respuesta…"
          rows={3}
          className="w-full min-w-[280px] px-2 py-1.5 rounded-md border bg-background text-xs leading-snug focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
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
      </td>

      {/* Acción: responder este comentario individual → pasa a 'respondido' */}
      <td className="py-3 px-2 align-top">
        <button
          onClick={onResponder}
          disabled={responding || !textoEditado.trim()}
          className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
          title={!textoEditado.trim() ? 'Escribe una respuesta primero' : 'Responder este comentario en Metricool (pasa a respondido)'}
        >
          {responding ? '⏳' : '📤 Responder'}
        </button>
      </td>
    </tr>
  )
}
