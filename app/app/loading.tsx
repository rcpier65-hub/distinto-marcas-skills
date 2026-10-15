/* Se reutiliza en el layout raíz: visible antes de resolver la sesión,
 * sin depender de JavaScript ni de las animaciones del navegador. */
export default function Loading() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div role="status" aria-live="polite" style={{ marginBottom: 24, color: '#44255d' }}>
        <p style={{ fontSize: 20, fontWeight: 600 }}>Cargando tu espacio…</p>
        <p style={{ marginTop: 6, color: '#6b6473' }}>Estamos preparando tu contenido.</p>
      </div>
      <div aria-hidden="true" className="motion-safe:animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Saludo */}
        <div style={{ height: 30, width: 280, maxWidth: '70%', borderRadius: 10, background: 'var(--mk-bg-hover, #f0f0f3)' }} />
        <div style={{ height: 14, width: 380, maxWidth: '85%', borderRadius: 7, background: 'var(--mk-bg-hover, #f0f0f3)' }} />
        {/* Fila de botones */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ height: 44, width: 180, borderRadius: 12, background: 'var(--mk-bg-hover, #f0f0f3)' }} />
          <div style={{ height: 44, width: 160, borderRadius: 12, background: 'var(--mk-bg-hover, #f0f0f3)' }} />
        </div>
        {/* Grid de tarjetas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 14, background: 'var(--mk-bg-hover, #f0f0f3)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
