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
    // Estilo v2 (22-may-2026, basado en post Día de la Madre 2026):
    // Editorial elegante dark luxury — magazine de interiorismo premium.
    // Canvas negro `#0C0C12` + amarillo dorado `#DCC32C` acento + serif
    // italic delgada blanco gigante + sans tracking ancho uppercase labels.
    primary: '#FFFFFF',        // Texto blanco sobre dark
    accent: '#DCC32C',         // Amarillo dorado oficial Manual
    highlight: '#F4E180',      // Amarillo suave
    canvas: '#0C0C12',         // Negro oficial Manual (protagonista)
    text: '#FFFFFF',
    cardBg: '#FFFFFF',         // Cards blancas para legibilidad de 7 días
    cardAltBg: '#FAFAFA',
    // Manual pág. 8: Opificio Neue (no bold) + Myriad Pro.
    // Post DM real usa SERIF ITALIC ELEGANTE para hero ("un lugar / único.").
    // OSS: Playfair Display (serif italic delgada) + Inter (sans tracking).
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    brandSmall: 'MUEBLES A MEDIDA · LIMA, PERÚ',
    brandBig: 'MUEBLES LOZANO',
    tagline: '',                  // Sin tagline frase (aprendizaje DF/Kintu/LV)
    footerUrl: '@muebleslozanosac',
    heroTitle: 'Esta semana',
    // Logo aspect 1.09:1 (cuadrado isotipo+wordmark). Filter para volverlo
    // contrastante sobre dark — el logo original es negro+amarillo,
    // necesita invertir el negro a blanco manteniendo el amarillo.
    logoBg: 'transparent',
    logoPad: '0',
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
    tagline: '',                       // Pedro 22-may: sin tagline en footer
    footerUrl: 'distribuidorafitness.pe',
    heroTitle: 'Esta semana',
    // logoBg transparent → logo flota sobre smoke, sin thumbnail blanco.
    // El logo se renderiza en NEGATIVO (blanco) via CSS filter en el style.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'little-joe': {
    style: 'playful-italian',
    // Estilo v3 (22-may-2026, basado en FONDO CIELO oficial + post DM real):
    // Cute charming italiano · cielo cartoon background + mascota Joe roja
    // + script cursive friendly + acento rosa fucsia/coral.
    primary: '#1A3A6E',        // Azul navy Little Joe Italia (texto sobre claro)
    accent: '#E63D6A',         // Rosa fucsia/coral del post DM (firma visual)
    highlight: '#E63946',      // Rojo Joe (color de la mascota peruana)
    canvas: '#9DCEEC',         // Azul cielo italiano (de fallback si no carga foto)
    text: '#1A3A6E',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4F9FE',      // Blanco con tinte cielo muy sutil
    // Tipografía: Caveat script cursive (hero palabras destacadas)
    // + Fraunces serif curvy (body emocional) + Quicksand rounded (labels)
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Fraunces:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Quicksand:wght@400;500;600;700&display=swap',
    fontSerif: "'Fraunces', Georgia, serif",
    fontSans: "'Quicksand', system-ui, sans-serif",
    fontDisplay: "'Caveat', cursive",
    brandSmall: 'AROMATIZANTES · ITALIA',
    brandBig: 'Little Joe',     // Capitalización oficial
    tagline: '',                 // Sin tagline frase
    footerUrl: 'littlejoe.pe',
    heroTitle: 'Esta semana',
    // Logo blanco PNG sobre cielo cartoon — necesita filter invert para volverse
    // navy oscuro (espejo del "Little Joe®" negro del post DM)
    logoBg: 'transparent',
    logoPad: '0',
  },
  kintu: {
    style: 'wellness-organic',
    // Estilo v2 (22-may-2026, Pedro: combinar elementos de carruseles reales):
    // Editorial wellness consciente con firma visual "tarjeta verde profundo +
    // texto blanco extrabold uppercase" (espejo del 'CANSADAS' en carrusel ¿Por qué
    // nace Kintu?). Verde profundo es el protagonista, NO verde Kintu medio.
    primary: '#1A3E42',       // Verde profundo Manual pág. 6 (texto + firma)
    accent: '#45B787',        // Verde Kintu Manual pág. 6 (acentos secundarios)
    highlight: '#BBE0CD',     // Verde menta Manual pág. 6 (formas orgánicas suaves)
    canvas: '#F8FBF5',        // Off-white casi blanco con tinte verdoso muy sutil
    text: '#1A3E42',
    cardBg: '#FFFFFF',
    cardAltBg: '#F2F8EE',     // Alterno muy claro
    // Manual oficial pág. 7: Montserrat estricto en TODAS las jerarquías.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
    fontSerif: "'Montserrat', system-ui, sans-serif",
    fontSans: "'Montserrat', system-ui, sans-serif",
    brandSmall: 'ESSENTIAL OILS',
    brandBig: 'kintu',
    tagline: '',                  // Sin tagline frase (aprendizaje DF)
    footerUrl: 'kintuoils.com',
    heroTitle: 'Tu semana en calma',
    // Logo positivo (verde sobre blanco) — sin wrapper, ya está sobre canvas blanco
    logoBg: 'transparent',
    logoPad: '0',
  },
  novalamps: {
    style: 'led-technical',
    // Estilo v2 (22-may-2026, basado en post DM 2026 NovaLamps real):
    // Editorial dark luxury · serif moderna + verde lima acento + sub eléctrika.
    // El equipo del cliente ya evolucionó del manual base (Arial sans plano)
    // hacia un editorial premium con serif Bodoni-like + verde lima underlines.
    primary: '#FFFFFF',        // Texto blanco sobre dark
    accent: '#D2DD00',         // Verde lima Novalamps oficial (PROTAGONISTA)
    highlight: '#E4F000',      // Lima más brillante (variación)
    canvas: '#1A1A1A',         // Grafito muy oscuro (mix #262726 + algo más oscuro)
    text: '#FFFFFF',
    cardBg: '#FFFFFF',         // Cards blancas (legibilidad 7 días)
    cardAltBg: '#FAFAFA',
    // Post DM real usa SERIF MODERNA Bodoni-like, NO Arial. OSS: Playfair Display.
    // Inter para body/labels (mantiene neutralidad técnica como pide manual).
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@500;600&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    brandSmall: 'eléctrika',     // Sub-marca línea MAX
    brandBig: 'Novalamps',
    tagline: '',                  // Sin tagline (aprendizaje)
    footerUrl: 'novalamps.com.pe',
    heroTitle: 'Esta semana',
    // Logo aspect 4.32:1 (banner plano). Sin wrapper sobre canvas dark.
    // Filter para llevar negro+lima a blanco+lima visible.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'la-victoria': {
    style: 'wood-industrial',
    // Estilo v2 (22-may-2026, basado en pieza Día del Trabajador):
    // Profesional industrial cinematográfico · canvas verde bosque MUY oscuro
    // (NO blanco crema) + foto sutil overlay + tipografía serif moderna semibold
    // ALL CAPS BLANCO + firma visual = pill verde con em-dashes "— TEXTO —".
    primary: '#F5EDD8',        // Crema madera (texto sobre dark — color del logo en negativo)
    accent: '#C9A87A',         // Madera clara dorada (acentos secundarios)
    highlight: '#8B6F47',      // Marrón madera (acentos terciarios)
    canvas: '#0A2A1F',         // Verde bosque MUY OSCURO (background protagonista)
    text: '#F5EDD8',
    cardBg: '#FFFCEB',         // Cards blanco crema (paneles editoriales)
    cardAltBg: '#F2E8D0',      // Card alterno
    // Brochure: serif moderna semibold + sans tracking ancho uppercase
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    brandSmall: 'DISTRIBUIDORA DE PINO',
    brandBig: 'LA VICTORIA',
    tagline: '',                  // Sin tagline (aprendizaje DF/Kintu)
    footerUrl: 'WhatsApp · 973 991 208',  // CTA del brochure
    heroTitle: 'Esta semana',
    // Logo aspect 1.57:1 (stack vertical símbolo+wordmark). Sin wrapper.
    // El logo es verde bosque sobre dark → necesita filter para volverse crema.
    logoBg: 'transparent',
    logoPad: '0',
  },
}

export function getTheme(slug: string): GrillaTheme {
  return THEMES[slug] ?? THEMES.manrique
}
