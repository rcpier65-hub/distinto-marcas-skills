# Notas de reunión de Social Media — 3 de noviembre de 2026

- Producción Hostinger: `4d23a3e`, sobre `1a5790c` (preguntas frecuentes por servicio).
- Rama: `codex/notas-social-publicadas`; checkout independiente `notas-social-work`.
- La guía del panel de notas dependía siempre de Web. Ahora las seis etapas
  usan preguntas de Social Media cuando ese servicio está seleccionado. Web
  conserva su guía; Web + Social Media combina ambas sin duplicados.
- Solo cambió la selección de preguntas ofrecidas. No se reescribieron las notas
  de las reuniones, sesiones, propuestas, servicios ni datos de clientes.
- ESLint afectado aprobado. Comprobación de las seis etapas, Web, Social + Ads
  y reuniones combinadas aprobada. Compilación webpack y TypeScript aprobadas
  en la imagen del VPS, con los límites existentes del builder.
- Publicación con contexto temporal independiente para conservar el trabajo
  concurrente: imagen `distinto-agencia:4d23a3e`, prueba de arranque en contenedor
  temporal y promoción a `prod` tras comprobar que seguía activo `1a5790c`.
  Se verificó el hash de Compose y se conservaron las tres redes existentes.
- Producción: `/api/version`, `/login` y navegador autenticado aprobados.
  La presentación de Brenda mostró las preguntas nuevas en Inicio, Preguntas
  y Tu plan. Las notas del formulario permanecieron iguales antes/después.
- Evidencia: `output/notas-social-nov03/notas-social-publicadas.png` en la
  carpeta principal. Contenedor y contexto temporales eliminados; builder detenido.
- El checkout compartido `soporte-equipo-work` conserva los cambios locales
  originales de estas notas; no se descartaron ni sobrescribieron.

Consultar `/api/version` antes del próximo cambio y preservar esta base.
