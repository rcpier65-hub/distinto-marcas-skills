// app/lib/grilla/themes.ts
// Theme system para grillas. Cada marca define su paleta + fuentes + tagline.
// El campo `style` discrimina qué módulo de `./styles/` se usa para renderizar
// (cada marca tiene un mood/decoraciones distintas, no solo otro color).

export type StyleName =
  | 'clinical-warm'      // Manrique     — Playfair italic + blobs raspberry
  | 'artisan-craft'      // Lozano       — Bebas Neue + grid técnico blueprint
  | 'gym-energy'         // Distri Fit   — Display peso + glow naranja + diagonales
  | 'playful-italian'    // Little Joe   — Quicksand + nubes + estrellas doradas
  | 'wellness-organic'   // Kintu        — Cormorant + hojas SVG + gotas
  | 'led-technical'      // NovaLamps    — Dark canvas + LEDs lima con glow
  | 'wood-industrial'    // La Victoria  — Playfair + vetas madera + marrones

export type GrillaTheme = {
  /** Discriminador: qué módulo de styles/ renderiza esta marca */
  style: StyleName
  /** Color principal de marca (CTAs, accents, badge labels) */
  primary: string
  /** Color secundario (accent visual: blobs, dividers) */
  accent: string
  /** Tercer color (highlight sutil, card alterna) */
  highlight: string
  /** Color de fondo de la pieza */
  canvas: string
  /** Color de texto principal */
  text: string
  /** Color de tarjeta default */
  cardBg: string
  /** Color de tarjeta alterna (segunda variante para rotación) */
  cardAltBg: string
  /** Google Fonts URL completo (precargar) */
  fontsUrl: string
  /** Fuente serif/display principal del hero */
  fontSerif: string
  /** Fuente sans (cuerpo, metadata) */
  fontSans: string
  /** Fuente display alternativa opcional (Bebas Neue, etc.) */
  fontDisplay?: string
  /** Texto pequeño sobre el nombre de la marca (ej. "Centro Psicológico") */
  brandSmall: string
  /** Nombre grande de la marca (ej. "MANRIQUE") */
  brandBig: string
  /** Tagline o frase-firma de la marca */
  tagline: string
  /** Footer agency suffix (ej. "www.agenciadistinto.com") */
  footerUrl: string
  /** Override opcional del hero title (default "¿Qué se viene?") */
  heroTitle?: string
}

export const THEMES: Record<string, GrillaTheme> = {
  manrique: {
    style: 'clinical-warm',
    primary: '#283B6F',       // Navy oficial
    accent: '#D9536C',        // Raspberry
    highlight: '#9AC2E8',     // Sky
    canvas: '#FBF6F2',        // Crema cálido
    text: '#283B6F',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4C9D2',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'CENTRO PSICOLÓGICO',
    brandBig: 'MANRIQUE',
    tagline: 'Acompañamos a tu familia con rigor clínico y calidez',
    footerUrl: 'www.agenciadistinto.com',
    heroTitle: '¿Qué se viene?',
  },
  lozano: {
    style: 'artisan-craft',
    primary: '#0C0C12',
    accent: '#DCC32C',
    highlight: '#F4E180',
    canvas: '#FAF6EC',
    text: '#0C0C12',
    cardBg: '#FFFFFF',
    cardAltBg: '#F8E790',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Bebas Neue', Impact, sans-serif",
    brandSmall: 'MUEBLES A MEDIDA · LIMA',
    brandBig: 'MUEBLES LOZANO',
    tagline: 'Convierte tu espacio en un lugar único',
    footerUrl: 'www.agenciadistinto.com',
    heroTitle: 'TU SEMANA',
  },
  'distribuidora-fitness': {
    style: 'gym-energy',
    primary: '#1A1A1F',
    accent: '#F54922',
    highlight: '#FF6B45',
    canvas: '#F2F2EC',
    text: '#1A1A1F',
    cardBg: '#FFFFFF',
    cardAltBg: '#FFDFD0',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;500;700;800&family=Inter:wght@400;500;600;700;800&display=swap',
    fontSerif: "'Anton', Impact, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Barlow Condensed', Impact, sans-serif",
    brandSmall: 'SUPLEMENTACIÓN PREMIUM · PERÚ',
    brandBig: 'DISTRIBUIDORA FITNESS',
    tagline: 'Tu progreso, nuestro suplemento',
    footerUrl: 'distribuidorafitness.pe',
    heroTitle: 'ESTA SEMANA',
  },
  'little-joe': {
    style: 'playful-italian',
    primary: '#1E3A8A',
    accent: '#E63946',
    highlight: '#BFD4F5',
    canvas: '#F4FAFE',
    text: '#1E3A8A',
    cardBg: '#FFFFFF',
    cardAltBg: '#DCE8FA',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,700;1,500&family=Quicksand:wght@400;500;600;700&display=swap',
    fontSerif: "'Fraunces', Georgia, serif",
    fontSans: "'Quicksand', system-ui, sans-serif",
    brandSmall: 'AROMATIZANTES PREMIUM · ITALIA',
    brandBig: 'LITTLE JOE',
    tagline: 'Pon una sonrisa en el aire',
    footerUrl: 'littlejoe.com.pe',
    heroTitle: 'La semana viene así',
  },
  kintu: {
    style: 'wellness-organic',
    primary: '#1A3E42',
    accent: '#45B787',
    highlight: '#BBE0CD',
    canvas: '#F4F8F2',
    text: '#1A3E42',
    cardBg: '#FFFFFF',
    cardAltBg: '#DDEDE3',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Nunito+Sans:wght@300;400;500;600;700&display=swap',
    fontSerif: "'Cormorant Garamond', Georgia, serif",
    fontSans: "'Nunito Sans', system-ui, sans-serif",
    brandSmall: 'ESSENTIAL OILS · PERÚ',
    brandBig: 'KINTU',
    tagline: 'Cuidarte de forma simple y consciente',
    footerUrl: 'kintu.com.pe',
    heroTitle: 'Florece esta semana',
  },
  novalamps: {
    style: 'led-technical',
    primary: '#E4F000',       // Lima brillante (texto sobre fondo oscuro)
    accent: '#D2DD00',
    highlight: '#9AAA00',
    canvas: '#0F0F0E',        // Grafito casi negro
    text: '#F2F2F2',
    cardBg: '#1C1C1A',
    cardAltBg: '#262624',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Orbitron', 'JetBrains Mono', monospace",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'JetBrains Mono', monospace",
    brandSmall: 'ILUMINACIÓN LED · 15+ AÑOS',
    brandBig: 'NOVALAMPS',
    tagline: 'Convierte cada espacio en diseño',
    footerUrl: 'novalamps.com.pe',
    heroTitle: 'AGENDA / SEMANA',
  },
  'la-victoria': {
    style: 'wood-industrial',
    primary: '#1B4332',
    accent: '#8B6F47',
    highlight: '#C9A87A',
    canvas: '#F2E8D0',        // Crema madera natural más cálido
    text: '#1B4332',
    cardBg: '#FFFCEB',
    cardAltBg: '#E8D4B0',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Libre Caslon Text', Georgia, serif",
    brandSmall: 'DISTRIBUIDORA DE PINO',
    brandBig: 'LA VICTORIA',
    tagline: '15 años abasteciendo la industria peruana',
    footerUrl: 'lavictoria.com.pe',
    heroTitle: 'La semana en obra',
  },
}

export function getTheme(slug: string): GrillaTheme {
  return THEMES[slug] ?? THEMES.manrique
}
