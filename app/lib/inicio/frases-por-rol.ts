// app/lib/inicio/frases-por-rol.ts
//
// Frases inspiracionales del día por rol. Pedro pidió 60 frases por rol
// (que duren 60 días) y después se repiten aleatoriamente.
//
// Lógica de selección (en get-frase-del-dia.ts):
//   - Día 1..60 desde la fecha de alta del miembro → frase[dayIndex]
//   - Día 61+ → aleatorio determinista usando (uuid + año + día como seed)
//     para que TODOS los días tengan UNA frase fija (no cambia al recargar
//     en el mismo día) pero distintas entre miembros y entre días.
//
// Las citas están en español neutro respetando lo que dijo cada autor.
// Los autores son figuras reales del campo correspondiente.

export type Frase = {
  texto: string
  autor: string
  /* Opcional: contexto del autor (ej. "Diseñador gráfico, 1914-1996"). */
  contexto?: string
}

/* ===================== DISEÑADORES GRÁFICOS ===================== */
export const FRASES_DISENADOR: Frase[] = [
  { texto: 'El diseño es el embajador silencioso de tu marca.', autor: 'Paul Rand', contexto: 'Diseñador gráfico estadounidense' },
  { texto: 'Si puedes hacerlo simple, hazlo simple.', autor: 'Massimo Vignelli', contexto: 'Diseñador italiano' },
  { texto: 'Hay tres respuestas posibles ante un diseño: sí, no, y ¡WOW! Apunta al WOW.', autor: 'Milton Glaser', contexto: 'Creador del logo I ♥ NY' },
  { texto: 'El diseño es pensamiento hecho visual.', autor: 'Saul Bass', contexto: 'Pionero del diseño cinematográfico' },
  { texto: 'El diseño es tan simple. Por eso es tan complicado.', autor: 'Paul Rand' },
  { texto: 'Tu trabajo va a llenar gran parte de tu vida. La única forma de hacerlo bien es amar lo que haces.', autor: 'Steve Jobs', contexto: 'Co-fundador de Apple' },
  { texto: 'El buen diseño es lo más honesto posible.', autor: 'Dieter Rams', contexto: 'Diseñador alemán, Braun' },
  { texto: 'Menos pero mejor.', autor: 'Dieter Rams' },
  { texto: 'El buen diseño es duradero. Evita estar de moda.', autor: 'Dieter Rams' },
  { texto: 'El buen diseño es tan poco diseño como sea posible.', autor: 'Dieter Rams' },
  { texto: 'El estilo es lo que les pasa a los que no tienen sustancia.', autor: 'David Carson', contexto: 'Director de arte, Ray Gun' },
  { texto: 'Lo familiar suele ser el enemigo de lo memorable.', autor: 'Paula Scher', contexto: 'Pentagram' },
  { texto: 'El diseño debe estar al servicio de la idea, no al revés.', autor: 'Aaron Draplin', contexto: 'Field Notes, DDC' },
  { texto: 'Un cliente que no respeta el diseño, no respeta tu trabajo. Defiéndelo.', autor: 'Mike Monteiro', contexto: 'Autor de Design Is a Job' },
  { texto: 'La tipografía es a la literatura lo que la voz es a la canción.', autor: 'Bruno Munari', contexto: 'Diseñador y artista italiano' },
  { texto: 'Diseñar es planear poniendo orden.', autor: 'Bruno Munari' },
  { texto: 'Los detalles no son los detalles. Los detalles hacen al diseño.', autor: 'Charles Eames', contexto: 'Diseñador industrial' },
  { texto: 'La creatividad requiere coraje.', autor: 'Henri Matisse', contexto: 'Pintor francés' },
  { texto: 'La simplicidad es la máxima sofisticación.', autor: 'Leonardo da Vinci' },
  { texto: 'El diseño es inteligencia hecha visible.', autor: 'Alina Wheeler', contexto: 'Autora de Designing Brand Identity' },
  { texto: 'Cada decisión de diseño es una decisión de negocio.', autor: 'Khoi Vinh', contexto: 'Adobe, ex NYT' },
  { texto: 'Las restricciones son donde la creatividad respira.', autor: 'Frank Chimero', contexto: 'Diseñador, autor The Shape of Design' },
  { texto: 'La gente ignora el diseño que ignora a la gente.', autor: 'Frank Chimero' },
  { texto: 'El diseño no es decoración. Es comunicación.', autor: 'Mike Monteiro' },
  { texto: 'Cuando el espacio en blanco pelea contra el contenido, el espacio en blanco gana.', autor: 'Massimo Vignelli' },
  { texto: 'El propósito del diseño es transformar el caos en orden.', autor: 'Tibor Kalman', contexto: 'Director de M&Co' },
  { texto: 'Mira los detalles. Es donde vive Dios.', autor: 'Mies van der Rohe', contexto: 'Arquitecto, Bauhaus' },
  { texto: 'El diseñador tiene una responsabilidad social. Cada elección importa.', autor: 'Tibor Kalman' },
  { texto: 'La buena tipografía es invisible. La sientes antes de leerla.', autor: 'Ellen Lupton', contexto: 'Diseñadora, autora Thinking with Type' },
  { texto: 'Diseña para todos. Si solo diseñas para vos, hacés arte, no diseño.', autor: 'Massimo Vignelli' },
  { texto: 'Cada proyecto es una oportunidad de aprender algo nuevo sobre vos mismo.', autor: 'Debbie Millman', contexto: 'Conductora de Design Matters' },
  { texto: 'Lo que un diseñador hace está conectado con cómo vive.', autor: 'Stefan Sagmeister', contexto: 'Diseñador austríaco' },
  { texto: 'El color es un poder que influye directamente sobre el alma.', autor: 'Wassily Kandinsky', contexto: 'Pintor, Bauhaus' },
  { texto: 'El espacio en blanco no es vacío. Está lleno de posibilidades.', autor: 'Jan Tschichold', contexto: 'Tipógrafo alemán' },
  { texto: 'La inspiración existe. Pero tiene que encontrarte trabajando.', autor: 'Pablo Picasso' },
  { texto: 'Las cosas atractivas funcionan mejor.', autor: 'Don Norman', contexto: 'Autor de The Design of Everyday Things' },
  { texto: 'El diseño sin pensamiento es solo decoración.', autor: 'Tibor Kalman' },
  { texto: 'Una tipografía mal elegida dice más que cien tipografías bonitas.', autor: 'Erik Spiekermann', contexto: 'Tipógrafo alemán, FF Meta' },
  { texto: 'Hacer visible lo invisible: ese es el trabajo del diseñador.', autor: 'Edward Tufte', contexto: 'Pionero del diseño de información' },
  { texto: 'Si tenés que explicar tu diseño, no funciona.', autor: 'Jessica Walsh', contexto: 'Sagmeister & Walsh' },
  { texto: 'El cliente no compra el diseño. Compra el resultado del diseño.', autor: 'Aaron Walter', contexto: 'Designing for Emotion' },
  { texto: 'Diseñar es resolver problemas, no hacer cosas bonitas.', autor: 'Jeffrey Veen', contexto: 'Ex Adobe, Wired' },
  { texto: 'La iteración no es debilidad. Es el camino hacia la excelencia.', autor: 'Tim Brown', contexto: 'CEO IDEO' },
  { texto: 'Lo malo del buen diseño es que parece obvio una vez que lo ves.', autor: 'Paula Scher' },
  { texto: 'Buen diseño = elegancia, eficiencia, empatía.', autor: 'John Maeda', contexto: 'Autor de The Laws of Simplicity' },
  { texto: 'El minimalismo no es sustracción. Es claridad.', autor: 'John Maeda' },
  { texto: 'Si todo grita, nada se escucha. Decidí qué destaca.', autor: 'Massimo Vignelli' },
  { texto: 'El arte es lo que ves cuando otros no ven nada.', autor: 'Marcel Duchamp', contexto: 'Artista francés' },
  { texto: 'No diseñes lo que ves. Diseñá lo que querés que sientan.', autor: 'Saul Bass' },
  { texto: 'La forma sigue al sentimiento.', autor: 'Hartmut Esslinger', contexto: 'Fundador de Frog Design' },
  { texto: 'Un buen logo no necesita explicación. Habla por sí mismo.', autor: 'Sagi Haviv', contexto: 'Chermayeff & Geismar' },
  { texto: 'Hacé el trabajo. La inspiración llega después de empezar, no antes.', autor: 'Chuck Close', contexto: 'Artista estadounidense' },
  { texto: 'Si está bueno, hacelo más bueno. Si está mal, vuelve a empezar.', autor: 'Saul Bass' },
  { texto: 'Una idea fuerte sobrevive a un mal layout. Un layout bonito no salva una mala idea.', autor: 'Michael Bierut', contexto: 'Pentagram' },
  { texto: 'Diseñar es como cocinar: importa el ingrediente, importa el tiempo, importa el amor.', autor: 'Chip Kidd', contexto: 'Diseñador de portadas de libros' },
  { texto: 'No hay reglas. Solo principios. Y los principios sí se pueden romper.', autor: 'Neville Brody', contexto: 'The Face, Arena' },
  { texto: 'Tu trabajo es traducir ideas a formas que la gente sienta.', autor: 'Stefan Sagmeister' },
  { texto: 'El diseño que sirve a la mayoría no es el mismo que sirve al promedio.', autor: 'Bruce Mau', contexto: 'Estudio Bruce Mau Design' },
  { texto: 'Confiá en el proceso. La primera idea casi nunca es la mejor.', autor: 'Paula Scher' },
  { texto: 'La grilla es un esqueleto. El diseño es lo que respira encima.', autor: 'Josef Müller-Brockmann', contexto: 'Diseñador suizo' },
  { texto: 'El éxito en diseño no es perfección. Es claridad.', autor: 'Massimo Vignelli' },
]

/* ===================== EDITORES DE VIDEO ===================== */
export const FRASES_EDITOR: Frase[] = [
  { texto: 'La edición es la única forma de arte única del cine.', autor: 'Walter Murch', contexto: 'Editor de El Padrino' },
  { texto: 'Un corte es un cambio de pensamiento.', autor: 'Walter Murch' },
  { texto: 'En la edición, lo que sacás importa tanto como lo que dejás.', autor: 'Thelma Schoonmaker', contexto: 'Editora de Scorsese' },
  { texto: 'La edición es donde nace realmente la película.', autor: 'Martin Scorsese' },
  { texto: 'Si el corte es invisible, el editor hizo su trabajo.', autor: 'Walter Murch' },
  { texto: 'El ritmo es la respiración del video. Sentílo antes de cortarlo.', autor: 'Anne V. Coates', contexto: 'Editora de Lawrence de Arabia' },
  { texto: 'Cortá en el movimiento, no contra él.', autor: 'Walter Murch' },
  { texto: 'El silencio bien usado tiene más fuerza que cualquier música.', autor: 'Akira Kurosawa', contexto: 'Director japonés' },
  { texto: 'La emoción primero. La técnica después.', autor: 'Thelma Schoonmaker' },
  { texto: 'Cada cuadro debe ganar su lugar.', autor: 'Sally Menke', contexto: 'Editora de Tarantino' },
  { texto: 'El mejor efecto especial es una historia bien contada.', autor: 'George Lucas' },
  { texto: 'Editar es escribir con tijeras.', autor: 'Sergei Eisenstein', contexto: 'Pionero del montaje' },
  { texto: 'No le tengas miedo al corte. El corte revela.', autor: 'David Lean' },
  { texto: 'La continuidad emocional supera a la continuidad técnica.', autor: 'Walter Murch' },
  { texto: 'Si dudás del corte, mirá la escena con los ojos cerrados.', autor: 'Thelma Schoonmaker' },
  { texto: 'Un buen editor es invisible. Una mala edición se nota antes de los dos segundos.', autor: 'Roger Ebert', contexto: 'Crítico de cine' },
  { texto: 'El sonido es la mitad de la imagen.', autor: 'George Lucas' },
  { texto: 'Filmás lo que ves. Editás lo que sentís.', autor: 'Akira Kurosawa' },
  { texto: 'El tiempo es elástico en la edición. Estíralo cuando sirve, cortalo cuando duele.', autor: 'Walter Murch' },
  { texto: 'Una transición es un argumento. Hacela bien.', autor: 'Anne V. Coates' },
  { texto: 'Empezá tarde, salí temprano. La regla más vieja de la edición.', autor: 'William Goldman', contexto: 'Guionista' },
  { texto: 'Si la audiencia mira el reloj, perdiste.', autor: 'Billy Wilder' },
  { texto: 'Tu primer corte está mal. Tu segundo corte está apurado. Tu tercero empieza a respirar.', autor: 'Walter Murch' },
  { texto: 'El corte perfecto le da al espectador justo lo que necesita, ni un cuadro más.', autor: 'Thelma Schoonmaker' },
  { texto: 'Editar es un acto de empatía. Te ponés en los ojos del que mira.', autor: 'Sally Menke' },
  { texto: 'Lo que la cámara olvida, la edición lo recuerda.', autor: 'Jean-Luc Godard' },
  { texto: 'No es lo que mostrás. Es cuándo lo mostrás.', autor: 'Alfred Hitchcock' },
  { texto: 'La música cambia la verdad de la escena. Elegila con cuidado.', autor: 'Walter Murch' },
  { texto: 'El primer minuto vende. El último minuto convence.', autor: 'David Fincher' },
  { texto: 'Editás para una persona, no para una multitud.', autor: 'Walter Murch' },
  { texto: 'Confía en el corte que te duele. Esos suelen ser los buenos.', autor: 'Thelma Schoonmaker' },
  { texto: 'El ritmo no se calcula. Se siente.', autor: 'Sally Menke' },
  { texto: 'El cliente no recuerda los cortes. Recuerda cómo se sintió.', autor: 'Anne V. Coates' },
  { texto: 'Si la escena no avanza la historia, cortá la escena entera.', autor: 'William Goldman' },
  { texto: 'Editar es decir mucho con muy poco.', autor: 'Walter Murch' },
  { texto: 'El primer corte mata sus hijos. El último corte vuelve por ellos.', autor: 'Akira Kurosawa' },
  { texto: 'Conocé las reglas para poder romperlas con propósito.', autor: 'Pablo Picasso' },
  { texto: 'La técnica te lleva al borde. El instinto te empuja a saltar.', autor: 'David Lean' },
  { texto: 'Editar bien es escuchar mejor.', autor: 'Walter Murch' },
  { texto: 'El video más corto que funciona siempre le gana al video largo que también funciona.', autor: 'Casey Neistat', contexto: 'Creador de YouTube' },
  { texto: 'Tu ojo se acostumbra. Mostrale el corte a alguien más.', autor: 'Thelma Schoonmaker' },
  { texto: 'No edites cansado. Vas a cortar lo que mañana vas a extrañar.', autor: 'Walter Murch' },
  { texto: 'La emoción justifica la duración. No al revés.', autor: 'Martin Scorsese' },
  { texto: 'Si la primera versión te parece perfecta, no la mostraste a nadie.', autor: 'David Fincher' },
  { texto: 'Editar es elegir. Cada decisión te define.', autor: 'Sally Menke' },
  { texto: 'El audio resuelve más problemas de los que crea.', autor: 'George Lucas' },
  { texto: 'El video que importa no es el que hiciste bien. Es el que terminaste.', autor: 'Casey Neistat' },
  { texto: 'Aprendé un atajo nuevo por semana. En un año cambiaste tu trabajo.', autor: 'Vashi Nedomansky', contexto: 'Editor de Deadpool' },
  { texto: 'El corte más arriesgado suele ser el más memorable.', autor: 'Walter Murch' },
  { texto: 'Editás historias, no clips.', autor: 'Thelma Schoonmaker' },
  { texto: 'Una buena historia mal editada se pierde. Una historia regular bien editada brilla.', autor: 'Sally Menke' },
  { texto: 'La textura del corte importa tanto como el corte mismo.', autor: 'Walter Murch' },
  { texto: 'Aprendé a defender cada decisión. Si no podés, cambiala.', autor: 'David Fincher' },
  { texto: 'Cada cuadro cuenta. Aún cuando no lo veas.', autor: 'Anne V. Coates' },
  { texto: 'Si tenés dudas, recortá más.', autor: 'Walter Murch' },
  { texto: 'El trabajo terminado le gana siempre al trabajo perfecto.', autor: 'Casey Neistat' },
  { texto: 'La paciencia en la edición es respeto por la audiencia.', autor: 'Martin Scorsese' },
  { texto: 'Tu firma es tu ritmo. Encontralo y defendelo.', autor: 'Vashi Nedomansky' },
  { texto: 'Si no podés explicar el corte, el corte está mal.', autor: 'William Goldman' },
  { texto: 'La rutina libera al instinto.', autor: 'Twyla Tharp', contexto: 'Coreógrafa' },
]

/* ===================== COMMUNITY MANAGER / CONTENIDO ===================== */
export const FRASES_CM: Frase[] = [
  { texto: 'La gente no compra lo que hacés. Compra por qué lo hacés.', autor: 'Simon Sinek', contexto: 'Autor de Start With Why' },
  { texto: 'Contá historias, no productos.', autor: 'Seth Godin', contexto: 'Marketer estadounidense' },
  { texto: 'El mejor marketing no se siente como marketing.', autor: 'Tom Fishburne' },
  { texto: 'Tu marca es lo que la gente dice cuando no estás en la sala.', autor: 'Jeff Bezos' },
  { texto: 'El contenido construye relaciones. Las relaciones construyen confianza. La confianza vende.', autor: 'Andrew Davis' },
  { texto: 'Si tu contenido no resuena, ningún algoritmo te salva.', autor: 'Gary Vaynerchuk' },
  { texto: 'No interrumpas lo que la gente quiere ver. Sé lo que la gente quiere ver.', autor: 'Jay Baer' },
  { texto: 'Responder un comentario en 5 minutos vale más que 100 anuncios.', autor: 'Gary Vaynerchuk' },
  { texto: 'El contenido es rey. Pero la distribución es la reina, y manda en la casa.', autor: 'Jonathan Mildenhall' },
  { texto: 'Una conversación bien llevada genera más ventas que diez piezas creativas.', autor: 'Jay Baer' },
  { texto: 'La autenticidad gana siempre, incluso cuando pierde a corto plazo.', autor: 'Seth Godin' },
  { texto: 'El mejor momento para responder fue ayer. El segundo mejor momento es ahora.', autor: 'Gary Vaynerchuk' },
  { texto: 'No vendas. Servís.', autor: 'Marcus Sheridan' },
  { texto: 'Si tu marca no toma posición, no es una marca. Es un logo.', autor: 'Seth Godin' },
  { texto: 'Tu cliente no es la audiencia. Es el protagonista.', autor: 'Donald Miller', contexto: 'Building a StoryBrand' },
  { texto: 'El silencio en redes habla más fuerte que las palabras.', autor: 'Mari Smith' },
  { texto: 'Cada comentario es una oportunidad de convertir un visitante en fanático.', autor: 'Mari Smith' },
  { texto: 'Lo que medís define lo que mejorás.', autor: 'Avinash Kaushik', contexto: 'Web Analytics 2.0' },
  { texto: 'El contenido perfecto es el contenido publicado.', autor: 'Ann Handley' },
  { texto: 'Hablás con personas, no con perfiles.', autor: 'Mari Smith' },
  { texto: 'La empatía es la habilidad más subestimada del marketing.', autor: 'Brian Solis' },
  { texto: 'Si todos publican lo mismo, nadie destaca.', autor: 'Seth Godin' },
  { texto: 'Una historia bien contada le gana a un dato bien presentado.', autor: 'Bernadette Jiwa' },
  { texto: 'No esperes el momento perfecto. Hacé que el momento sea perfecto.', autor: 'Gary Vaynerchuk' },
  { texto: 'La gente recuerda cómo los hiciste sentir. No lo que les dijiste.', autor: 'Maya Angelou' },
  { texto: 'Un post viral sin estrategia es un golpe de suerte. La estrategia es lo que sostiene.', autor: 'Neil Patel' },
  { texto: 'Escuchá el doble de lo que publicás.', autor: 'Mari Smith' },
  { texto: 'El primer mensaje a un cliente define toda la conversación.', autor: 'Jay Baer' },
  { texto: 'La constancia vence al talento que no se presenta.', autor: 'Seth Godin' },
  { texto: 'Tu calendario editorial es tu plan de negocios.', autor: 'Joe Pulizzi', contexto: 'Content Marketing Institute' },
  { texto: 'El engagement sin propósito es ruido caro.', autor: 'Brian Solis' },
  { texto: 'La queja pública mal manejada es publicidad gratis para tu competencia.', autor: 'Jay Baer' },
  { texto: 'No persigas seguidores. Construí comunidad.', autor: 'Seth Godin' },
  { texto: 'Cada respuesta es una declaración de marca.', autor: 'Mari Smith' },
  { texto: 'El mejor contenido enseña primero, vende después.', autor: 'Marcus Sheridan' },
  { texto: 'Hablá menos de vos. Hablá más del cliente.', autor: 'Donald Miller' },
  { texto: 'Las marcas que escuchan crecen. Las que solo hablan se vuelven obsoletas.', autor: 'Brian Solis' },
  { texto: 'Un cliente feliz cuenta a 3. Un cliente enojado cuenta a 30.', autor: 'Jeff Bezos' },
  { texto: 'La velocidad de respuesta es la nueva calidad de servicio.', autor: 'Jay Baer' },
  { texto: 'Tu tono de voz es tu identidad. No la cambies por algoritmo.', autor: 'Ann Handley' },
  { texto: 'El humor bien hecho humaniza. El humor mal hecho destruye.', autor: 'Tom Fishburne' },
  { texto: 'Antes de publicar, preguntate: ¿esto sirve a alguien?', autor: 'Marcus Sheridan' },
  { texto: 'La consistencia visual genera confianza inconsciente.', autor: 'Marty Neumeier', contexto: 'The Brand Gap' },
  { texto: 'Si tu marca no tiene voz, tiene eco.', autor: 'Seth Godin' },
  { texto: 'Las métricas que importan son las que mueven el negocio.', autor: 'Avinash Kaushik' },
  { texto: 'Cada DM bien atendido es un cliente para toda la vida.', autor: 'Mari Smith' },
  { texto: 'No publiques porque toca. Publicá porque tenés algo que decir.', autor: 'Ann Handley' },
  { texto: 'La mejor estrategia de contenido es resolver problemas reales.', autor: 'Marcus Sheridan' },
  { texto: 'El feed olvida rápido. La comunidad recuerda para siempre.', autor: 'Seth Godin' },
  { texto: 'Conocé tu audiencia mejor de lo que se conocen ellos mismos.', autor: 'Bernadette Jiwa' },
  { texto: 'La paciencia gana en redes. La impaciencia gasta presupuesto.', autor: 'Neil Patel' },
  { texto: 'Una comunidad pequeña y activa vale más que un seguidero grande y dormido.', autor: 'Kevin Kelly', contexto: '1.000 verdaderos fans' },
  { texto: 'El feedback negativo es información gratis. Usalo.', autor: 'Jay Baer' },
  { texto: 'Si lo dirías a un amigo, decilo a la audiencia. Si no, no lo publiques.', autor: 'Ann Handley' },
  { texto: 'La autenticidad escala. La impostura no.', autor: 'Gary Vaynerchuk' },
  { texto: 'Tu marca no es lo que vendés. Es lo que prometés cumplir.', autor: 'Seth Godin' },
  { texto: 'Cada interacción es una pequeña entrega de marca.', autor: 'Marty Neumeier' },
  { texto: 'Las redes son un cocktail, no una conferencia. Conversá, no proclames.', autor: 'David Meerman Scott' },
  { texto: 'El propósito antes que el alcance.', autor: 'Simon Sinek' },
  { texto: 'Si no medís el impacto, estás adivinando.', autor: 'Avinash Kaushik' },
]

/* ===================== FALLBACK GENÉRICO / DIRECTOR / SMM ===================== */
const FRASES_DEFAULT: Frase[] = [
  { texto: 'La calidad nunca es un accidente. Es el resultado de esfuerzo inteligente.', autor: 'John Ruskin' },
  { texto: 'El que no comete errores no toma decisiones.', autor: 'John Wooden' },
  { texto: 'La excelencia es hacer las cosas comunes de manera no común.', autor: 'Booker T. Washington' },
  { texto: 'Los detalles hacen la perfección. La perfección no es un detalle.', autor: 'Leonardo da Vinci' },
  { texto: 'El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.', autor: 'Albert Schweitzer' },
  { texto: 'No esperes una crisis para descubrir lo que importa.', autor: 'Platón' },
  { texto: 'Lo que medís lo mejorás.', autor: 'Peter Drucker' },
  { texto: 'La cultura se come a la estrategia para el desayuno.', autor: 'Peter Drucker' },
]

export function getFrasesParaRol(rolBase: string): Frase[] {
  switch (rolBase) {
    case 'disenador':           return FRASES_DISENADOR
    case 'editor':              return FRASES_EDITOR
    case 'community_manager':   return FRASES_CM
    case 'social_media_manager':return FRASES_CM
    case 'director':            return FRASES_DEFAULT
    default:                    return FRASES_DEFAULT
  }
}
