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
  | 'nature-vitality'    // Vid Natur    — Poppins + hojas + naranja/verde wellness
  | 'artisan-boutique'  // Mil Ideas   — Playfair + crema/coral/dorado + ornamentos cálidos
  | 'agency-bold'       // Distinto     — Inter Tight + morado/amarillo + pétalos (isotipo)
  | 'studio-tech'       // Distinto Studio — Poppins + azul profundo + verde + degradado
  | 'industrial-practical' // Praktico    — Barlow Condensed + negro/madera + cuadrícula técnica

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
    // REBRAND v4 (22-may-2026): Little Joe → TYPHOUSE.
    // Logo TP celeste + gotas/splash + wordmark "typhouse" sans bold rounded.
    // Sistema visual: blanco limpio editorial + celeste TP + negro.
    // Quitado fondo cielo cartoon (era para Little Joe — Typhouse es editorial).
    primary: '#0A0A0A',          // Negro suave para texto
    accent: '#1FB3E8',           // Celeste Typhouse (color del símbolo TP+splash)
    highlight: '#5DC8EF',        // Celeste más claro
    canvas: '#FAFBFC',           // Blanco crema muy sutil
    text: '#0A0A0A',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4F9FC',        // Blanco con tinte celeste muy sutil
    // Quicksand bold rounded (coherente con wordmark "typhouse") +
    // Caveat cursive opcional para palabras destacadas + Fraunces para body
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Fraunces:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Quicksand:wght@400;500;600;700&display=swap',
    fontSerif: "'Fraunces', Georgia, serif",
    fontSans: "'Quicksand', system-ui, sans-serif",
    fontDisplay: "'Quicksand', system-ui, sans-serif",
    brandSmall: 'AGENCIA DE DISEÑO',  // Placeholder hasta que Pedro confirme
    brandBig: 'typhouse',
    tagline: '',
    footerUrl: 'typhouse.pe',          // Placeholder hasta confirmar
    heroTitle: 'Esta semana',
    // Logo Typhouse PNG full-color (celeste + negro) sobre canvas blanco
    // → NO necesita filter, ya viene listo
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
  'vid-natur': {
    style: 'nature-vitality',
    // Suplementos naturales peruanos ("Extiende tu vitalidad"). Paleta oficial
    // del manual: naranja #FF6B00 (Pantone 1505C) + verde #449647 + carbón
    // #3B3F41 sobre crema cálido. Gotham (no libre) → Poppins; Rubik secundaria.
    primary: '#3B3F41',        // Carbón — texto, títulos, hero
    accent: '#FF6B00',         // Naranja Vid Natur (acento principal)
    highlight: '#449647',      // Verde natural (acento secundario)
    canvas: '#FBF7EF',         // Crema cálido natural
    text: '#3B3F41',
    cardBg: '#FFFFFF',
    cardAltBg: '#FFFFFF',      // Ambas cards blancas; el acento es el borde izq.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Rubik:wght@400;500;600;700&display=swap',
    fontSerif: "'Poppins', system-ui, -apple-system, sans-serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Rubik', system-ui, sans-serif",
    brandSmall: 'SUPLEMENTOS NATURALES',
    brandBig: 'Vid Natur',
    tagline: '',
    footerUrl: 'vidnatur.pe',
    heroTitle: 'Esta semana',
    // Logo PNG (naranja + wordmark, casi cuadrado) sobre crema, sin wrapper.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'mil-ideas': {
    style: 'artisan-boutique',
    // Importadora boutique de decoración para el hogar ("Creamos emociones
    // visibles"). Paleta REAL muestreada del logo + milideas.pe (verificado
    // 23-jun-2026): coral #D8480C dominante + dorados + crema cálido + espresso.
    // Fuente de marca: Boston Angel (display) → fallback Playfair Display.
    // El logo coral ya trae el wordmark → brand-name se oculta en el style.
    primary: '#3D2E26',        // Espresso cálido (texto, titulares, hero) — legible y premium
    accent: '#D8480C',         // Coral Mil Ideas (date pill, dots, acentos)
    highlight: '#E2A23A',      // Dorado refinado (reglas finas, divisor)
    canvas: '#FAF5EE',         // Crema lienzo
    text: '#3D2E26',
    cardBg: '#FFFFFF',
    cardAltBg: '#FCEFE6',      // Durazno crema muy suave (card alterna)
    // Playfair Display (serif elegante, eco de Boston Angel) + Poppins body.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600&family=Poppins:wght@300;400;500;600;700&display=swap',
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    brandSmall: 'DECORACIÓN PARA EL HOGAR',
    brandBig: 'MIL IDEAS',
    tagline: '',                  // La firma va en el hero (CREAMOS EMOCIONES VISIBLES)
    footerUrl: 'milideas.pe',
    heroTitle: '¿Qué se viene?',
    // Logo coral PNG (banner 3.3:1) sobre crema, sin wrapper.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'distinto-agencia': {
    style: 'agency-bold',
    // La agencia (marca propia). Paleta REAL del Kit de Marca Distinto 2026
    // (Drive, verificado 26-jun-2026): morado #ba41f7 + amarillo #f2cc2c.
    // Fuente: Inter Tight (la misma que usa la app). Look limpio y moderno
    // sobre lienzo lavanda muy claro, con pétalos (eco del isotipo) morado/amarillo.
    primary: '#1A1330',        // Morado-negro profundo (texto, titulares, hero)
    accent: '#BA41F7',         // Morado Distinto (date pill, acentos, dots)
    highlight: '#F2CC2C',      // Amarillo Distinto (acentos secundarios, firma)
    canvas: '#FAF8FF',         // Lavanda casi blanco
    text: '#1A1330',
    cardBg: '#FFFFFF',
    cardAltBg: '#F4EEFC',      // Lavanda muy suave (card alterna)
    // Inter Tight — la tipografía de la app Distinto.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,700&display=swap',
    fontSerif: "'Inter Tight', system-ui, -apple-system, sans-serif",
    fontSans: "'Inter Tight', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Inter Tight', system-ui, sans-serif",
    brandSmall: 'AGENCIA DE MARKETING',
    brandBig: 'DISTINTO',
    tagline: '',
    footerUrl: 'agenciadistinto.com',
    heroTitle: '¿Qué se viene?',
    // Logo horizontal oficial (morado+amarillo) sobre lavanda, sin wrapper.
    logoBg: 'transparent',
    logoPad: '0',
  },
  praktico: {
    style: 'industrial-practical',
    // Distribuidor mayorista de productos prácticos. Guía visual (imagen 27-jun-2026):
    // negro #000000 (fondo protagonista) + madera natural #C89A62 + blanco + gris #2D2D2D.
    // Estética funcional/industrial: producto protagonista, textos claros y directos.
    // Barlow Condensed (display) + DM Sans (body). Isotipo: anillos concéntricos dorados.
    primary: '#FFFFFF',        // Texto blanco sobre negro
    accent: '#C89A62',         // Madera natural / dorado (date pill, acentos)
    highlight: '#DDB87A',      // Madera más clara (highlight sutil)
    canvas: '#0A0A0A',         // Negro industrial profundo
    text: '#FFFFFF',
    cardBg: '#111111',         // Cards gris oscuro (panel industrial)
    cardAltBg: '#161616',      // Gris alterno levemente más claro
    // Nunito (redondeada geométrica) replica la tipografía del wordmark oficial.
    // Barlow Condensed para hero/títulos de cards (estética industrial condensada).
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800;900&family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap',
    fontSerif: "'Barlow Condensed', 'Nunito', system-ui, sans-serif",
    fontSans: "'Nunito', 'DM Sans', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Barlow Condensed', system-ui, sans-serif",
    brandSmall: 'DISTRIBUIDOR MAYORISTA DE PRODUCTOS PRACTICOS',
    brandBig: 'Praktico',
    tagline: '',
    footerUrl: '@praktico.oficial',
    heroTitle: 'Esta semana',
    // Isotipo: anillos concéntricos dorados (anillos de árbol) sobre negro, sin wrapper.
    logoBg: 'transparent',
    logoPad: '0',
  },
  'distinto-studio': {
    style: 'studio-tech',
    // Distinto WEB STUDIO (sub-marca de la agencia). Manual oficial (Drive,
    // verificado 27-jun-2026): azul profundo #132D46 + verde vibrante #4ADE80
    // + degradado verde->azul como elemento clave. Tipografía: Poppins.
    // Look dark, tech, digital studio. Lienzo azul, cards blancas, acentos verdes.
    primary: '#FFFFFF',        // Texto blanco sobre azul oscuro
    accent: '#4ADE80',         // Verde vibrante (date pill, acentos, degradado)
    highlight: '#7DF0A6',      // Verde claro (divisor/highlight)
    canvas: '#132D46',         // Azul profundo (fondo principal del manual)
    text: '#FFFFFF',
    cardBg: '#FFFFFF',         // Cards blancas para legibilidad sobre dark
    cardAltBg: '#EAFBF1',      // Verde muy claro (card alterna)
    // Manual: Poppins para todo el sistema tipografico web.
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
    fontSerif: "'Poppins', system-ui, -apple-system, sans-serif",
    fontSans: "'Poppins', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Poppins', system-ui, sans-serif",
    brandSmall: 'STUDIO',
    brandBig: 'DIST/NTO',
    tagline: '',
    footerUrl: 'agenciadistinto.com',
    heroTitle: '¿Qué se viene?',
    // Isotipo (degradado verde->azul) pequeno, sin wrapper.
    logoBg: 'transparent',
    logoPad: '0',
  },
}

export function getTheme(slug: string): GrillaTheme {
  return THEMES[slug] ?? THEMES.manrique
}
