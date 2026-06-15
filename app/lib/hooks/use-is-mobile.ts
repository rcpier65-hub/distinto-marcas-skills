'use client'

/* useIsMobile — hook compartido para responsividad en componentes
   client. Pedro usa mucho la app en mobile, así que varios módulos
   necesitan saber si están en pantalla angosta para cambiar el layout
   (calendario que scrollea, headers que se apilan, etc.).

   Usa matchMedia (no resize listener pesado) y arranca en false para
   evitar mismatch de hidratación SSR → el primer paint en server asume
   desktop y se corrige al montar. */

import { useState, useEffect } from 'react'

export function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    /* addEventListener('change') es el API moderno; algunos Safari viejos
       solo soportan addListener — cubrimos ambos. */
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
    }
  }, [breakpointPx])

  return isMobile
}
