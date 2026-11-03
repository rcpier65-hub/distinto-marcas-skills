# Propuestas por correo · 3 noviembre 2026

Producción: `29d9f25`. Rama `codex/presentaciones-envio-correo`, checkout
`presentaciones-faq-work`. Base `287ac67`: conserva la personalización de
propuestas del otro chat, notas de Social Media y las FAQ por servicio.
El despliegue anterior pasó de `4d23a3e` a `287ac67` mientras se trabajaba;
ambos son ancestros de este cambio. Publicado solo en el VPS.

## Uso

- Presentaciones → Propuesta → **Enviar por correo**.
- También Planes → Propuestas → Vista previa → **Enviar por correo**.
- Guarda la propuesta actual, abre el correo registrado (editable), asunto y
  mensaje. El usuario pulsa **Enviar correo con PDF** para efectuar el envío.
- Remitente existente verificado: **team@distintostudio.com**, Gmail SMTP.
  No se añadió otra cuenta ni se copiaron secretos.
- El PDF usa el generador existente y la revisión guardada. No incorpora las
  notas privadas de la reunión. No necesita crear un enlace público.
- Cambiar el destinatario en este diálogo afecta este envío; el correo del
  cliente en la propuesta se edita en sus datos. Si está vacío se sugiere el
  último destinatario registrado, siempre editable antes de enviar.

## Seguridad y consistencia

`/api/propuestas/correo` conserva permisos de dirección, propiedad de cada
propuesta y validación de origen. Requiere revisión actual, documento completo,
correo válido y confirmación explícita. Aplica límite de solicitudes.

Migración aditiva aplicada a Supabase VPS:
`20261103180000_proposal_email_deliveries.sql`. Tabla privada con RLS,
sin permisos anon/authenticated y acceso service_role. Historial de últimos
cinco envíos. Reserva única por documento, destinatario y mensaje para evitar
duplicados por doble clic o respuesta perdida. Fallos antes de SMTP permiten
reintentar; después de intentar SMTP quedan por confirmar y nunca se repiten
a ciegas. Un envío aceptado no equivale a confirmar recepción en bandeja.

## Verificación

- Build webpack, TypeScript y lint afectados aprobados.
- `npx tsx scripts/test-proposal-email.ts`: validación, PDF, concurrencia,
  doble clic, revisión, fallos previos y resultado incierto.
- Pruebas de presentación y personalización aprobadas.
- `TEST_BASE_URL=... npx tsx scripts/test-proposal-email-live.ts` pasó en
  candidato y producción: permisos Pedro/Lorena/anónimo, aislamiento, origen,
  falta de confirmación, revisión vieja, remitente y PDF real (~90 KB).
- `nodemailer.verify()` autorizado en VPS. **No se envió ningún correo real**;
  el resultado de SMTP se simuló en pruebas unitarias. No se comprobó entrega
  real en la bandeja de un destinatario.
- Navegador: ambos puntos de entrada, autocompletado, campo vacío bloqueado,
  modal móvil 390×844, cancelar sin enviar. Capturas en
  `output/propuesta-correo-nov03/correo-publicado.png` y `correo-movil.png`.
- Sesiones propias cerradas, registros QA eliminados, candidato retirado y
  redes de app/Supabase/transcriptor preservadas. Sin tocar otros contenedores.

Consultar `/api/version` antes de continuar: otras tareas pueden publicar.
