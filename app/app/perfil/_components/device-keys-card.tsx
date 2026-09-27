'use client'

import { useState } from 'react'
import { hasOwnerScope } from '@/lib/api/device-key-scopes'
import { toast } from 'sonner'

export type DeviceKeyListItem = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
  scopes: string[]
}

type CreatedKey = DeviceKeyListItem & { token: string }

function formatWhen(value: string | null): string {
  if (!value) return 'Nunca'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nunca'
  return date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (typeof body.error === 'string' && body.error.length > 0) return body.error
  } catch {
    /* el body no era JSON */
  }
  return `Error ${res.status}`
}

export function DeviceKeysCard({
  initialKeys,
  initialError,
  canIssueOwner,
}: {
  initialKeys: DeviceKeyListItem[]
  initialError: string | null
  canIssueOwner: boolean
}) {
  const [keys, setKeys] = useState(initialKeys)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(initialError)
  const [name, setName] = useState('Kairos — MacBook')
  const [creating, setCreating] = useState(false)
  const [revealed, setRevealed] = useState<CreatedKey | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [upgradingId, setUpgradingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/v1/device-keys')
      if (!res.ok) {
        setLoadError(await readError(res))
        setKeys([])
        return
      }
      const body = (await res.json()) as { keys?: DeviceKeyListItem[] }
      setKeys(Array.isArray(body.keys) ? body.keys : [])
    } catch {
      setLoadError('No se pudieron cargar las claves')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/device-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        toast.error(await readError(res))
        return
      }
      const body = (await res.json()) as { key?: CreatedKey }
      if (!body.key?.token) {
        toast.error('La clave se creó pero no vino el token')
        await load()
        return
      }
      setLoadError(null)
      setRevealed(body.key)
      setKeys((current) => [body.key as DeviceKeyListItem, ...current.filter((k) => k.id !== body.key?.id)])
      toast.success('Clave creada. Copiala ahora: no se vuelve a mostrar.')
    } catch {
      toast.error('No se pudo crear la clave')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Clave copiada')
    } catch {
      toast.error('No se pudo copiar. Seleccionala a mano.')
    }
  }

  async function handleUpgrade(id: string) {
    if (upgradingId) return
    setUpgradingId(id)
    try {
      const res = await fetch(`/api/v1/device-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: ['owner'] }),
      })
      if (!res.ok) {
        toast.error(await readError(res))
        return
      }
      const body = (await res.json()) as { key?: DeviceKeyListItem }
      const scopes = body.key?.scopes ?? ['owner']
      setKeys((current) => current.map((key) => (key.id === id ? { ...key, scopes } : key)))
      toast.success('Clave ampliada. El token no cambió.')
    } catch {
      toast.error('No se pudo ampliar la clave')
    } finally {
      setUpgradingId(null)
    }
  }

  async function handleRevoke(id: string) {
    if (revokingId) return
    if (!window.confirm('¿Revocar esta clave? Kairos deja de poder usarla.')) return
    setRevokingId(id)
    try {
      const res = await fetch(`/api/v1/device-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(await readError(res))
        return
      }
      setKeys((current) => current.map((key) => (key.id === id ? { ...key, revoked: true } : key)))
      if (revealed?.id === id) setRevealed(null)
      toast.success('Clave revocada')
    } catch {
      toast.error('No se pudo revocar la clave')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section
      id="claves-kairos"
      style={{
        background: '#fff',
        border: '1px solid #f1f1f3',
        borderRadius: 16,
        padding: 28,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
          Kairos (macOS)
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>
          {canIssueOwner
            ? 'Una clave nueva de director u owner sale con acceso completo: Nay lee y escribe con el mismo alcance que tu sesión. Las claves viejas de solo tareas se amplían acá; el token no cambia.'
            : 'Crea una clave para que la app de la barra de menú lea tus tareas. El acceso completo lo emite un director u owner.'}
          {' '}Se muestra una sola vez. Puedes revocarla desde acá.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nombre
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Kairos — MacBook"
            style={fieldStyle}
          />
        </label>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || name.trim().length === 0}
          style={{
            ...primaryButton,
            opacity: creating || name.trim().length === 0 ? 0.55 : 1,
            cursor: creating || name.trim().length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Creando…' : 'Crear clave'}
        </button>
      </div>

      {revealed && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.45 }}>
            Copia esta clave ahora. Distinto no la vuelve a mostrar. Pégala en Kairos como token.
          </p>
          <code style={{
            display: 'block',
            fontSize: 12.5,
            wordBreak: 'break-all',
            color: '#111827',
            background: '#fff',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '8px 10px',
          }}>
            {revealed.token}
          </code>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => void handleCopy(revealed.token)} style={secondaryButton}>
              Copiar
            </button>
            <button type="button" onClick={() => setRevealed(null)} style={secondaryButton}>
              Ya la copié
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Cargando claves…</p>
      ) : loadError ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{loadError}</p>
          <button type="button" onClick={() => void load()} style={{ ...secondaryButton, alignSelf: 'flex-start' }}>
            Reintentar
          </button>
        </div>
      ) : keys.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Todavía no tienes claves.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keys.map((key) => (
            <li
              key={key.id}
              style={{
                border: '1px solid #f3f4f6',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                opacity: key.revoked ? 0.65 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{key.name}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: key.revoked ? '#6b7280' : '#047857',
                    background: key.revoked ? '#f3f4f6' : '#ecfdf5',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}>
                    {key.revoked ? 'Revocada' : 'Activa'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {key.prefix}…
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Creada {formatWhen(key.created_at)} · Último uso {formatWhen(key.last_used_at)}
                  {' · '}
                  {hasOwnerScope(key.scopes) ? 'Acceso completo' : 'Solo tareas'}
                </div>
              </div>
              {!key.revoked && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {canIssueOwner && !hasOwnerScope(key.scopes) && (
                    <button
                      type="button"
                      onClick={() => void handleUpgrade(key.id)}
                      disabled={upgradingId === key.id}
                      style={{ ...secondaryButton, opacity: upgradingId === key.id ? 0.55 : 1 }}
                    >
                      {upgradingId === key.id ? 'Ampliando…' : 'Acceso completo'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRevoke(key.id)}
                    disabled={revokingId === key.id}
                    style={{ ...dangerButton, opacity: revokingId === key.id ? 0.55 : 1 }}
                  >
                    {revokingId === key.id ? 'Revocando…' : 'Revocar'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const fieldStyle: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#111827',
  fontFamily: 'inherit',
  fontSize: 13.5,
  outline: 'none',
  width: '100%',
}

const primaryButton: React.CSSProperties = {
  height: 38,
  padding: '0 16px',
  background: '#7170ff',
  border: '1px solid transparent',
  borderRadius: 10,
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  boxShadow: '0 1px 3px rgba(113, 112, 255, 0.30)',
}

const secondaryButton: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#374151',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
}

const dangerButton: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  background: '#fff',
  border: '1px solid #fecaca',
  borderRadius: 8,
  color: '#b91c1c',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  flexShrink: 0,
}
