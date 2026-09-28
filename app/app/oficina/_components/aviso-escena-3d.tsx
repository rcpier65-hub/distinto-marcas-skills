'use client'

import type { ErrorEscena3D } from './oficina-3d'

export function AvisoEscena3D({ error, reintentar }: { error: ErrorEscena3D; reintentar: () => void }) {
  return <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-auto bg-slate-100 p-6 text-center text-slate-600">
    <h2 className="text-lg font-semibold text-slate-800">{error === 'no-disponible' ? 'Tu navegador no tiene disponibles los gráficos 3D' : 'Se interrumpió la vista 3D'}</h2>
    <p className="max-w-lg text-sm">La sesión de Oficina permanece abierta. {error === 'no-disponible' ? 'La oficina necesita WebGL 2 para dibujarse.' : 'Puedes recuperar la escena con menos carga gráfica.'}</p>
    {error === 'no-disponible' && <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-relaxed">
      <p>En Chrome, abre <strong>Configuración → Sistema</strong> y activa <strong>Usar aceleración de gráficos cuando esté disponible</strong>.</p>
      <p className="mt-2">Guarda tu trabajo y reinicia Chrome. Si ya estaba activada, reinicia igualmente el navegador y vuelve a abrir Oficina. También puedes probar desde otro navegador actualizado.</p>
    </div>}
    <button className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white" onClick={reintentar}>Reintentar vista 3D</button>
    <p className="max-w-lg text-xs">El reintento reduce los efectos gráficos; no puede activar WebGL si el navegador lo tiene deshabilitado.</p>
  </div>
}
