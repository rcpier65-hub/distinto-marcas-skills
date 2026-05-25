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
}

const NETWORK_EMOJI: Record<string, string> = {
  instagram: '📷',
  facebook: '👍',
  tiktok: '🎵',
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
            <span className="text-base">{NETWORK_EMOJI[row.network] ?? '💬'}</span>
            <span className="font-semibold">@{row.author_username}</span>
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
            >
              ↶ usar sugerencia
            </button>
          )}
        </div>
      </td>

      {/* Acción: skip */}
      <td className="py-3 px-2 align-top">
        <button
          onClick={onSkip}
          className="h-8 px-2 text-xs rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
          title="Marcar como skip (no responder)"
        >
          ⏭
        </button>
      </td>
    </tr>
  )
}
