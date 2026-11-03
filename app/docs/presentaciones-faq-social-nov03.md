# Preguntas frecuentes por servicio — 3 noviembre 2026

Producción VPS verificada: `1a5790c`, sobre `3f393b8` + documentación `55d08e6`.
Rama `codex/presentaciones-faq-social-aislado`, checkout `presentaciones-faq-work`.

## Cambio

El bloque «Otras preguntas frecuentes» usaba siempre las FAQ de Web, aunque
la sesión solo seleccionara Social Media o Publicidad. Ahora cada servicio
seleccionado presenta su propio bloque; en sesiones mixtas se identifica el
servicio de cada grupo.

Social Media tiene 11 respuestas: métodos y fechas de pago, organización del
mes, horario, campañas, extras, inversión publicitaria, correcciones,
aprobaciones, participación del cliente y resultados. Publicidad tiene su
propio bloque; las FAQ de Web permanecen intactas.

El alcance de campañas de Social Media se lee del plan elegido/sugerido en
el catálogo. Integration muestra una campaña Facebook; Ecommerce conserva
sus tres campañas Meta y campaña WA; Contenido aclara que no ejecuta pauta.
No se inventa cantidad para planes que no la especifican.

Horario solicitado por Pedro: lunes a viernes 8 a. m.–5 p. m., hora de Lima.
Constante compartida con reglas comerciales y términos de nuevas propuestas.
No se cambian propuestas existentes, acuerdos, importes ni datos de sesiones.

## Validación

- ESLint de los cuatro archivos modificados y git diff --check: aprobados.
- Pruebas existentes scripts/test-presentacion.ts: aprobadas.
- Comprobación directa de aislamiento de FAQ por servicio, alcances del catálogo
  y horario de nuevas propuestas: aprobada.
- Compilación local webpack y TypeScript: aprobados.
- Candidato VPS: HTTP 200 autenticado en lista, presentación existente y Planes;
  anónimo redirige a login. Solo la sesión propia de prueba fue cerrada.
- Producción: preguntas de Social Media visibles en la presentación existente;
  desplegable horario comprobado en navegador real. No se guardaron cambios
  en el contenido de esa sesión ni se generó/envió ninguna propuesta.
- Tres redes VPS conservadas: app, Supabase y transcriptor.

## Trabajo paralelo preservado

Se detectó otra edición no comprometida en soporte-equipo-work, en deck.tsx
más lib/presentacion/notas-social.ts. Se creó este checkout separado para no
alterarla. Ese trabajo permanece en su sitio y debe integrar `1a5790c` antes
de publicar. No desplegar el checkout anterior sin comprobar /api/version.

Evidencia visual: output/faq-social-nov03/social-media-publicado.png.
