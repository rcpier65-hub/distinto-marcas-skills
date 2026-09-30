'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Sparkles, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { writingField } from '@/lib/propuestas/writing'
import styles from './propuestas.module.css'

export function ProposalTextField({ label, value, onChange, multiline = false, hint, maxLength = 2000 }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string; maxLength?: number }) {
  const id = useId()
  const field = writingField(label)
  const [pending, setPending] = useState(false)
  const [suggestion, setSuggestion] = useState<{ original: string; text: string } | null>(null)
  const [undo, setUndo] = useState<{ original: string; text: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const lock = useRef(false)
  useEffect(() => () => abort.current?.abort(), [])
  async function improve() {
    if (!field || !value.trim() || lock.current) return
    lock.current = true; setPending(true); setSuggestion(null)
    const original = value
    const controller = new AbortController(); abort.current = controller
    try {
      const res = await fetch('/api/propuestas/mejorar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field, text: original }), signal: controller.signal })
      const body = await res.json().catch(() => null)
      if (!res.ok || typeof body?.text !== 'string') throw new Error(body?.error || 'No se pudo mejorar el texto. Comprueba tu sesión e inténtalo de nuevo.')
      if (body.text.length > maxLength) throw new Error('La sugerencia es demasiado extensa. Vuelve a intentar.')
      setSuggestion({ original, text: body.text })
    } catch (e) { if (!controller.signal.aborted) toast.error(e instanceof Error ? e.message : 'No se pudo mejorar el texto.') }
    finally { lock.current = false; if (!controller.signal.aborted) setPending(false) }
  }
  return <div className={styles.field}>
    <div className={styles.fieldHeading}><label htmlFor={id}>{label}</label>{field && <button type="button" className={styles.aiButton} disabled={pending || !value.trim()} onClick={() => void improve()} aria-label={`Mejorar con IA: ${label}`}><Sparkles size={13}/>{pending ? 'Mejorando…' : 'Mejorar con IA'}</button>}</div>
    {multiline ? <textarea id={id} value={value} rows={4} maxLength={maxLength} onChange={e => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}/> : <input id={id} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}/>}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {suggestion && <div className={styles.aiSuggestion} role="status"><b>Sugerencia de IA</b><p>{suggestion.text}</p>{value !== suggestion.original && <small>El texto cambió mientras trabajaba la IA. Genera otra sugerencia para usar tu última versión.</small>}<div><button type="button" disabled={value !== suggestion.original} onClick={() => { onChange(suggestion.text); setUndo(suggestion); setSuggestion(null) }}>Aplicar mejora</button><button type="button" onClick={() => setSuggestion(null)}>Descartar</button></div><small>Revisa que el alcance y las condiciones sigan siendo los que quieres ofrecer.</small></div>}
    {undo && value === undo.text && <button type="button" className={styles.undoButton} onClick={() => { onChange(undo.original); setUndo(null); setSuggestion(null) }}><Undo2 size={12}/> Deshacer mejora</button>}
  </div>
}
