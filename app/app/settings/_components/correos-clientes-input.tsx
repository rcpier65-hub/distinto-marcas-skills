'use client'

/* CorreosClientesInput — editor de correos de cliente por marca.
 *
 * Lista visual con chip por correo + input para agregar nuevos.
 * Se usa para auto-llenar invitados al crear reuniones de revisión
 * desde el módulo /diseno. Cada marca tiene su propia lista.
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMarcaCorreosClientes } from '../_actions'

type Props = {
  slug: string
  initialCorreos: string[]
}

export function CorreosClientesInput({ slug, initialCorreos }: Props) {
  const [correos, setCorreos] = useState<string[]>(initialCorreos)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()

  function persist(next: string[]) {
    startTransition(async () => {
      const r = await updateMarcaCorreosClientes(slug, next)
      if (r.ok) {
        setCorreos(r.correos)
        toast.success(`✓ ${r.correos.length} correo${r.correos.length === 1 ? '' : 's'} guardado${r.correos.length === 1 ? '' : 's'}`, { duration: 1500 })
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  function addFromDraft() {
    const trimmed = draft.trim()
    if (!trimmed) return
    /* Soporta múltiples emails pegados separados por coma/salto */
    const newOnes = trimmed
      .split(/[,;\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    if (newOnes.length === 0) {
      toast.error('Email inválido')
      return
    }
    const merged = Array.from(new Set([...correos, ...newOnes]))
    setDraft('')
    persist(merged)
  }

  function remove(email: string) {
    persist(correos.filter((c) => c !== email))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Lista de chips */}
      {correos.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {correos.map((email) => (
            <span
              key={email}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 8px 4px 10px',
                background: 'rgba(167, 139, 250, 0.08)',
                border: '1px solid rgba(167, 139, 250, 0.20)',
                borderRadius: 999,
                fontSize: 12, color: 'var(--mk-text-primary)',
                fontFamily: 'var(--font-geist-mono, monospace)',
              }}
            >
              <span>📧 {email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                disabled={isPending}
                title="Quitar"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--mk-text-tertiary)',
                  cursor: 'pointer', padding: '0 2px',
                  fontSize: 14, lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--mk-text-quaternary)', fontStyle: 'italic', margin: 0 }}>
          Sin correos. Agrega los emails de los clientes de esta marca.
        </p>
      )}

      {/* Input para agregar */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addFromDraft() }
          }}
          placeholder="cliente@empresa.com"
          style={{
            flex: 1, padding: '6px 10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--mk-border-subtle)',
            borderRadius: 'var(--mk-radius-md)',
            color: 'var(--mk-text-primary)',
            fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addFromDraft}
          disabled={isPending || !draft.trim()}
          style={{
            padding: '6px 14px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
            background: 'var(--mk-accent)', color: 'white',
            border: 'none', borderRadius: 'var(--mk-radius-md)',
            cursor: isPending || !draft.trim() ? 'not-allowed' : 'pointer',
            opacity: isPending || !draft.trim() ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          + Agregar
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', margin: 0 }}>
        💡 Tip: puedes pegar varios correos separados por coma.
        Estos correos se cargan automáticamente al crear una reunión
        de revisión en /diseno.
      </p>
    </div>
  )
}
