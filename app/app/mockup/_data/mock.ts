// Mock data realista para el mockup.
// Las 9 marcas reales con info verosímil pero inventada para no exponer datos.

export type Marca = {
  slug: string
  nombre: string
  emoji: string
  color: string  /* var(--mk-brand-*) */
  industria: string
  city: string
  pendientes: {
    grilla: number
    comentarios: number
    publicaciones: number
  }
  ultimaActividad: string  /* relative time */
}

export const MARCAS: Marca[] = [
  {
    slug: 'manrique',
    nombre: 'Centro Psicológico Manrique',
    emoji: '🧠',
    color: 'var(--mk-brand-manrique)',
    industria: 'Salud mental',
    city: 'Lince',
    pendientes: { grilla: 1, comentarios: 13, publicaciones: 3 },
    ultimaActividad: 'hace 2 h',
  },
  {
    slug: 'lozano',
    nombre: 'Muebles Lozano SAC',
    emoji: '🪵',
    color: 'var(--mk-brand-lozano)',
    industria: 'Mobiliario a medida',
    city: 'San Juan de Lurigancho',
    pendientes: { grilla: 0, comentarios: 4, publicaciones: 5 },
    ultimaActividad: 'hace 6 h',
  },
  {
    slug: 'kintu',
    nombre: 'KintuOils',
    emoji: '🌿',
    color: 'var(--mk-brand-kintu)',
    industria: 'Aceites esenciales',
    city: 'Miraflores',
    pendientes: { grilla: 1, comentarios: 2, publicaciones: 0 },
    ultimaActividad: 'hace 1 d',
  },
  {
    slug: 'novalamps',
    nombre: 'Novalamps Perú',
    emoji: '💡',
    color: 'var(--mk-brand-novalamps)',
    industria: 'Iluminación LED',
    city: 'Surco',
    pendientes: { grilla: 0, comentarios: 8, publicaciones: 2 },
    ultimaActividad: 'hace 4 h',
  },
  {
    slug: 'lavictoria',
    nombre: 'La Victoria Maderera',
    emoji: '🪚',
    color: 'var(--mk-brand-lavictoria)',
    industria: 'Carpintería industrial',
    city: 'La Victoria',
    pendientes: { grilla: 1, comentarios: 1, publicaciones: 7 },
    ultimaActividad: 'hace 3 h',
  },
  {
    slug: 'distrifitness',
    nombre: 'Distribuidora Fitness',
    emoji: '💪',
    color: 'var(--mk-brand-distrifitness)',
    industria: 'Equipamiento gym',
    city: 'San Borja',
    pendientes: { grilla: 0, comentarios: 23, publicaciones: 4 },
    ultimaActividad: 'hace 1 h',
  },
  {
    slug: 'littlejoe',
    nombre: 'Little Joe · Typhouse',
    emoji: '🍝',
    color: 'var(--mk-brand-littlejoe)',
    industria: 'Restaurante italiano',
    city: 'Barranco',
    pendientes: { grilla: 1, comentarios: 6, publicaciones: 1 },
    ultimaActividad: 'hace 30 m',
  },
  {
    slug: 'warriorsupps',
    nombre: 'Warriorupps.pe',
    emoji: '⚡',
    color: 'var(--mk-brand-warriorsupps)',
    industria: 'Suplementos deportivos',
    city: 'San Isidro',
    pendientes: { grilla: 0, comentarios: 11, publicaciones: 2 },
    ultimaActividad: 'hace 8 h',
  },
  {
    slug: 'oralbeauty',
    nombre: 'Oral Beauty',
    emoji: '✨',
    color: 'var(--mk-brand-oralbeauty)',
    industria: 'Cuidado dental estético',
    city: 'Pueblo Libre',
    pendientes: { grilla: 1, comentarios: 5, publicaciones: 0 },
    ultimaActividad: 'hace 12 h',
  },
]

// Comentarios pendientes mock para vista cockpit
export type Comentario = {
  id: string
  marcaSlug: string
  red: 'instagram' | 'facebook' | 'tiktok'
  autor: string
  texto: string
  postPreview: string
  hace: string
  categoria: 'consulta' | 'interes_compra' | 'agradecimiento' | 'queja' | 'tag_amigo' | 'spam' | 'otro'
  urgencia: 'high' | 'medium' | 'low'
}

export const COMENTARIOS_PENDIENTES: Comentario[] = [
  {
    id: '1',
    marcaSlug: 'manrique',
    red: 'instagram',
    autor: 'mariafer.lopez',
    texto: 'Hola, atienden niños de 4 años con sospecha de TEA?',
    postPreview: 'Reel · Evaluación neuropsicológica',
    hace: '12 min',
    categoria: 'consulta',
    urgencia: 'high',
  },
  {
    id: '2',
    marcaSlug: 'distrifitness',
    red: 'instagram',
    autor: 'crossfit_jorge',
    texto: 'Cuanto sale el rack squat con polea? Quiero uno YA 💪',
    postPreview: 'Post · Equipos para box',
    hace: '34 min',
    categoria: 'interes_compra',
    urgencia: 'high',
  },
  {
    id: '3',
    marcaSlug: 'lozano',
    red: 'facebook',
    autor: 'Carla Mendoza',
    texto: 'Hacen muebles a medida para departamento pequeño?',
    postPreview: 'Carrusel · Closets a medida',
    hace: '1 h',
    categoria: 'consulta',
    urgencia: 'medium',
  },
  {
    id: '4',
    marcaSlug: 'littlejoe',
    red: 'instagram',
    autor: 'foodie.lima',
    texto: 'Tienen delivery a Surquillo? 🍕',
    postPreview: 'Reel · Pizza margherita',
    hace: '1 h',
    categoria: 'consulta',
    urgencia: 'high',
  },
  {
    id: '5',
    marcaSlug: 'kintu',
    red: 'instagram',
    autor: 'wellness_andrea',
    texto: 'Excelente producto, mi piel mejoró muchísimo ❤️',
    postPreview: 'Post · Aceite de rosa mosqueta',
    hace: '2 h',
    categoria: 'agradecimiento',
    urgencia: 'low',
  },
  {
    id: '6',
    marcaSlug: 'novalamps',
    red: 'tiktok',
    autor: 'arquitecto.luis',
    texto: 'Qué watts tiene la línea downlight slim?',
    postPreview: 'Video · Showroom Surco',
    hace: '2 h',
    categoria: 'consulta',
    urgencia: 'medium',
  },
  {
    id: '7',
    marcaSlug: 'manrique',
    red: 'facebook',
    autor: 'Pedro Sánchez',
    texto: 'Llevé a mi hijo y la atención no fue como prometieron. Mal servicio.',
    postPreview: 'Post · Terapia conductual',
    hace: '3 h',
    categoria: 'queja',
    urgencia: 'high',
  },
  {
    id: '8',
    marcaSlug: 'warriorsupps',
    red: 'instagram',
    autor: 'gym_master',
    texto: '@franco_lift mira esto bro 🔥',
    postPreview: 'Reel · Whey isolate 5lb',
    hace: '4 h',
    categoria: 'tag_amigo',
    urgencia: 'low',
  },
]

// Grillas próximas a enviar (top de la cockpit)
export type Grilla = {
  marcaSlug: string
  fechaInicio: string  /* "Lun 26" */
  fechaFin: string     /* "Dom 1 Jun" */
  publicaciones: number
  estado: 'aprobada' | 'pendiente' | 'borrador'
  proximoEnvio: string  /* "Hoy 18:30" */
}

export const GRILLAS_SEMANA: Grilla[] = [
  { marcaSlug: 'manrique', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 6, estado: 'aprobada', proximoEnvio: 'Hoy 18:30' },
  { marcaSlug: 'lozano', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 5, estado: 'aprobada', proximoEnvio: 'Hoy 18:30' },
  { marcaSlug: 'kintu', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 4, estado: 'pendiente', proximoEnvio: 'Mañana 18:30' },
  { marcaSlug: 'lavictoria', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 7, estado: 'borrador', proximoEnvio: '—' },
  { marcaSlug: 'littlejoe', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 5, estado: 'aprobada', proximoEnvio: 'Hoy 18:30' },
  { marcaSlug: 'oralbeauty', fechaInicio: 'Lun 26', fechaFin: 'Dom 1', publicaciones: 4, estado: 'pendiente', proximoEnvio: 'Mañana 18:30' },
]

// Métricas del cockpit
export const METRICAS = {
  publicacionesEstaSemana: 47,
  comentariosRespondidos: 124,
  comentariosPendientes: 73,
  grillasEnviadas: 6,
  grabacionesSemana: 3,
  ingresoMes: 18750,    /* S/ */
  ingresoMesPasado: 16200,
}

// Hábitos del cockpit personal
export const HABITOS_HOY = [
  { id: 'h1', titulo: 'Revisar inbox comentarios', completado: true, hora: '08:30' },
  { id: 'h2', titulo: 'Daily standup equipo', completado: true, hora: '09:00' },
  { id: 'h3', titulo: 'Aprobar grilla del día', completado: false, hora: '18:00' },
  { id: 'h4', titulo: 'Cerrar cuentas Distinto', completado: false, hora: '20:30' },
]

// Próximas grabaciones
export const GRABACIONES_PROXIMAS = [
  { fecha: 'Mar 27', hora: '10:00', marca: 'manrique', tipo: 'Reel TDAH parte 2' },
  { fecha: 'Mié 28', hora: '15:30', marca: 'lozano', tipo: 'Carrusel closets' },
  { fecha: 'Vie 30', hora: '09:00', marca: 'distrifitness', tipo: 'Video equipos box' },
]
