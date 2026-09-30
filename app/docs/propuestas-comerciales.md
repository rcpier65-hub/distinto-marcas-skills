# Propuestas comerciales

El creador está en `/planes` y usa los planes de `lib/planes/catalogo.ts`. El acceso a las propuestas, su PDF y las mejoras de texto exige la sesión de dirección mediante `proposalActor`. Los registros pertenecen a su creador; el servidor verifica propietario y revisión antes de exportar o compartir.

## Edición con IA

Los campos comerciales ofrecen una sugerencia que debe aplicarse explícitamente. Se puede descartar o deshacer. No se reescriben nombres legales, documentos ni datos de contacto. El servidor valida campo, extensión, cifras y referencias; el usuario debe revisar el significado y los compromisos antes de aplicar una sugerencia.

`POST /api/propuestas/mejorar` utiliza la conexión OpenAI existente, con `gpt-4o-mini` y salida JSON. Las claves permanecen en el servidor. La petición solo incluye el campo elegido y su texto, sin enviar la propuesta completa. El límite es de 20 solicitudes por minuto y usuario, mediante el RPC existente `booking_rate_limit` con un prefijo independiente. Un error, falta de saldo o respuesta inválida conserva el texto original.

## Compartir

En Vista previa, «Preparar envío» guarda la propuesta y llama a `POST /api/propuestas/compartir` con su ID y revisión. Genera un PDF privado e inmutable en el bucket `propuestas-comerciales`. El nombre depende de un hash del contenido del documento; un cambio de alcance, precio o datos del cliente exige preparar otra copia. Cambiar únicamente el mensaje no regenera el PDF.

El enlace firmado dura siete días. Quien lo tenga puede descargar esa copia sin iniciar sesión. Los botones abren WhatsApp o el cliente de correo con destinatario, mensaje y enlace; no envían mensajes ni adjuntan archivos automáticamente. El PDF anterior no cambia cuando se edita la propuesta.

Aplicar `20260930010001_propuestas_pdf_privados.sql` antes de desplegar el envío. El bucket no es público y una política restrictiva evita acceso directo desde clientes anon/authenticated. Solo el servidor genera enlaces firmados. Preparar el PDF tiene un límite independiente de 10 solicitudes por minuto y usuario.

## Validación

- `npx tsc --noEmit` y ESLint sobre `lib/propuestas`, `app/api/propuestas` y los componentes modificados.
- Las pruebas de `model.test.ts` y `writing-delivery.test.ts` cubren cálculos, compatibilidad de propuestas anteriores, cifras en sugerencias, destinatarios y caducidad del contenido preparado.
- En el flujo de prueba se debe verificar aplicar/deshacer, PDF válido sin sesión con el enlace firmado, denegación por URL pública, mensaje precargado y bloqueo de una copia anterior tras editar el documento. Usar datos ficticios y no enviar mensajes a clientes durante QA.
