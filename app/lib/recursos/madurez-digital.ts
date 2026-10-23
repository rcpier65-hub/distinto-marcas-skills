export type MaturityDimensionId = 'estrategia' | 'demanda' | 'ventas' | 'operaciones' | 'datos' | 'experiencia'
export type MaturityGoal = 'demanda' | 'ventas' | 'eficiencia' | 'experiencia'

export type MaturityQuestion = {
  id: string
  dimension: MaturityDimensionId
  prompt: string
  answers: [string, string, string, string, string]
}

export const maturityDimensions: Array<{ id: MaturityDimensionId; name: string; short: string }> = [
  { id: 'estrategia', name: 'Estrategia y liderazgo', short: 'Estrategia' },
  { id: 'demanda', name: 'Presencia y generación de demanda', short: 'Demanda' },
  { id: 'ventas', name: 'Ventas y seguimiento', short: 'Ventas' },
  { id: 'operaciones', name: 'Procesos y automatización', short: 'Operaciones' },
  { id: 'datos', name: 'Datos y decisiones', short: 'Datos' },
  { id: 'experiencia', name: 'Experiencia y adopción del equipo', short: 'Experiencia' },
]

const scale = (none: string, basic: string, defined: string, connected: string, optimized: string): [string, string, string, string, string] => [none, basic, defined, connected, optimized]

export const maturityQuestions: MaturityQuestion[] = [
  { id: 'e1', dimension: 'estrategia', prompt: '¿Cómo se decide qué iniciativas digitales se ejecutan?', answers: scale('Por urgencias o intuición', 'Hay ideas, sin prioridades', 'Existe un plan trimestral', 'El plan conecta áreas y presupuesto', 'Se prioriza por impacto y aprendizaje') },
  { id: 'e2', dimension: 'estrategia', prompt: '¿Quién es responsable del avance digital?', answers: scale('Nadie de forma clara', 'El dueño cuando puede', 'Hay un responsable', 'Hay responsables por proceso', 'Dirección revisa metas y bloqueos') },
  { id: 'e3', dimension: 'estrategia', prompt: '¿La propuesta y el cliente ideal están definidos?', answers: scale('No están definidos', 'Se describen de forma general', 'Están escritos', 'Guían campañas y ventas', 'Se validan con datos y entrevistas') },
  { id: 'e4', dimension: 'estrategia', prompt: '¿Cómo se asigna presupuesto a tecnología y marketing?', answers: scale('Solo cuando hay problemas', 'Por acciones aisladas', 'Hay un presupuesto básico', 'Se asigna por objetivos', 'Se reasigna según retorno y capacidad') },

  { id: 'd1', dimension: 'demanda', prompt: '¿Su presencia digital explica claramente por qué elegirlos?', answers: scale('No tenemos presencia activa', 'Tenemos perfiles o web desactualizados', 'Mensaje y servicios están claros', 'Canales, campañas y contenido se conectan', 'Se personaliza por segmento e intención') },
  { id: 'd2', dimension: 'demanda', prompt: '¿Cómo producen contenido?', answers: scale('Improvisamos o no publicamos', 'Publicamos cuando hay tiempo', 'Usamos un calendario mensual', 'Trabajamos con pilares, formatos y responsables', 'Repetimos aprendizajes según resultados') },
  { id: 'd3', dimension: 'demanda', prompt: '¿Cómo generan oportunidades nuevas?', answers: scale('Solo por recomendaciones', 'Hacemos acciones esporádicas', 'Hay uno o dos canales constantes', 'Campañas y contenido alimentan un embudo', 'Diversificamos y medimos costo y calidad') },
  { id: 'd4', dimension: 'demanda', prompt: '¿Qué ocurre con una campaña o contenido que funciona?', answers: scale('No sabemos si funcionó', 'Lo celebramos, pero no documentamos', 'Registramos el resultado', 'Creamos variantes y series', 'Escalamos con reglas y control de fatiga') },

  { id: 'v1', dimension: 'ventas', prompt: '¿Dónde quedan registrados los prospectos?', answers: scale('Chats o memoria', 'Hojas separadas', 'Una base compartida', 'CRM con etapas y responsables', 'CRM integrado con marketing y operación') },
  { id: 'v2', dimension: 'ventas', prompt: '¿Cómo se hace seguimiento a una consulta?', answers: scale('Depende de quien la vea', 'Se responde, sin cadencia', 'Hay pasos y recordatorios', 'Hay automatizaciones con intervención humana', 'Se optimiza por conversión y tiempo de respuesta') },
  { id: 'v3', dimension: 'ventas', prompt: '¿La propuesta comercial se adapta al diagnóstico?', answers: scale('Se envía información genérica', 'Se cotiza por pedido', 'Hay una propuesta estándar clara', 'Se personaliza por problema y alcance', 'Se conecta a datos, capacidad y margen') },
  { id: 'v4', dimension: 'ventas', prompt: '¿Conocen por qué ganan o pierden ventas?', answers: scale('No lo registramos', 'Tenemos impresiones', 'Registramos motivos básicos', 'Analizamos por canal y etapa', 'Usamos el análisis para cambiar oferta y proceso') },

  { id: 'o1', dimension: 'operaciones', prompt: '¿Los procesos clave están documentados?', answers: scale('Viven en la cabeza de personas', 'Hay mensajes y archivos sueltos', 'Los procesos principales están escritos', 'Tienen responsables, estados y tiempos', 'Se revisan con métricas y mejoras') },
  { id: 'o2', dimension: 'operaciones', prompt: '¿Las herramientas comparten información?', answers: scale('Cada área trabaja aislada', 'Se copia información manualmente', 'Hay una fuente principal', 'Las herramientas clave están integradas', 'Los flujos son trazables de punta a punta') },
  { id: 'o3', dimension: 'operaciones', prompt: '¿Qué tan automatizadas están las tareas repetitivas?', answers: scale('Todo es manual', 'Usamos plantillas', 'Hay automatizaciones puntuales', 'Hay flujos con validaciones y alertas', 'Se mide ahorro, error y excepciones') },
  { id: 'o4', dimension: 'operaciones', prompt: '¿Cómo protegen accesos, respaldos y datos?', answers: scale('Sin reglas consistentes', 'Contraseñas y copias manuales', 'Accesos por rol y copias regulares', 'Revisión, baja de accesos e incidentes', 'Controles probados y mejora continua') },

  { id: 'a1', dimension: 'datos', prompt: '¿Qué indicadores revisan para dirigir el negocio?', answers: scale('Solo ventas o saldo', 'Vemos métricas dispersas', 'Hay indicadores por área', 'Existe un tablero periódico', 'Los indicadores activan decisiones concretas') },
  { id: 'a2', dimension: 'datos', prompt: '¿Pueden relacionar marketing con ventas?', answers: scale('No', 'Solo preguntamos cómo llegó', 'Registramos fuente o campaña', 'Seguimos el recorrido hasta la venta', 'Medimos valor, margen y recompra por canal') },
  { id: 'a3', dimension: 'datos', prompt: '¿La información es confiable y accesible?', answers: scale('Hay versiones contradictorias', 'Se corrige a mano', 'Hay formatos y responsables', 'Hay una fuente compartida y validaciones', 'Calidad, permisos y trazabilidad se controlan') },
  { id: 'a4', dimension: 'datos', prompt: '¿Cómo prueban cambios antes de escalarlos?', answers: scale('Cambiamos sin medir', 'Comparamos períodos informalmente', 'Definimos una meta', 'Probamos una variable y documentamos', 'Tenemos una cartera de experimentos priorizada') },

  { id: 'x1', dimension: 'experiencia', prompt: '¿El cliente recibe una experiencia coherente entre canales?', answers: scale('Cada canal responde distinto', 'Depende de la persona', 'Hay criterios de atención', 'Historial y promesa se comparten', 'La experiencia se diseña y mide por etapa') },
  { id: 'x2', dimension: 'experiencia', prompt: '¿Cómo recogen y usan comentarios de clientes?', answers: scale('No lo hacemos', 'Leemos comentarios sueltos', 'Hacemos encuestas o registro', 'Cerramos el ciclo con responsables', 'El aprendizaje cambia producto, contenido y servicio') },
  { id: 'x3', dimension: 'experiencia', prompt: '¿El equipo adopta las herramientas y procesos?', answers: scale('Cada uno trabaja a su manera', 'Hay resistencia o uso parcial', 'Existe capacitación básica', 'Se mide adopción y se acompaña', 'El equipo propone mejoras y comparte conocimiento') },
  { id: 'x4', dimension: 'experiencia', prompt: '¿Qué ocurre después de la venta?', answers: scale('No hay proceso definido', 'Se atiende cuando preguntan', 'Hay bienvenida y entrega estructurada', 'Hay seguimiento, soporte y recompra', 'Se anticipan necesidades y se mide valor de vida') },
]

export type MaturityDiagnosis = {
  score: number
  level: string
  summary: string
  dimensions: Array<{ id: MaturityDimensionId; name: string; score: number }>
  priorities: Array<{ title: string; reason: string }>
  roadmap: Array<{ period: '0–30 días' | '31–60 días' | '61–90 días'; objective: string; actions: string[]; proof: string }>
}

const actionBank: Record<MaturityDimensionId, { title: string; reason: string; actions: [string, string, string]; proof: string }> = {
  estrategia: { title: 'Alinear estrategia, cliente ideal y responsables', reason: 'Sin una prioridad compartida, la tecnología solo digitaliza el desorden.', actions: ['Definir un objetivo de 90 días y una métrica de negocio', 'Escribir cliente ideal, promesa y criterios de prioridad', 'Asignar dueño, presupuesto y revisión quincenal'], proof: 'Un tablero con objetivo, responsable, presupuesto y decisión quincenal.' },
  demanda: { title: 'Construir un sistema constante de demanda', reason: 'La visibilidad debe producir aprendizaje y oportunidades, no publicaciones aisladas.', actions: ['Elegir dos canales y tres problemas del cliente ideal', 'Planificar 12 piezas con hipótesis, formato y CTA', 'Crear una página o recurso que capture la intención'], proof: 'Un mes de contenido ejecutado y oportunidades registradas por fuente.' },
  ventas: { title: 'Cerrar las fugas entre consulta y venta', reason: 'Cada contacto perdido encarece marketing y vuelve impredecible el crecimiento.', actions: ['Centralizar prospectos y etapas en un CRM', 'Definir respuesta inicial, seguimiento y motivo de pérdida', 'Automatizar recordatorios sin perder atención humana'], proof: 'El 100% de consultas tiene dueño, etapa, próxima acción y fuente.' },
  operaciones: { title: 'Conectar procesos antes de automatizar', reason: 'La automatización funciona cuando el proceso, las excepciones y los responsables están claros.', actions: ['Mapear el proceso crítico de inicio a fin', 'Eliminar duplicación y fijar una fuente de verdad', 'Automatizar un traspaso repetitivo con alerta de error'], proof: 'Menos tiempo manual y un flujo trazable con responsables.' },
  datos: { title: 'Convertir datos dispersos en decisiones', reason: 'Medir más no ayuda si nadie sabe qué acción activa cada indicador.', actions: ['Elegir cinco indicadores ligados a ingresos, capacidad y cliente', 'Unificar definiciones y fuentes', 'Crear una reunión mensual de decisiones y experimentos'], proof: 'Un tablero único donde cada indicador tiene dueño y acción.' },
  experiencia: { title: 'Diseñar una experiencia que el equipo pueda repetir', reason: 'La promesa de marca se rompe cuando depende de una sola persona.', actions: ['Definir estándares por etapa del cliente', 'Crear bienvenida, seguimiento y cierre del servicio', 'Entrenar al equipo y recoger fricciones de clientes'], proof: 'Clientes reciben el mismo estándar y las fricciones se convierten en mejoras.' },
}

export function diagnoseMaturity(answers: Record<string, number>, goal: MaturityGoal): MaturityDiagnosis {
  const dimensions = maturityDimensions.map((dimension) => {
    const questions = maturityQuestions.filter((question) => question.dimension === dimension.id)
    const total = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0)
    return { id: dimension.id, name: dimension.name, score: Math.round((total / (questions.length * 4)) * 100) }
  })
  const score = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length)
  const [level, summary] = score < 25
    ? ['Desconectado', 'Hay herramientas o esfuerzos aislados, pero todavía no forman un sistema repetible.']
    : score < 50
      ? ['En transición', 'Ya existen bases útiles. El siguiente salto viene de conectar responsables, procesos y datos.']
      : score < 75
        ? ['Integrado', 'El negocio opera con varios procesos conectados; ahora necesita reducir fugas y aprender más rápido.']
        : ['Escalable', 'La base digital es sólida. El reto es optimizar, experimentar y proteger la calidad mientras crece.']

  const goalOrder: Record<MaturityGoal, MaturityDimensionId[]> = {
    demanda: ['demanda', 'estrategia', 'datos', 'ventas', 'experiencia', 'operaciones'],
    ventas: ['ventas', 'datos', 'demanda', 'experiencia', 'estrategia', 'operaciones'],
    eficiencia: ['operaciones', 'datos', 'estrategia', 'experiencia', 'ventas', 'demanda'],
    experiencia: ['experiencia', 'datos', 'operaciones', 'estrategia', 'ventas', 'demanda'],
  }
  const order = goalOrder[goal]
  const ranked = [...dimensions].sort((a, b) => a.score - b.score || order.indexOf(a.id) - order.indexOf(b.id))
  const selected = ranked.slice(0, 3)
  const priorities = selected.map((dimension) => ({ title: actionBank[dimension.id].title, reason: `${dimension.name}: ${dimension.score}/100. ${actionBank[dimension.id].reason}` }))
  const roadmap = selected.map((dimension, index) => {
    const periods = ['0–30 días', '31–60 días', '61–90 días'] as const
    return { period: periods[index], objective: actionBank[dimension.id].title, actions: actionBank[dimension.id].actions, proof: actionBank[dimension.id].proof }
  })
  return { score, level, summary, dimensions, priorities, roadmap }
}
