// app/lib/marcas/branding.ts
//
// Identidad visual por marca (color primario) para el portal del cliente.
// Vive en código —igual que los logos en /public/marcas/{slug}/— para que cada
// portal se vea de SU marca aunque el color no esté cargado en la BD.
//
// Prioridad: si la marca tiene `color_primario_hex` en la BD, ESE manda. Este
// mapa es solo el respaldo (para marcas con el color en NULL). Colores sacados
// del seed y del propio logo de cada marca. Pedro 19-jul-2026.

export const COLOR_MARCA: Record<string, string> = {
  manrique: '#283B6F',               // azul institucional
  lozano: '#DCC32C',                 // dorado
  'little-joe': '#61B3D1',           // celeste
  'distribuidora-fitness': '#F54922',// rojo/naranja
  kintu: '#234347',                  // verde petróleo
  'la-victoria': '#00311E',          // verde oscuro
  novalamps: '#CDDE00',              // lima
  'mil-ideas': '#E0A32E',            // ámbar (ya suele venir de la BD)
  praktico: '#C89A62',               // madera natural (guía de marca Praktiko)
  'oral-bueaty': '#DE7BA4',          // rosa (guía: "rosados/blancos/dorados") — slug con typo en BD
  retoz: '#D06402',                  // naranja (manual Retoz: marrón #432719 / naranja #D06402 / beige #F1DAAE)
}

const DEFECTO = '#7170ff'

/* Colores "por defecto del sistema": se auto-asignaron a marcas sin color real
   (ese morado `#ba41f7` lo comparten praktico, oral-bueaty, distinto-agencia…).
   Los tratamos como "sin configurar" para que aplique la identidad real. */
const DEFAULTS_SISTEMA = new Set(['#ba41f7', '#7170ff'])

/* Color de la marca por slug (respaldo cuando la BD no lo trae). */
export function colorMarca(slug: string | null | undefined): string {
  if (!slug) return DEFECTO
  return COLOR_MARCA[slug] ?? DEFECTO
}

/* Color final de la marca: usa el de la BD SALVO que sea un morado por defecto
   del sistema (entonces cae al respaldo por slug). Así el portal y la grilla
   respetan lo que Pedro configura, pero ignoran los defaults basura. */
export function colorDeMarca(slug: string | null | undefined, dbColor: string | null | undefined): string {
  const raw = (dbColor ?? '').trim()
  if (raw && !DEFAULTS_SISTEMA.has(raw.toLowerCase())) return raw
  return colorMarca(slug)
}

/* Normaliza la URL del logo (columna marcas.logo_url) a una que el <img> pueda
   mostrar. Los enlaces de Google Drive se convierten a descarga directa —igual
   que en la grilla— para que el portal muestre el MISMO logo que configuras en
   la sección de marcas. Requiere que el archivo esté "Cualquiera con el enlace".
   Pedro 20-jul-2026. */
export function normalizeLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const u = String(url).trim()
  if (!u) return null
  if (!u.includes('drive.google.com')) return u
  const m1 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return `https://drive.google.com/uc?export=download&id=${m1[1]}`
  const m2 = u.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2 && !u.includes('export=download')) return `https://drive.google.com/uc?export=download&id=${m2[1]}`
  return u
}

// ── utilidades de color (sin dependencias) ──────────────────────────────────
function parse(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
function toHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function mezcla(hex: string, hacia: [number, number, number], f: number): string {
  const rgb = parse(hex)
  if (!rgb) return hex
  return toHex(rgb[0] + (hacia[0] - rgb[0]) * f, rgb[1] + (hacia[1] - rgb[1]) * f, rgb[2] + (hacia[2] - rgb[2]) * f)
}

/* Aclara un color mezclándolo con blanco (f = 0..1). */
export const aclarar = (hex: string, f = 0.15): string => mezcla(hex, [255, 255, 255], f)
/* Oscurece un color mezclándolo con negro (f = 0..1). */
export const oscurecer = (hex: string, f = 0.28): string => mezcla(hex, [0, 0, 0], f)

/* ¿El color es claro? Sirve para decidir si el texto encima va oscuro o blanco
   (contraste legible en marcas claras como lima o dorado). */
export function esClaro(hex: string): boolean {
  const rgb = parse(hex)
  if (!rgb) return false
  const L = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  return L > 0.68
}
