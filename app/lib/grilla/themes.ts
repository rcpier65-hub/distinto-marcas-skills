// app/lib/grilla/themes.ts
// Theme system para grillas. Cada marca define su paleta + fuentes + tagline.
// La plantilla maestra (template-builder.ts) usa estos themes para generar
// HTML consistente — mismo layout pixel-perfect que Manrique pero con
// los colores/identidad de cada marca.

export type GrillaTheme = {
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
  /** Fuente serif (display, hero "¿Qué se viene?") */
  fontSerif: string
  /** Fuente sans (cuerpo, metadata) */
  fontSans: string
  /** Texto pequeño sobre el nombre de la marca (ej. "Centro Psicológico") */
  brandSmall: string
  /** Nombre grande de la marca (ej. "MANRIQUE") */
  brandBig: string
  /** Tagline o frase-firma de la marca */
  tagline: string
  /** Footer agency suffix (ej. "www.agenciadistinto.com") */
  footerUrl: string
}

export const THEMES: Record<string, GrillaTheme> = {
  manrique: {
    primary: '#283B6F',       // Navy oficial
    accent: '#D9536C',        // Raspberry — blobs, divider dot
    highlight: '#9AC2E8',     // Sky
    canvas: '#FBF6F2',        // Crema cálido
    text: '#283B6F',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4C9D2',     // Card rose
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'CENTRO PSICOLÓGICO',
    brandBig: 'MANRIQUE',
    tagline: 'Acompañamos a tu familia con rigor clínico y calidez',
    footerUrl: 'www.agenciadistinto.com',
  },
  lozano: {
    primary: '#0C0C12',       // Negro azulado
    accent: '#DCC32C',        // Amarillo dorado oficial
    highlight: '#F4E180',     // Amarillo suave
    canvas: '#FAF6EC',        // Crema cálido
    text: '#0C0C12',
    cardBg: '#FFFFFF',
    cardAltBg: '#F8E790',     // Card amarillo
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'MUEBLES A MEDIDA · LIMA',
    brandBig: 'MUEBLES LOZANO',
    tagline: 'Convierte tu espacio en un lugar único',
    footerUrl: 'www.agenciadistinto.com',
  },
  'distribuidora-fitness': {
    primary: '#1A1A1F',       // Casi negro premium
    accent: '#F54922',        // Naranja DF oficial
    highlight: '#FF6B45',     // Naranja brillante
    canvas: '#F5F5F0',        // Crema neutro (no oscuro — más legible)
    text: '#1A1A1F',
    cardBg: '#FFFFFF',
    cardAltBg: '#FFE0D5',     // Card naranja suave
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'SUPLEMENTACIÓN PREMIUM · PERÚ',
    brandBig: 'DISTRIBUIDORA FITNESS',
    tagline: 'Tu progreso, nuestro suplemento',
    footerUrl: 'distribuidorafitness.pe',
  },
  'little-joe': {
    primary: '#1E3A8A',       // Azul royal italiano
    accent: '#E63946',        // Rojo Universitario / amor
    highlight: '#BFD4F5',     // Sky
    canvas: '#F8FBFF',        // Blanco azulado
    text: '#1E3A8A',
    cardBg: '#FFFFFF',
    cardAltBg: '#DCE8FA',     // Card sky
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'AROMATIZANTES PREMIUM · ITALIA',
    brandBig: 'LITTLE JOE',
    tagline: 'Pon una sonrisa en el aire',
    footerUrl: 'littlejoe.com.pe',
  },
  kintu: {
    primary: '#1A3E42',       // Verde profundo
    accent: '#45B787',        // Verde Kintu oficial
    highlight: '#BBE0CD',     // Verde menta claro
    canvas: '#F8FAF5',        // Off-white verdoso
    text: '#1A3E42',
    cardBg: '#FFFFFF',
    cardAltBg: '#DDEDE3',     // Card mint
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'ESSENTIAL OILS · PERÚ',
    brandBig: 'KINTU',
    tagline: 'Cuidarte de forma simple y consciente',
    footerUrl: 'kintu.com.pe',
  },
  novalamps: {
    primary: '#262726',       // Grafito oficial
    accent: '#D2DD00',        // Verde lima oficial
    highlight: '#E4F000',     // Lima brillante
    canvas: '#FAFAF5',        // Off-white
    text: '#262726',
    cardBg: '#FFFFFF',
    cardAltBg: '#F0F4D0',     // Card lima suave
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'ILUMINACIÓN LED · 15+ AÑOS',
    brandBig: 'NOVALAMPS',
    tagline: 'Convierte cada espacio en diseño',
    footerUrl: 'novalamps.com.pe',
  },
  'la-victoria': {
    primary: '#1B4332',       // Verde bosque oscuro
    accent: '#8B6F47',        // Marrón madera
    highlight: '#C9A87A',     // Madera clara
    canvas: '#F5EDD8',        // Crema madera natural
    text: '#1B4332',
    cardBg: '#FFFCEB',        // Crema cálido
    cardAltBg: '#E8D4B0',     // Card wood
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'DISTRIBUIDORA DE PINO',
    brandBig: 'LA VICTORIA',
    tagline: '15 años abasteciendo la industria peruana',
    footerUrl: 'lavictoria.com.pe',
  },
}

export function getTheme(slug: string): GrillaTheme {
  return THEMES[slug] ?? THEMES.manrique
}
