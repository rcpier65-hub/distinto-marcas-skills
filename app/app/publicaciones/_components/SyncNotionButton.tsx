// app/app/publicaciones/_components/SyncNotionButton.tsx
//
// Botón "🔄 Sincronizar todo con Notion" — vive en /publicaciones/page.tsx.
// Llama al server action sincronizarTodoNotion() y muestra un resumen
// inline (no Toast porque /publicaciones no tiene provider de toasts
// aún — si se agrega global, refactorizar).

'use client'

import { useState, useTransition } from 'react'
import { sincronizarTodoNotion } from '../_actions'

type Totals = {
  fetched: number
  inserted: number
  updated: number
  failed: number
  ok: number
  skipped: number
  errored: number
}

type Estado =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'success'; totals: Totals; duration_ms: number }
  | { kind: 'error'; message: string }

export function SyncNotionButton() {
  const [estado, setEstado] = useState<Estado>({ kind: 'idle' })
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setEstado({ kind: 'syncing' })
    startTransition(async () => {
      const r = await sincronizarTodoNotion()
      if (r.ok) {
        setEstado({ kind: 'success', totals: r.totals, duration_ms: r.duration_ms })
      } else {
        setEstado({ kind: 'error', message: r.error })
      }
    })
  }

  const loading = isPending || estado.kind === 'syncing'

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        title="Trae todas las publicaciones de Notion (mayo + junio 2026) y sobrescribe las del sistema"
      >
        {loading ? (
          <>
            <SpinnerIcon className="size-4 animate-spin" />
            <span>Sincronizando…</span>
          </>
        ) : (
          <>
            <span>🔄</span>
            <span>Sincronizar todo con Notion</span>
          </>
        )}
      </button>

      {estado.kind === 'success' && (
        <span className="text-xs text-muted-foreground">
          ✅ +{estado.totals.inserted} nuevas · ↑{estado.totals.updated} actualizadas
          {estado.totals.skipped > 0 && ` · ⊘${estado.totals.skipped} saltadas`}
          {estado.totals.failed > 0 && ` · ❌${estado.totals.failed} fallos`}
          {` (${Math.round(estado.duration_ms / 1000)}s)`}
        </span>
      )}

      {estado.kind === 'error' && (
        <span className="text-xs text-destructive">❌ {estado.message}</span>
      )}
    </div>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 60"
        opacity="0.85"
      />
    </svg>
  )
}
