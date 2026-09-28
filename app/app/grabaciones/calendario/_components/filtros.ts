/* Filtros del Calendario (chips de tipo + marca) guardados en una cookie:
   el server los lee al renderizar → se mantienen al cambiar de semana/mes y
   al volver a entrar, sin parpadeo. Pedro 24-sep-2026: "el único filtro
   activo cuando entro debe ser reuniones y grabaciones, y si selecciono un
   filtro y cambio de mes el filtro debe permanecer". */

export const COOKIE_FILTROS_CAL = 'cal_filtros'

export type TipoEvento = 'grabacion' | 'reunion' | 'publicacion' | 'fecha' | 'gcal' | 'diseno'
export type FiltrosCalendario = { tipos: Record<TipoEvento, boolean>; marca: string }

export const FILTROS_DEFAULT: FiltrosCalendario = {
  tipos: { grabacion: true, reunion: true, publicacion: false, fecha: false, gcal: false, diseno: false },
  marca: 'todas',
}

export function leerFiltrosCalendario(valor: string | undefined): FiltrosCalendario {
  if (!valor) return FILTROS_DEFAULT
  try {
    const v = JSON.parse(decodeURIComponent(valor))
    const tipos = { ...FILTROS_DEFAULT.tipos }
    for (const k of Object.keys(tipos) as TipoEvento[]) {
      if (typeof v?.tipos?.[k] === 'boolean') tipos[k] = v.tipos[k]
    }
    const marca = typeof v?.marca === 'string' && /^[a-z0-9-]{1,80}$/.test(v.marca) ? v.marca : 'todas'
    return { tipos, marca }
  } catch {
    return FILTROS_DEFAULT
  }
}

export function guardarFiltrosCalendario(f: FiltrosCalendario): void {
  try {
    const valor = encodeURIComponent(JSON.stringify(f))
    document.cookie = `${COOKIE_FILTROS_CAL}=${valor}; path=/grabaciones; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  } catch { /* sin cookies: los filtros duran solo esta vista */ }
}
