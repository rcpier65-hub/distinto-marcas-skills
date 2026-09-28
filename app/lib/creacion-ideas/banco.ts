// Banco compartido de Creación de Ideas.
// Es el mismo catálogo DATA.ideas del módulo estático que /creacion-de-ideas
// embebe (app/public/modulos/creacion-de-ideas/index.html). Las ideas que
// cada persona guarda viven en el navegador y no salen por acá.

export const NICHOS_IDEAS = [
  'marketing',
  'fitness',
  'comida',
  'belleza',
  'inmobiliaria',
  'educacion',
  'ecommerce',
  'finanzas',
  'viajes',
  'tecnologia',
  'emprendimiento',
  'mascotas',
] as const

export type NichoIdea = (typeof NICHOS_IDEAS)[number]

export type IdeaBanco = {
  id: string
  nicho: NichoIdea
  idea: string
  gancho: string
}

const FILAS: Array<[NichoIdea, string, string]> = [
  ['marketing', 'Auditar en vivo el perfil de un negocio local y mostrar 3 cambios que traen más mensajes.', 'Le arreglé el perfil a esta cafetería en 60 segundos y le llegaron 40 mensajes.'],
  ['marketing', 'Pantalla dividida: un caption aburrido vs el mismo con gancho. Explica por qué retiene.', 'Este caption te está costando clientes y ni te has dado cuenta.'],
  ['fitness', '3 ejercicios que casi todos hacen mal y la corrección al lado.', 'Llevas 6 meses haciendo esto mal y por eso no crece.'],
  ['fitness', 'Arma un día de comida alta en proteína con presupuesto ajustado desde el mercado.', 'Comí como fisicoculturista con 30 soles: esto compré.'],
  ['comida', 'Lomo saltado en 6 minutos con lo que ya hay en el refri.', 'Lomo saltado en 6 minutos con lo que ya tienes en tu refri.'],
  ['comida', '3 errores que arruinan tu arroz y la forma correcta al lado.', 'Deja de arruinar tu arroz: cometes estos 3 errores.'],
  ['belleza', 'Rutina de skincare de 3 productos para piel grasa en clima húmedo.', '3 productos y adiós cara brillosa a mediodía.'],
  ['belleza', 'Aplicar corrector sin que se cuartee: el paso que casi todos se saltan.', 'Tu corrector se cuartea por este paso que te saltas.'],
  ['inmobiliaria', 'Tour de un depa señalando lo que nadie te dice antes de comprar.', 'Vi 20 depas y este error lo cometen casi todos.'],
  ['inmobiliaria', 'Con números reales, cuánto necesitas de cuota inicial (es menos de lo que crees).', 'Necesitas menos inicial de la que crees: te muestro los números.'],
  ['educacion', 'La técnica Feynman: enseñar un tema como si se lo contaras a un niño.', 'Estudia la mitad y aprende el doble con este método.'],
  ['educacion', '3 apps gratis que reemplazan a un profesor particular, con demo de cada una.', 'Estas 3 apps gratis me subieron las notas sin gastar un sol.'],
  ['ecommerce', 'Empaque satisfactorio de un pedido: por qué un buen unboxing te da publicidad gratis.', 'Empaco así y mis clientes me hacen publicidad gratis.'],
  ['ecommerce', 'Fotos de producto profesionales con el celular, una caja y luz de ventana.', 'Fotos de producto que venden con tu celu y una caja de cartón.'],
  ['finanzas', 'Reto de ahorro de 52 semanas con un frasco: empieza con 1 sol y sube cada semana.', 'Empieza con 1 sol esta semana y ten 1,378 a fin de año.'],
  ['finanzas', '3 gastos hormiga y cuánto suman al año en pantalla.', 'Ese gasto de 5 soles al día te cuesta 1,800 al año.'],
  ['viajes', 'Escapada de fin de semana con presupuesto exacto: transporte, comida y dónde dormir.', 'Escapada de fin de semana por 120 soles, todo incluido.'],
  ['viajes', 'Buscar vuelos en pantalla: fechas flexibles, incógnito y comparador, bajando el precio.', 'Bajé mi vuelo de 400 a 180 soles en 2 minutos, mira.'],
  ['tecnologia', '3 funciones ocultas del celular que casi nadie usa, demostrando cada una.', 'Tu celular hace esto y no tenías ni idea.'],
  ['tecnologia', 'Resolver una tarea aburrida con IA en 30 segundos, mostrando el prompt exacto.', 'Le pedí esto a la IA y me ahorró 3 horas de trabajo.'],
  ['emprendimiento', 'El error que quiebra al 90% de negocios nuevos en 6 meses, con ejemplo.', 'El 90% quiebra por este error: no lo cometas tú.'],
  ['emprendimiento', 'Validar una idea de negocio en 1 día con una prueba simple antes de invertir.', 'No inviertas sin hacer antes esta prueba de 1 día.'],
  ['mascotas', '3 alimentos de casa que son veneno para el perro, con imágenes claras.', 'Esto que le das a tu perro lo puede matar.'],
  ['mascotas', 'Señales de que tu gato te quiere, con clips de un gato haciéndolas.', 'Si tu gato hace esto, te ama de verdad.'],
]

export const BANCO_IDEAS: IdeaBanco[] = FILAS.map(([nicho, idea, gancho], index) => ({
  id: `${nicho}-${index + 1}`,
  nicho,
  idea,
  gancho,
}))

export function esNichoIdea(value: string): value is NichoIdea {
  return (NICHOS_IDEAS as readonly string[]).includes(value)
}
