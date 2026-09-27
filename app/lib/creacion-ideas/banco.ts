// Banco de ideas de Creación de Ideas.
// Misma lista que DATA.ideas en public/modulos/creacion-de-ideas/index.html.
// Las ideas que cada persona guarda viven en localStorage del navegador
// (creacion-ideas.v1) y no están en Supabase.

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

const FILAS: Array<{ nicho: NichoIdea; idea: string; gancho: string }> = [
  { nicho: 'marketing', idea: 'Auditar en vivo el perfil de un negocio local y mostrar 3 cambios que traen más mensajes.', gancho: 'Le arreglé el perfil a esta cafetería en 60 segundos y le llegaron 40 mensajes.' },
  { nicho: 'marketing', idea: 'Pantalla dividida: un caption aburrido vs el mismo con gancho. Explica por qué retiene.', gancho: 'Este caption te está costando clientes y ni te has dado cuenta.' },
  { nicho: 'fitness', idea: '3 ejercicios que casi todos hacen mal y la corrección al lado.', gancho: 'Llevas 6 meses haciendo esto mal y por eso no crece.' },
  { nicho: 'fitness', idea: 'Arma un día de comida alta en proteína con presupuesto ajustado desde el mercado.', gancho: 'Comí como fisicoculturista con 30 soles: esto compré.' },
  { nicho: 'comida', idea: 'Lomo saltado en 6 minutos con lo que ya hay en el refri.', gancho: 'Lomo saltado en 6 minutos con lo que ya tienes en tu refri.' },
  { nicho: 'comida', idea: '3 errores que arruinan tu arroz y la forma correcta al lado.', gancho: 'Deja de arruinar tu arroz: cometes estos 3 errores.' },
  { nicho: 'belleza', idea: 'Rutina de skincare de 3 productos para piel grasa en clima húmedo.', gancho: '3 productos y adiós cara brillosa a mediodía.' },
  { nicho: 'belleza', idea: 'Aplicar corrector sin que se cuartee: el paso que casi todos se saltan.', gancho: 'Tu corrector se cuartea por este paso que te saltas.' },
  { nicho: 'inmobiliaria', idea: 'Tour de un depa señalando lo que nadie te dice antes de comprar.', gancho: 'Vi 20 depas y este error lo cometen casi todos.' },
  { nicho: 'inmobiliaria', idea: 'Con números reales, cuánto necesitas de cuota inicial (es menos de lo que crees).', gancho: 'Necesitas menos inicial de la que crees: te muestro los números.' },
  { nicho: 'educacion', idea: 'La técnica Feynman: enseñar un tema como si se lo contaras a un niño.', gancho: 'Estudia la mitad y aprende el doble con este método.' },
  { nicho: 'educacion', idea: '3 apps gratis que reemplazan a un profesor particular, con demo de cada una.', gancho: 'Estas 3 apps gratis me subieron las notas sin gastar un sol.' },
  { nicho: 'ecommerce', idea: 'Empaque satisfactorio de un pedido: por qué un buen unboxing te da publicidad gratis.', gancho: 'Empaco así y mis clientes me hacen publicidad gratis.' },
  { nicho: 'ecommerce', idea: 'Fotos de producto profesionales con el celular, una caja y luz de ventana.', gancho: 'Fotos de producto que venden con tu celu y una caja de cartón.' },
  { nicho: 'finanzas', idea: 'Reto de ahorro de 52 semanas con un frasco: empieza con 1 sol y sube cada semana.', gancho: 'Empieza con 1 sol esta semana y ten 1,378 a fin de año.' },
  { nicho: 'finanzas', idea: '3 gastos hormiga y cuánto suman al año en pantalla.', gancho: 'Ese gasto de 5 soles al día te cuesta 1,800 al año.' },
  { nicho: 'viajes', idea: 'Escapada de fin de semana con presupuesto exacto: transporte, comida y dónde dormir.', gancho: 'Escapada de fin de semana por 120 soles, todo incluido.' },
  { nicho: 'viajes', idea: 'Buscar vuelos en pantalla: fechas flexibles, incógnito y comparador, bajando el precio.', gancho: 'Bajé mi vuelo de 400 a 180 soles en 2 minutos, mira.' },
  { nicho: 'tecnologia', idea: '3 funciones ocultas del celular que casi nadie usa, demostrando cada una.', gancho: 'Tu celular hace esto y no tenías ni idea.' },
  { nicho: 'tecnologia', idea: 'Resolver una tarea aburrida con IA en 30 segundos, mostrando el prompt exacto.', gancho: 'Le pedí esto a la IA y me ahorró 3 horas de trabajo.' },
  { nicho: 'emprendimiento', idea: 'El error que quiebra al 90% de negocios nuevos en 6 meses, con ejemplo.', gancho: 'El 90% quiebra por este error: no lo cometas tú.' },
  { nicho: 'emprendimiento', idea: 'Validar una idea de negocio en 1 día con una prueba simple antes de invertir.', gancho: 'No inviertas sin hacer antes esta prueba de 1 día.' },
  { nicho: 'mascotas', idea: '3 alimentos de casa que son veneno para el perro, con imágenes claras.', gancho: 'Esto que le das a tu perro lo puede matar.' },
  { nicho: 'mascotas', idea: 'Señales de que tu gato te quiere, con clips de un gato haciéndolas.', gancho: 'Si tu gato hace esto, te ama de verdad.' },
]

export const BANCO_IDEAS: IdeaBanco[] = FILAS.map((fila, index) => ({
  id: `banco-${index + 1}`,
  nicho: fila.nicho,
  idea: fila.idea,
  gancho: fila.gancho,
}))

export function esNichoIdea(value: string): value is NichoIdea {
  return (NICHOS_IDEAS as readonly string[]).includes(value)
}
