// Catálogo comercial Distinto — fuente: Setter Attlas (propuestas revisadas con PIER).
// Precios en S/ sin IGV salvo donde se indique. No inventar fees.

export type PlanCategoria = 'social' | 'web' | 'adicional'

export type PlanItem = {
  id: string
  categoria: PlanCategoria
  nombre: string
  precioLabel: string
  precioDesde?: number
  precioHasta?: number
  periodo: string
  minimo?: string
  aplica?: string
  incluye: string[]
  noIncluye: string[]
  notas?: string[]
  destacado?: boolean
}

export const REGLAS_COMERCIALES: string[] = [
  'Precios cotizan sin IGV (salvo Ecommerce Premium Novacell/Dennys, IGV incluido).',
  'Recibo por honorarios o factura +18% IGV.',
  'La inversión publicitaria la paga el cliente a Meta/Google/TikTok.',
  'Si la pauta supera S/ 3,000/mes → fee extra 10% sobre el excedente.',
  'Dominio, hosting, Shopify, Kommo, apps y licencias = cliente.',
  'Máximo 2 rondas de ajustes por pieza.',
  'No vender pauta como incluida; no community 24/7; no mezclar marcas en un fee.',
  'Horario equipo: lun–vie 9:00–17:00.',
]

export const PLANES: PlanItem[] = [
  {
    id: 'sm-contenido',
    categoria: 'social',
    nombre: 'Social Media Contenido Mensual',
    precioLabel: 'S/ 1,200',
    precioDesde: 1200,
    periodo: 'mensual',
    minimo: 'mín. 3 meses',
    aplica: 'Marcas que necesitan presencia profesional mensual.',
    incluye: [
      'Gestión de redes y parrilla',
      '12 posts/mes (3/semana)',
      'Historias día por medio (máx. 2/día)',
      'Guiones/copys y diseño IG/redes',
      'Community + grupo WhatsApp',
      'Reunión semanal con dueños + reunión mensual de balance',
      'Asesoría de crecimiento y reporte mensual',
      'Hasta 2 rondas por pieza',
      '1 full day de grabación en local (iPhone; filmmaker pro si hay fecha)',
      'Banco de material',
      'Asesoría FB/IG Ads (sin ejecución)',
    ],
    noIncluye: [
      'Ejecución/optimización diaria de pauta',
      'Inversión ads',
      'Web, Kommo/bots, dominio/hosting',
      'Producciones fuera del full day',
      'Atención 24/7',
    ],
  },
  {
    id: 'sm-integration',
    categoria: 'social',
    nombre: 'Integration',
    precioLabel: 'S/ 1,500',
    precioDesde: 1500,
    periodo: 'mensual',
    minimo: 'mín. 1 mes',
    aplica: 'Marcas que entran a redes con autogestión de publicación.',
    incluye: [
      '1 jornada/mes (iPhone 17 Pro Max/17 + luces/estabilizador)',
      'Dirección AV + guiones/ángulos de venta',
      '10 videos verticales listos (Reels/TikTok/FB) con subtítulos/música/copy',
      'Drive + hasta 2 rondas',
      'App de publicación IG+FB+TikTok (contenido cargado/programado)',
      'Capacitación de la app + métricas/carpetas',
      '1 campaña Facebook/mes (config, segmentación, creativos, opt semanal)',
      'Reporte + 1 sesión comercial hasta 90 min',
      'Arranque de canales si parte de cero (IG/FB/TikTok + Google Business)',
    ],
    noIncluye: [
      'Community/DMs (el cliente publica)',
      'Inversión ads',
      'Google/TikTok ads',
      'Posts estáticos/catálogo, web, CRM',
      'Grabaciones extra',
    ],
    notas: [
      'Pauta recomendada desde USD 10/día',
      'Si inversión > S/ 3,000/mes → fee 10% sobre el excedente',
    ],
  },
  {
    id: 'sm-integration-pro',
    categoria: 'social',
    nombre: 'Integration Pro',
    precioLabel: 'S/ 1,800',
    precioDesde: 1800,
    periodo: 'mensual',
    minimo: 'mín. 1 mes',
    aplica: 'Redes + pauta agresiva en 3 plataformas.',
    incluye: [
      'Contenido, optimización de canales, parrilla y calendario',
      'Guiones/copys, diseño, community, asesoría, grupo WA',
      'Aprobación previa, informe semanal de grilla, reporte mensual, 2 rondas',
      '2 visitas de 6 h/mes',
      'Paid: Meta + TikTok + Google hasta S/ 3,000 de inversión (cliente paga pauta)',
      'Audiencias/eventos/tracking, creativos si hace falta, opt semanal, reporte',
    ],
    noIncluye: [
      'Kommo/bot, web, catálogo',
      'Inversión ads',
      'Producciones fuera de visitas',
      'Dominio/hosting, 24/7',
    ],
    notas: ['Misma regla 10% si pauta > S/ 3,000'],
    destacado: true,
  },
  {
    id: 'sm-ecommerce',
    categoria: 'social',
    nombre: 'Integration + Ecommerce / Gestión Digital',
    precioLabel: 'S/ 2,800',
    precioDesde: 2800,
    periodo: 'mensual',
    minimo: 'mín. 3 meses',
    aplica: '1 marca (no mezclar 2 marcas en un fee). Contenido + diseño + pub + pauta Meta + CRM/WA + web básica.',
    incluye: [
      'AV: 3 jornadas de 4 h; 18 videos de contenido + 4 videos ads; Drive',
      'Diseño: 12 historias; 2 carruseles (~10 piezas); portadas de los 18 videos; apoyo logo/web puntual; 2 rondas',
      'Pub + influencers: programación/copys; 40 contactos influencers/mes (8×5); seguimiento (pago influencers no incluido)',
      'Ads/CRM/WA: 3 campañas Meta/mes; opt semanal; mantenimiento Kommo básico; 1 campaña WA marketing/mes',
      'Web básica: textos, precios, fotos mismo tamaño, contacto, orden productos, cambios en secciones existentes',
      'App reportes, calendario, Drive, 1 reunión mensual',
    ],
    noIncluye: [
      'Inversión ads',
      'Rediseño/bloques nuevos web',
      'Pago a influencers',
      'Google/TikTok salvo extra',
      'Licencia Kommo, dominio/hosting, bots avanzados nuevos',
    ],
  },
  {
    id: 'sm-forneed',
    categoria: 'social',
    nombre: 'Forneed',
    precioLabel: 'S/ 3,500',
    precioDesde: 3500,
    periodo: 'mensual',
    minimo: 'mín. 3 meses',
    aplica: 'Todo-en-uno: social + paid 3 plataformas + automatización + mantenimiento web.',
    incluye: [
      'Social como Integration Pro + 2 visitas 6 h (filmmaker + editor)',
      'Paid Meta/TikTok/Google hasta S/ 3,000; tracking; creativos; opt semanal; reporte',
      'Implementación Kommo (embudo, bot WA inicial, leads Meta, plantillas, dashboard, manual, capacitación)',
      'Web mantenimiento: plugins, fichas/categorías, banners, textos/imágenes existentes, monitoreo, soporte caídas menores',
    ],
    noIncluye: [
      'Catálogo completo / web from scratch',
      'Inversión ads, dominio/hosting',
      'Licencia Kommo (la paga el cliente)',
      'Producciones fuera de visitas, IA agents, integraciones enterprise, rediseño, 24/7',
    ],
    notas: ['Fee 10% si pauta > S/ 3,000'],
    destacado: true,
  },
  {
    id: 'web-shopify-express',
    categoria: 'web',
    nombre: 'Shopify Express',
    precioLabel: 'S/ 900',
    precioDesde: 900,
    periodo: 'pago único · 50% adelanto / 50% al final',
    minimo: '10 días hábiles',
    incluye: [
      'Tienda Shopify simple: 3 estructuras, config, textos/productos flexibles',
      'Concepto creativo, carga rápida, SEO copy, responsive',
      'WA flotante, animaciones puntuales, menú +5 secciones, banners, prep ads',
    ],
    noIncluye: [
      'Plan Shopify (~21 USD/mes), dominio, hosting',
      'Cambios grandes post-aprobación de estructura',
    ],
  },
  {
    id: 'web-rediseno-ligero',
    categoria: 'web',
    nombre: 'Rediseño Ecommerce Ligero (Elementor)',
    precioLabel: 'S/ 1,400',
    precioDesde: 1400,
    periodo: 'pago único · 50% adelanto / 50% al final',
    minimo: '15 días hábiles',
    incluye: [
      'Rediseño Figma (2 rondas + 1 en final)',
      'Ecommerce Elementor (carrito, stock, filtros, buscador, pagos)',
      'Responsive, prep ads, SEO copy, seguridad WPS Hide Login, WA, animaciones',
      '1 sesión foto (15 fotos) + 1 video corporativo + banners',
    ],
    noIncluye: ['Hosting/dominio', 'Cambios post diseño final'],
  },
  {
    id: 'web-presencia',
    categoria: 'web',
    nombre: 'Web Presencia / Servicios (WordPress)',
    precioLabel: 'S/ 2,500',
    precioDesde: 2500,
    periodo: 'pago único · 50% adelanto / 50% al final',
    minimo: '30 días hábiles',
    incluye: [
      'Figma (2 rondas + 1 final) + WordPress',
      'SEO base, seguridad, WA, +5 secciones / hasta +10 subpáginas',
      'Banners, GA, publicación + capacitación admin',
      'Proceso: Meet brief → wireframes → info → competencia → diseño → dev → validación',
    ],
    noIncluye: ['Dominio/hosting', 'Cambios estructurales post diseño aprobado'],
    notas: ['Aclarar IGV en la cotización'],
  },
  {
    id: 'web-ecommerce-wp',
    categoria: 'web',
    nombre: 'Ecommerce WordPress',
    precioLabel: 'S/ 5,600',
    precioDesde: 5600,
    periodo: 'pago único · 50% adelanto / 50% al final',
    minimo: '45 días hábiles',
    incluye: [
      'UX/UI Figma (2 rondas + 1) + WordPress ecommerce completo',
      'Carrito, catálogo, buscador/filtros, pagos, envíos, SEO, prep Google Ads',
      '+9 secciones / hasta +25 subpáginas; a veces +3 marcas',
      '1 sesión foto 15 + 1 video; banners; GA; capacitación',
    ],
    noIncluye: ['Dominio/hosting', 'Cambios estructurales post diseño aprobado'],
  },
  {
    id: 'web-premium',
    categoria: 'web',
    nombre: 'Ecommerce Premium / Multiproducto',
    precioLabel: 'S/ 5,790–5,900',
    precioDesde: 5790,
    precioHasta: 5900,
    periodo: 'pago único · 50% adelanto / 50% al final',
    minimo: '45 días hábiles',
    aplica: 'Vender como arquitectura comercial (muchas categorías/marcas/variantes), no “solo una web”.',
    incluye: [
      'Alcance similar a Ecommerce WordPress con mayor profundidad comercial',
      'Arquitectura multiproducto / multimarca',
    ],
    noIncluye: ['Dominio/hosting'],
    notas: ['IGV incluido (fuentes Novacell/Dennys)'],
    destacado: true,
  },
  {
    id: 'web-shopify-mantenimiento',
    categoria: 'web',
    nombre: 'Mantenimiento Shopify / Cambios Rápidos',
    precioLabel: 'Fee mensual a definir',
    periodo: 'mensual',
    incluye: [
      'Cambios rápidos 24–48 h hábiles; 2 rondas; tandas semanales',
      'Bitácora; 1 consolidator del cliente',
      'Trabajo en copia de tema (nunca editar el tema publicado en vivo)',
      'Textos, precios, fotos misma proporción, contacto, productos/colecciones, metas, políticas',
    ],
    noIncluye: [
      'Bloques/páginas nuevas, paleta/logo/menú estructural',
      'Apps, pagos/checkout, DNS, CRM/SUNAT/bot',
      'Foto/video nuevos',
    ],
    notas: [
      'Permisos cliente: productos, pedidos, descuentos, contenido, analítica',
      'No editar código, temas, apps, pagos, dominios ni usuarios',
    ],
  },
  {
    id: 'add-landing',
    categoria: 'adicional',
    nombre: 'Landing / página pequeña',
    precioLabel: 'S/ 600',
    precioDesde: 600,
    periodo: 'one-shot',
    incluye: ['Landing o página pequeña como adicional a social'],
    noIncluye: [],
  },
  {
    id: 'add-landing-typhouse',
    categoria: 'adicional',
    nombre: 'Landing TypHouse',
    precioLabel: 'S/ 400',
    precioDesde: 400,
    periodo: 'one-shot',
    incluye: ['Landing específica TypHouse'],
    noIncluye: [],
  },
  {
    id: 'add-landing-medida',
    categoria: 'adicional',
    nombre: 'Desarrollo informativo / landing a medida',
    precioLabel: 'S/ 1,450',
    precioDesde: 1450,
    periodo: 'one-shot',
    incluye: ['Landing o informativa a medida'],
    noIncluye: [],
  },
  {
    id: 'add-web-ecom-info',
    categoria: 'adicional',
    nombre: 'Web ecommerce o informativa (adicional social)',
    precioLabel: 'S/ 1,800',
    precioDesde: 1800,
    periodo: 'one-shot',
    incluye: ['Web chica como adicional en propuestas social (no es el catálogo web principal)'],
    noIncluye: [],
  },
  {
    id: 'add-catalogo',
    categoria: 'adicional',
    nombre: 'Catálogo de productos',
    precioLabel: 'S/ 350',
    precioDesde: 350,
    periodo: 'one-shot',
    incluye: ['Catálogo productos (también “6 marcas AML” S/ 350)'],
    noIncluye: [],
  },
  {
    id: 'add-canva',
    categoria: 'adicional',
    nombre: 'Plantilla Canva catálogo',
    precioLabel: 'S/ 50',
    precioDesde: 50,
    periodo: 'one-shot',
    incluye: ['Plantilla Canva'],
    noIncluye: [],
  },
  {
    id: 'add-diseno-suelto',
    categoria: 'adicional',
    nombre: 'Diseño suelto / propuestas',
    precioLabel: 'S/ 50 c/u',
    precioDesde: 50,
    periodo: 'por pieza',
    incluye: ['Diseño suelto o propuesta'],
    noIncluye: [],
  },
  {
    id: 'add-kommo',
    categoria: 'adicional',
    nombre: 'Kommo + Bot WhatsApp (standalone)',
    precioLabel: 'A cotizar',
    periodo: 'one-shot / setup',
    incluye: ['Implementación Kommo + bot WA fuera de Forneed'],
    noIncluye: ['Licencia Kommo (cliente)'],
  },
  {
    id: 'add-hostinger',
    categoria: 'adicional',
    nombre: 'Hostinger (referencial)',
    precioLabel: 'S/ 15/mes',
    precioDesde: 15,
    periodo: 'mensual · paga el cliente',
    incluye: ['Referencia de hosting'],
    noIncluye: [],
  },
]

export function planesPorCategoria(cat: PlanCategoria): PlanItem[] {
  return PLANES.filter((p) => p.categoria === cat)
}

/** Solo Pedro (CEO). No Erick ni otros directors. */
export function esPedroEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === 'pedro@agenciadistinto.com'
}
