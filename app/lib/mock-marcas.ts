// app/lib/mock-marcas.ts
//
// Mock data centralizado de las 9 marcas para el nuevo design system.
// Mientras migramos a Supabase real (M4), AppShell y CommandPalette
// consumen de acá. Después se reemplaza por server queries reales.

export type MarcaNav = {
  slug: string
  nombre: string
  nombreCorto: string  /* para sidebar */
  emoji: string
  color: string        /* CSS var Linear */
  industria: string
  pendientes: number   /* suma comentarios+grilla+pubs */
}

// IMPORTANTE: los slugs DEBEN coincidir EXACTAMENTE con los de la tabla
// `marcas` en Supabase. Si no, MARCAS_NAV.find() devuelve undefined y las
// cards del calendario pierden nombre/color (bug que detectó Pedro).
//
// Slugs reales en BD (probado vía PostgREST):
//   kintu, novalamps, la-victoria, little-joe, manrique, lozano,
//   distribuidora-fitness, warrior-supps
export const MARCAS_NAV: MarcaNav[] = [
  { slug: 'manrique',              nombre: 'Centro Psicológico Manrique', nombreCorto: 'Manrique',       emoji: '🧠', color: 'var(--mk-brand-manrique)',     industria: 'Salud mental',           pendientes: 17 },
  { slug: 'lozano',                nombre: 'Muebles Lozano SAC',          nombreCorto: 'Lozano',         emoji: '🪵', color: 'var(--mk-brand-lozano)',       industria: 'Mobiliario a medida',    pendientes: 9 },
  { slug: 'kintu',                 nombre: 'KintuOils',                   nombreCorto: 'Kintu',          emoji: '🌿', color: 'var(--mk-brand-kintu)',        industria: 'Aceites esenciales',     pendientes: 3 },
  { slug: 'novalamps',             nombre: 'Novalamps Perú',              nombreCorto: 'Novalamps',      emoji: '💡', color: 'var(--mk-brand-novalamps)',    industria: 'Iluminación LED',        pendientes: 10 },
  { slug: 'la-victoria',           nombre: 'La Victoria Maderera',        nombreCorto: 'La Victoria',    emoji: '🪚', color: 'var(--mk-brand-lavictoria)',   industria: 'Carpintería industrial', pendientes: 9 },
  { slug: 'distribuidora-fitness', nombre: 'Distribuidora Fitness',       nombreCorto: 'Distri Fitness', emoji: '💪', color: 'var(--mk-brand-distrifitness)', industria: 'Equipamiento gym',     pendientes: 27 },
  { slug: 'little-joe',            nombre: 'TypHouse',                    nombreCorto: 'TypHouse',       emoji: '💙', color: 'var(--mk-brand-littlejoe)',    industria: 'Ambientadores auto',     pendientes: 8 },
  { slug: 'warrior-supps',         nombre: 'Warrior Supps',               nombreCorto: 'Warrior',        emoji: '⚡', color: 'var(--mk-brand-warriorsupps)', industria: 'Suplementos deportivos', pendientes: 13 },
]
