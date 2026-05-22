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
  /** Color de fondo del wrapper del logo (importante para logos blancos
   *  como Little Joe, o cuando el manual de marca lo exige). Default: white. */
  logoBg?: string
  /** Padding interno del wrapper del logo. Default 14px. Algunos logos con
   *  poca respiración propia se ven mejor sin padding. */
  logoPad?: string
}

export const THEMES: Record<string, GrillaTheme> = {
  manrique: {
    style: 'clinical-warm',
    primary: '#283B6F',       // Navy oficial Manual pág. 4
    accent: '#D9536C',        // Raspberry Pink Manual pág. 4
    highlight: '#9AC2E8',     // Light Sky Blue Manual pág. 4
    canvas: '#FBF6F2',        // Crema cálido (no listado en manual, complemento)
    text: '#283B6F',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4C9D2',     // Rosa derivado del raspberry
    // Manual oficial pág. 5: "Poppins Family Font" para todo. NO Playfair.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Poppins', system-ui, -apple-system, sans-serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    brandSmall: 'CENTRO PSICOLÓGICO',
    brandBig: 'MANRIQUE',
    tagline: 'Acompañamos a tu familia con rigor clínico y calidez',
    footerUrl: 'www.agenciadistinto.com',
    heroTitle: '¿Qué se viene?',
    logoBg: '#FFFFFF',
  },
  lozano: {
    style: 'artisan-craft',
    primary: '#0C0C12',       // Negro azulado oficial Manual pág. 6
    accent: '#DCC32C',        // Amarillo dorado oficial Manual pág. 6
    highlight: '#F4E180',     // Amarillo suave (derivado)
    canvas: '#FAF6EC',        // Crema cálido (complemento warm para oficio)
    text: '#0C0C12',
    cardBg: '#FFFFFF',
    cardAltBg: '#F8E790',
    // Manual oficial pág. 8: Opificio Neue (no tiene bold) + Myriad Pro.
    // OSS equivalente: Oswald (display sin bold real) + Inter (sans cuerpo).
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap',
    fontSerif: "'Oswald', Impact, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Oswald', Impact, sans-serif",
    brandSmall: 'MUEBLES A MEDIDA · LIMA',
    brandBig: 'MUEBLES LOZANO',
    tagline: 'Convierte tu espacio en un lugar único',
    footerUrl: 'www.agenciadistinto.com',
    heroTitle: 'Tu semana',
    logoBg: '#FAF6EC',
  },
  'distribuidora-fitness': {
    style: 'gym-energy',
    // Estilo de diseño v3 (22-may-2026, Pedro feedback "más blanco"):
    // Magazine editorial gym. Dark+smoke como "stage", cards BLANCAS como
    // paneles de información (igual que precios en pieza Warrior).
    // Logo DF y Distinto en NEGATIVO (blanco) via filter CSS. Sin wrapper
    // blanco para el logo del header. Ver `09-estilo-diseno.md`.
    primary: '#1A1818',       // Grafito dark (texto sobre cards blancas)
    accent: '#F54922',        // Naranja DF oficial Manual pág. 7
    highlight: '#FF6B45',     // Naranja brillante
    canvas: '#1A1818',        // Grafito dark base (smoke layer encima)
    text: '#1A1818',          // Texto dark sobre paneles blancos
    cardBg: '#FFFFFF',        // PANELES BLANCOS (lo que rompe con dark)
    cardAltBg: '#FAFAFA',     // Alterno gris muy claro
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Saira+Condensed:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap',
    fontSerif: "'Saira Condensed', 'Bebas Neue', Impact, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Saira Condensed', 'Bebas Neue', Impact, sans-serif",
    brandSmall: 'MAYORISTA Y MENOR · DELIVERY LIMA',
    brandBig: 'DISTRIBUIDORA FITNESS',
    tagline: 'Tu progreso, nuestro suplemento',
    footerUrl: 'distribuidorafitness.pe',
    heroTitle: 'Esta semana',
    // logoBg transparent → logo flota sobre smoke, sin thumbnail blanco.
    // El logo se renderiza en NEGATIVO (blanco) via CSS filter en el style.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'little-joe': {
    style: 'playful-italian',
    primary: '#1E3A8A',       // Azul Little Joe (marca matriz italiana)
    accent: '#EAB308',        // Dorado estrella (warm acento)
    highlight: '#BFD4F5',
    canvas: '#EAF4FF',        // Cielo italiano cálido
    text: '#1E3A8A',
    cardBg: '#FFFFFF',
    cardAltBg: '#DCE8FA',
    // Tono cute+aspiracional: Quicksand rounded + Fraunces curvy
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,700;1,500;1,700&family=Quicksand:wght@400;500;600;700&display=swap',
    fontSerif: "'Fraunces', Georgia, serif",
    fontSans: "'Quicksand', system-ui, sans-serif",
    brandSmall: 'AROMATIZANTES · ITALIA',
    brandBig: 'LITTLE JOE',
    tagline: 'Pon una sonrisa en el aire',
    footerUrl: 'littlejoe.com.pe',
    heroTitle: 'La semana viene así',
    // CRÍTICO: logo es BLANCO solo, sin fondo azul es invisible
    logoBg: '#1E3A8A',
    logoPad: '10px',
  },
  kintu: {
    style: 'wellness-organic',
    primary: '#1A3E42',       // Verde profundo Manual pág. 6
    accent: '#45B787',        // Verde Kintu Manual pág. 6
    highlight: '#BBE0CD',     // Verde menta Manual pág. 6
    canvas: '#F4F8F2',        // Off-white verdoso
    text: '#1A3E42',
    cardBg: '#FFFFFF',
    cardAltBg: '#DDEDE3',
    // Manual oficial pág. 7: Montserrat estricto (NO Cormorant — eso era invención mía)
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    fontSerif: "'Montserrat', system-ui, sans-serif",
    fontSans: "'Montserrat', system-ui, sans-serif",
    brandSmall: 'ESSENTIAL OILS',
    brandBig: 'kintu',          // Manual: wordmark lowercase
    tagline: 'Cuidarte de forma simple y consciente',
    footerUrl: 'kintuoils.com',
    heroTitle: 'Tu semana en calma',
    logoBg: '#FFFFFF',
  },
  novalamps: {
    style: 'led-technical',
    // Manual oficial pág. 7-8: Verde lima debe PREDOMINAR + Grafito + Blanco.
    // Mood Sage+Creator+Ruler aspiracional premium, NO sci-fi cyberpunk.
    primary: '#262726',       // Grafito oficial Manual pág. 7 (texto)
    accent: '#D2DD00',        // Verde lima Novalamps Manual pág. 7 (PRINCIPAL)
    highlight: '#E4F000',     // Lima brillante (acento)
    canvas: '#FAFAF5',        // Off-white para que lima predomine (no dark)
    text: '#262726',
    cardBg: '#FFFFFF',
    cardAltBg: '#F2F4D6',     // Lima muy suave
    // Manual oficial pág. 9: Arial Regular/Bold → OSS Inter (NO Orbitron sci-fi)
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    fontSerif: "'Inter', system-ui, sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Inter', system-ui, sans-serif",
    brandSmall: 'ILUMINACIÓN LED · 15 AÑOS',
    brandBig: 'Novalamps',     // Manual: escritura correcta, NO mayúsculas
    tagline: 'Convierte cada espacio en diseño',
    footerUrl: 'novalamps.com.pe',
    heroTitle: 'Esta semana',
    // Logo oficial es lima+grafito sobre dark — el wrapper grafito lo realza
    logoBg: '#262726',
  },
  'la-victoria': {
    style: 'wood-industrial',
    // Brochure: Verde bosque oscuro PRIMARIO + crema madera + marrón
    primary: '#1B4332',       // Verde bosque oscuro
    accent: '#8B6F47',         // Marrón madera
    highlight: '#C9A87A',      // Madera clara
    canvas: '#F2E8D0',         // Crema madera natural
    text: '#1B4332',
    cardBg: '#FFFCEB',
    cardAltBg: '#E8D4B0',
    // Brochure: serif moderna semibold + sans tracking ancho
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    brandSmall: 'DISTRIBUIDORA DE PINO',
    brandBig: 'LA VICTORIA',
    tagline: 'Asegura tu abastecimiento',
    footerUrl: 'lavictoria.com.pe',
    heroTitle: 'La semana en obra',
    logoBg: '#FFFCEB',
  },
}

export function getTheme(slug: string): GrillaTheme {
  return THEMES[slug] ?? THEMES.manrique
}
