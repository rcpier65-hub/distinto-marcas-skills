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

export const MARCAS_NAV: MarcaNav[] = [
  { slug: 'manrique',      nombre: 'Centro Psicológico Manrique', nombreCorto: 'Manrique',     emoji: '🧠', color: 'var(--mk-brand-manrique)',     industria: 'Salud mental',           pendientes: 17 },
  { slug: 'lozano',        nombre: 'Muebles Lozano SAC',          nombreCorto: 'Lozano',       emoji: '🪵', color: 'var(--mk-brand-lozano)',       industria: 'Mobiliario a medida',    pendientes: 9 },
  { slug: 'kintu',         nombre: 'KintuOils',                   nombreCorto: 'Kintu',        emoji: '🌿', color: 'var(--mk-brand-kintu)',        industria: 'Aceites esenciales',     pendientes: 3 },
  { slug: 'novalamps',     nombre: 'Novalamps Perú',              nombreCorto: 'Novalamps',    emoji: '💡', color: 'var(--mk-brand-novalamps)',    industria: 'Iluminación LED',        pendientes: 10 },
  { slug: 'lavictoria',    nombre: 'La Victoria Maderera',        nombreCorto: 'La Victoria',  emoji: '🪚', color: 'var(--mk-brand-lavictoria)',   industria: 'Carpintería industrial', pendientes: 9 },
  { slug: 'distrifitness', nombre: 'Distribuidora Fitness',       nombreCorto: 'Distri Fitness', emoji: '💪', color: 'var(--mk-brand-distrifitness)', industria: 'Equipamiento gym',     pendientes: 27 },
  { slug: 'littlejoe',     nombre: 'Little Joe · Typhouse',       nombreCorto: 'Little Joe',   emoji: '🍝', color: 'var(--mk-brand-littlejoe)',    industria: 'Restaurante italiano',   pendientes: 8 },
  { slug: 'warriorsupps',  nombre: 'Warriorupps.pe',              nombreCorto: 'Warriors',     emoji: '⚡', color: 'var(--mk-brand-warriorsupps)', industria: 'Suplementos deportivos', pendientes: 13 },
  { slug: 'oralbeauty',    nombre: 'Oral Beauty',                 nombreCorto: 'Oral Beauty',  emoji: '✨', color: 'var(--mk-brand-oralbeauty)',   industria: 'Cuidado dental estético',pendientes: 6 },
]
