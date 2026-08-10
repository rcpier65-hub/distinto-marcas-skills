/* Pantalla de carga instantánea (skeleton) para TODAS las rutas.
 *
 * Antes NO existía: al abrir la app se veía la PANTALLA EN BLANCO hasta que el
 * servidor terminaba de traer todos los datos (para el director son ~40
 * consultas). Ahora Next muestra esto de inmediato mientras el contenido llega,
 * así se siente rápido y nunca se ve el blanco. Pedro 06-ago-2026.
 */
export default function Loading() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
