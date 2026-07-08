// Guía de Ganchos Visuales y Sonoros — contenido EXACTO de la guía que Pedro
// pasó (7 secciones). Se muestra dentro de "Checklist de video" para que Erick
// tenga presente CÓMO editar (ganchos, ritmo, efectos, sonido, receta) antes de
// verificar cada video con el checklist final.

export type Bloque =
  | { t: 'p'; texto: string }
  | { t: 'sub'; texto: string }
  | { t: 'lista'; items: string[] }
  | { t: 'tabla'; head: string[]; filas: string[][] }
  | { t: 'callout'; tono: 'rojo' | 'azul' | 'verde'; lbl: string; texto: string }
  | { t: 'chips'; items: string[] }
  | { t: 'timeline'; filas: [string, string][] }
  | { t: 'do'; siempre: string; nunca: string }

export type Seccion = { n: number; kicker: string; titulo: string; bloques: Bloque[] }

export const GUIA: Seccion[] = [
  {
    n: 1,
    kicker: 'Fundamento',
    titulo: 'La regla de oro: 3 ganchos en 3 segundos',
    bloques: [
      { t: 'p', texto: 'El usuario decide si se queda o hace scroll en menos de 2.7 segundos. Si más del 70% de la gente pasa la marca de los 3 segundos, el algoritmo interpreta que tu video engancha y lo empuja a muchísima más gente. Todo tu esfuerzo de edición se juega en esa ventana.' },
      { t: 'p', texto: 'Los videos que explotan no usan UN gancho, usan tres al mismo tiempo en el primer segundo:' },
      { t: 'chips', items: ['🎬 Gancho visual — algo que llama el ojo', '✍️ Gancho de texto — palabras que dan curiosidad', '🔊 Gancho de sonido — audio que golpea al instante'] },
      { t: 'callout', tono: 'rojo', lbl: 'La clave', texto: 'Los tres apilados. Tú a cámara diciendo la frase (visual) + el texto del gancho grande en pantalla (texto) + un golpe de sonido / música que entra fuerte (sonido). Si combinas los tres, las vistas suben. Si usas solo uno, compites en desventaja.' },
    ],
  },
  {
    n: 2,
    kicker: 'Qué se ve',
    titulo: 'Ganchos visuales',
    bloques: [
      { t: 'p', texto: 'El cerebro está programado para notar lo que rompe el patrón del feed. Tu primer frame no puede parecerse a los otros mil videos. Estas son las técnicas que funcionan:' },
      { t: 'sub', texto: 'a) Interrupción de patrón (pattern interrupt)' },
      { t: 'p', texto: 'Algo inesperado en el primer segundo que obliga a frenar: un movimiento brusco de cámara, un objeto raro en primer plano, un gesto fuerte, un cambio de escena abrupto. Ejemplo: empezar con un primerísimo plano de una laptop con la web fea del cliente y hacer zoom out revelándote a ti. Eso crea un micro-misterio ("¿qué es eso?") que retiene.' },
      { t: 'sub', texto: 'b) El "primer frame" contra-feed' },
      { t: 'lista', items: [
        'Movimiento desde el frame 1: nunca arranques quieto. Entra ya caminando, girando la cámara, o con un push-in.',
        'Alto contraste: colores fuertes, o tú muy cerca de cámara (el rostro grande retiene más que el plano abierto).',
        'Texto gigante que ocupa el tercio superior con el gancho, legible en 0.5 segundos.',
        'Prop inesperado: mostrar un fajo de billetes, un celular roto, un cartel — algo físico relacionado al tema.',
      ] },
      { t: 'sub', texto: 'c) Ganchos de movimiento (motion hooks)' },
      { t: 'p', texto: 'El estilo de los creadores de referencia vive del movimiento constante: zoom punch (empujón de zoom al decir la palabra clave), reencuadres, y "atención resets" — cada 2-3 segundos algo cambia en pantalla para que el ojo no se aburra.' },
      { t: 'callout', tono: 'azul', lbl: 'Aplícalo a tus guiones', texto: 'En el bloque GANCHO de tus scripts, el editor debe poner el texto grande + un zoom punch justo en la palabra más fuerte de la frase. Ej: en "tu trabajo NO sirve" → zoom punch + freeze en "NO sirve".' },
    ],
  },
  {
    n: 3,
    kicker: 'El ritmo',
    titulo: 'Edición para retención (estilo MrBeast, adaptado a corto)',
    bloques: [
      { t: 'p', texto: 'A esto se le llama "retention editing": mantener al espectador pegado eliminando todo tiempo muerto. Sin pausas, estímulo nuevo constante, y nada de aire muerto.' },
      { t: 'tabla', head: ['Principio', 'Cómo se aplica'], filas: [
        ['Corte cada 2-3s', 'Nunca dejes un plano quieto más de 3 segundos. Corta, cambia de ángulo o mete B-roll. El corte reinicia la atención.'],
        ['Jump cuts', 'Elimina las pausas al hablar (los "ehh", respiros, silencios). Se corta pegado para que hables sin descanso. Da urgencia y ritmo.'],
        ['Zoom punch', 'Empujón rápido de zoom para puntuar una frase importante. Es el recurso #1 de talking-head viral.'],
        ['Estímulo nuevo cada 20-30s', 'Un efecto de sonido, un cutaway, un meme, un cambio de música, una gráfica. Algo nuevo entra para resetear la atención.'],
        ['B-roll de apoyo', 'Contrastar tu plano hablando (A-roll) con imágenes de contexto (B-roll) sube la retención muchísimo.'],
        ['Subtítulos siempre', 'Palabra por palabra, animados, grandes. El 70%+ ve sin sonido al inicio. Sin subtítulos, pierdes a esa gente.'],
        ['Barra de progreso / "loop"', 'Insinuar al inicio lo mejor que viene (preview) para que se queden a verlo.'],
      ] },
      { t: 'callout', tono: 'verde', lbl: 'El B-roll es tu ventaja', texto: 'Tu material capturado en el día = el B-roll que hace que estos videos retengan. Sin B-roll, un talking-head aburre; con B-roll cada 3 segundos, retiene.' },
    ],
  },
  {
    n: 4,
    kicker: 'Herramientas concretas',
    titulo: 'Efectos, transiciones y máscaras',
    bloques: [
      { t: 'p', texto: 'Nombres reales tal como los buscas en CapCut. Regla general: menos es más — un efecto mal usado marea y la gente se va.' },
      { t: 'sub', texto: 'Efectos de impacto' },
      { t: 'tabla', head: ['Efecto', 'Para qué / cómo', 'Duración'], filas: [
        ['Zoom Punch / Punch In', 'Empujón de zoom para enfatizar una palabra o revelar algo. El más usado en talking-head.', '0.2–0.4s'],
        ['Hard Shake / Zoom + Shake', 'Sacudida fuerte sincronizada con un golpe de sonido o beat. Úsalo en el drop o la palabra más polémica.', '0.3–0.8s'],
        ['Flash / Blink', 'Destello blanco en un corte para marcar cambio de idea o beat.', '1–2 frames'],
        ['Freeze frame', 'Congelar la imagen sobre una palabra clave + texto encima. Genial para remates.', '0.5–1s'],
        ['Glitch / RGB split', 'Distorsión digital en transiciones. Encaja con temas de tecnología/web.', '0.2–0.5s'],
        ['Shake sutil (handheld)', 'Micro-movimiento constante para que el plano "respire" y no se sienta estático.', 'continuo'],
      ] },
      { t: 'sub', texto: 'Transiciones' },
      { t: 'tabla', head: ['Transición', 'Cuándo usarla'], filas: [
        ['Whip / Swish pan', 'Barrido rápido para pasar de A-roll a B-roll. Se combina con un whoosh de sonido. La más versátil.'],
        ['Zoom transition', 'Entrar/salir haciendo zoom hacia un punto. Fluida y dinámica.'],
        ['Cut on action / Match cut', 'Cortar en pleno movimiento o unir dos planos parecidos. Se siente pro y limpio.'],
        ['Beat drop transition', 'Alinear la transición con el peak de la música (Auto Beat Detection). Súper satisfactorio.'],
        ['Invisible cut / mask reveal', 'Usar una máscara (un objeto que pasa por delante) para "esconder" el corte. Efecto mágico.'],
      ] },
      { t: 'sub', texto: 'Máscaras (masking) y componentes' },
      { t: 'lista', items: [
        'Máscara de revelado: tapar el corte con un objeto que cruza el frame (tu mano, un celular, una puerta).',
        'Texto detrás del sujeto: poner el texto grande y que tu cuerpo pase por delante (efecto profundidad).',
        'Componentes/overlays: flechas, círculos, emojis, resaltados que apuntan a lo importante. Con moderación.',
        'Subtítulos animados (word-by-word): cada palabra sincronizada, con la palabra clave en otro color (rojo/amarillo).',
        'Barra de progreso / contador: un elemento que insinúa que "falta poco para lo bueno".',
      ] },
      { t: 'callout', tono: 'rojo', lbl: 'Regla anti-mareo', texto: 'Sacudidas cortas (0.3–0.8s máx). Zoom punch mínimo. Un efecto "wow" cada 15-20s, no cada 2s. El exceso de shake produce mareo y la gente hace scroll. El objetivo es ritmo, no caos.' },
    ],
  },
  {
    n: 5,
    kicker: 'Lo que casi nadie cuida',
    titulo: 'Ganchos de sonido',
    bloques: [
      { t: 'p', texto: 'El sonido es el gancho secreto: el audio tiene que golpear en el primer 1–1.5 segundos, porque esa es la ventana con la que el algoritmo predice si te van a seguir viendo.' },
      { t: 'sub', texto: 'Los tipos de sonido que debes usar' },
      { t: 'tabla', head: ['SFX', 'Para qué', 'Detalle'], filas: [
        ['Whoosh / Swish', 'En cada transición o corte rápido. Da sensación de movimiento.', 'Cortos, 0.3–0.8s, frecuencia media para no tapar tu voz.'],
        ['Bass hit / Impacto', 'Golpe grave sobre el frame del gancho o una revelación.', 'Uno solo, potente, en el momento clave.'],
        ['Riser (subida)', 'Construir tensión antes de un dato fuerte o un giro.', 'Sube hasta el drop/impacto.'],
        ['Click / Pop / Glitch', 'Para que aparezca texto o marcar micro-cortes.', 'Sincronizado con la animación del texto.'],
        ['Silencio estratégico', 'Cortar TODO el sonido 0.3s antes de la frase polémica.', 'El silencio es un gancho: obliga a prestar atención.'],
      ] },
      { t: 'callout', tono: 'azul', lbl: 'Dosis correcta', texto: 'Entre 3 y 5 efectos de sonido por cada 30 segundos en talking-head (algunos apilan 5-7 SFX en los primeros 5 segundos del gancho). Más que eso satura.' },
      { t: 'sub', texto: 'Sincronía audiovisual (lo que se siente "pro")' },
      { t: 'p', texto: 'El cerebro encuentra placer cuando el sonido cae EXACTO con un evento visual (un corte, un movimiento, la aparición de un texto). La meta es precisión de 100–200 milisegundos.' },
      { t: 'sub', texto: 'Música / audio de tendencia' },
      { t: 'lista', items: [
        'Usa un audio en tendencia de fondo bajito (le da alcance extra), pero que no tape tu voz — mézclalo al 10-20%.',
        'La música debe matchear la energía del mensaje: tensa para lo polémico, cálida para lo emocional.',
        'Cambio de música a mitad del video = estímulo nuevo que resetea la atención.',
      ] },
    ],
  },
  {
    n: 6,
    kicker: 'Plantilla lista',
    titulo: 'La receta: cómo editar cada video (reutilizable)',
    bloques: [
      { t: 'p', texto: 'Estructura de edición para un video de ~35s tipo los de tu grilla:' },
      { t: 'timeline', filas: [
        ['0:00–0:03 · GANCHO', 'Los 3 ganchos apilados: tú a cámara (movimiento desde el frame 1) + texto GIGANTE del gancho + bass hit / música que entra fuerte. Zoom punch + freeze en la palabra clave. Subtítulos ya activos.'],
        ['0:03–0:06', 'Primer corte antes de 3s. Cambio de ángulo o entra el primer B-roll con un whoosh. Confirmas de qué trata.'],
        ['0:06–0:25 · DESARROLLO', 'Ritmo de corte cada 2-3s. Alterna A-roll (tú) con B-roll. Zoom punch en cada dato fuerte. Whoosh en cada transición. Palabra clave de los subtítulos en color. Estímulo nuevo (SFX/gráfica) cada ~15s.'],
        ['0:25–0:31 · GIRO/REMATE', 'Silencio 0.3s + freeze frame + texto de la idea más fuerte. Aquí va tu frase más "polémica" o el aprendizaje. El momento más memorable.'],
        ['0:31–0:35 · CTA', 'Llamado a la acción claro en texto + voz ("comenta X", "sígueme"). Música baja para cerrar. Opcional: loop visual que conecte con el inicio.'],
      ] },
      { t: 'do', siempre: 'Subtítulos animados · corte cada 2-3s · B-roll de apoyo · SFX en el gancho · zoom punch en palabras clave · 9:16 vertical · texto legible en el tercio superior.', nunca: 'Empezar con "hola, bienvenidos" · plano quieto +3s · shake largo (marea) · música que tapa tu voz · texto chico o abajo · más de 5-7 SFX seguidos · efectos porque sí.' },
    ],
  },
  {
    n: 7,
    kicker: 'Antes de publicar',
    titulo: 'Checklist final',
    bloques: [
      { t: 'p', texto: 'Marca cada punto viendo el video. Solo cuando estén los 12 ✓ el video queda apto para aprobar y agendar.' },
    ],
  },
]

// Checklist final (sección 7) — cada punto tiene una clave estable (r1..r12)
// para guardar el avance en videos_erick.checklist.
export const CHECKLIST: { key: string; texto: string }[] = [
  { key: 'r1', texto: '¿El primer segundo tiene gancho visual + texto + sonido, los tres?' },
  { key: 'r2', texto: '¿El primer frame rompe el patrón (movimiento, contraste, algo raro)?' },
  { key: 'r3', texto: '¿Hay un corte o cambio antes de los 3 segundos?' },
  { key: 'r4', texto: '¿Ningún plano queda quieto más de 3 segundos?' },
  { key: 'r5', texto: '¿Hay B-roll de apoyo cada pocos segundos?' },
  { key: 'r6', texto: '¿Los subtítulos están animados, grandes y en el tercio superior?' },
  { key: 'r7', texto: '¿La palabra clave de cada frase tiene zoom punch o color distinto?' },
  { key: 'r8', texto: '¿Hay entre 3 y 5 SFX bien colocados (no de relleno)?' },
  { key: 'r9', texto: '¿El sonido cae sincronizado con los cortes (100-200ms)?' },
  { key: 'r10', texto: '¿Hay un silencio o freeze antes del remate más fuerte?' },
  { key: 'r11', texto: '¿El CTA se ve en texto Y se dice en voz?' },
  { key: 'r12', texto: '¿Se entiende TODO viéndolo sin sonido?' },
]

export const CHECKLIST_KEYS = CHECKLIST.map((c) => c.key)
