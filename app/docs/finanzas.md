# Finanzas privadas — noviembre 2026

## Uso

- **Finanzas**: acceso de Pedro y Nayeli, confirmado por una lista privada de miembros
  más el permiso explícito. No hereda acceso por ser director/admin ni por ausencia de miembro.
- Agencia y Personales son espacios operativos. El titular fiscal es independiente
  de la cuenta bancaria que cobra/paga. PEN y USD nunca se suman entre sí.
- **Cuentas**: completar titular, moneda y saldo al comienzo del día de apertura.
  Saldo vacío significa desconocido; los movimientos siguen siendo registrables.
  No repetir como saldo inicial depósitos que se registrarán como movimientos.
- **Mensualidades**: acuerdos mensuales/semanales; se generan al entrar las cuotas
  hasta el mes actual. Claves únicas (acuerdo, vencimiento) evitan duplicados.
  Las nuevas cuotas quedan **Por revisar**, sin presumir deuda ni pago.
  Una pausa impide cuotas nuevas; conserva las ya generadas. Al reactivar se
  reinicia la vigencia desde ese día, sin retrocrear las cuotas del periodo pausado. Cambios de precio:
  pausar y crear otro acuerdo desde su vigencia; revisar las cuotas de ese mes.
- **Cobros / Gastos y equipo**: confirmar pendiente, registrar pagos parciales o
  completos con fecha/cuenta real. Retenciones/detracciones acreditadas se separan
  del efectivo; no se calculan automáticamente ni se declaran a SUNAT.
- **Registrar gasto**: concepto, importe, espacio, titular y cuenta; pendiente no
  mueve dinero. Documentos permite vincular su comprobante al cobro o gasto.
- **Transferir** registra movimientos internos, retiros y reembolsos sin duplicar
  ingresos/gastos. No ejecuta transferencias bancarias ni cambia el prestador fiscal.
- **Mis recibos**: cualquier miembro activo entrega su RH y consulta solo sus
  documentos y pagos. Pedro/Nayeli revisan el conjunto desde Documentos. Los RH no
  acreditan pago; los pagos se registran por separado. Número y hash evitan duplicados. Un documento rechazado permite subir un archivo
  corregido con el mismo número; el original permanece en el historial.
- Anular pagos conserva el historial y restaura el saldo de la obligación. Una
  obligación con pagos o crédito anterior no se anula directamente.

## Protección y consistencia

Migración aditiva `20261101160000_finanzas.sql`; tablas `finance_*` privadas con
RLS sin políticas de navegador, permisos anon/authenticated revocados. Solo rutas
servidor con sesión activa; mutaciones exigen origen coincidente. Archivos privados
PDF/JPG/PNG/WebP de hasta 8 MB, descarga autorizada y adjunta, sin URL pública.
Documento y bytes se guardan juntos en PostgreSQL y entran al backup del VPS.
Los datos comerciales iniciales están en un archivo local ignorado por Git;
se cargaron idempotentemente, sin crear movimientos bancarios.

Pagos con bloqueo de fila de obligación y clave de solicitud idempotente: las
peticiones simultáneas no exceden el saldo ni duplican el abono. Transacciones
atómicas para gasto+movimiento y transferencias. Importes en céntimos enteros.
Moneda/titular de cuenta con historial no se cambian; apertura no posterior al
primer movimiento. Auditoría de mutaciones; archivos y revisión conservan fecha.

No se asumieron pagos históricos, saldos bancarios, impuestos a pagar, gastos de
suscripción actuales ni correspondencias dudosas de marcas. La inversión Meta
pagada por clientes queda fuera de caja. No se reasignan RH entre personas.

## Verificación

- `node scripts/test-finance-model.mjs`: meses cortos, años bisiestos, sábados,
  límites de vigencia, fechas imposibles y aritmética de abonos/IGV.
- `TEST_BASE_URL=... node scripts/test-finance.mjs`: permisos de ocho miembros,
  clientes/anónimo, origen, acceso REST, idempotencia, sobrepago simultáneo,
  monedas, anulación, crédito tributario, transferencias, rollback, adjuntos
  privados/duplicados y revisión. Usa registros QA y los elimina al terminar;
  no envía correos, no cambia contraseñas ni paga dinero real.
- UI: gasto personal pendiente, segregación frente a Agencia, formulario modal,
  escritorio y móvil 390 × 844. Los datos QA se retiraron.

Limitaciones: conciliación manual, sin conexión bancaria ni declaración tributaria.
La generación es al entrar al módulo (o Mis recibos), no envía recordatorios ni
cobra tarjetas. Los futuros vencimientos no se materializan antes de su mes.

## Publicación verificada — 1 de noviembre de 2026

- Producción `/api/version`: `57e1a22`, sobre `0e79023`; rama
  `codex/finanzas-agencia-personales`. Se conservó la base activa y se comprobó
  otra vez antes de reemplazar exclusivamente el contenedor de la agencia.
- Compilación, TypeScript, lint afectado y pruebas del modelo aprobados.
  La integración completa pasó en un contenedor candidato del VPS antes de
  promover esa misma imagen. Incluye reactivación sin cobros retroactivos.
- Se promovió el artefacto Next compilado para VPS sobre la imagen existente,
  sin cambiar dependencias, secretos, cron ni configuración de Supabase. Imagen
  final `distinto-agencia:57e1a22`; respaldo
  `distinto-agencia:finanzas-base-0e79023`. Ambas redes y los límites de recursos
  originales se conservaron. No hubo publicación en Vercel.
- Verificación en producción: login 200, API autorizada para Pedro/Nayeli;
  equipo bloqueado y cliente redirigido a su portal sin datos financieros.
  Navegador con la sesión existente de Pedro muestra el resumen publicado.
- Datos iniciales: 12 acuerdos, 18 obligaciones, cero movimientos de caja;
  registros temporales de prueba retirados. No se enviaron mensajes, se
  cambiaron contraseñas ni se ejecutaron pagos o declaraciones.
- Evidencia local: `output/finanzas-nov01/finanzas-publicado.png` y
  `candidate-final-tests.txt`, fuera del repositorio público.

## Registro rápido por texto y audio

Entrada prioritaria en móvil, antes de los indicadores. «Gasté 100 soles en
movilidad con BCP de Pedro» prepara una tarjeta con importe, cuenta, fecha y
concepto. El usuario confirma; nunca se guarda al transcribir. Las cuentas
ambiguas se eligen explícitamente. El titular bancario no decide el titular
fiscal del movimiento. Los pendientes coincidentes se reutilizan; los casos
con varios pendientes piden elegir. Se pueden corregir los datos antes de guardar.

Reconoce importes escritos y hablados, PEN/USD, hoy/ayer y fechas explícitas.
No admite varias operaciones, fechas futuras ni transferencias en esta entrada.
Retenciones/detracciones siguen en el formulario de pago completo. Es una ayuda
para preparar el registro; la revisión del usuario sigue siendo necesaria.

`quickEntry` guarda obligación y movimiento en una transacción, con clave de
solicitud estable al reintentar. Si falta la moneda o titular de una cuenta,
solo se completa al confirmar expresamente; no se inventa su saldo inicial.
Los permisos, validación de saldos y monedas se repiten en el servidor.

Audio: MediaRecorder hasta 60 s o archivo de hasta 6 MB. Ruta privada
`/api/finanzas/transcribir` (Pedro/Nayeli, control de origen). Usa el transcriptor
ya existente del VPS vía `FINANCE_TRANSCRIBER_URL=http://transcriptor:9000/asr`,
red externa `transcriptor_net`. No se alteró ese contenedor ni se publicó un
puerto adicional. Compose conserva las redes app y Supabase y añade esa red.
La API de OpenAI anterior respondió sin cuota; esta función no depende de ella.
No se conservan audios en la base ni se envía el texto a un modelo externo.
Un bloqueo asesor de PostgreSQL limita a una transcripción simultánea de Finanzas.

Verificación: pruebas de frases/importes/ambigüedades, API con reintento
simultáneo, configuración atómica, abonos sin sobrepago y acceso de audio;
flujo móvil 390×844 de preparar → confirmar → resumen con cuenta temporal.
Audio de prueba español transcrito realmente en VPS y convertido en tarjeta
S/100 / movilidad / BCP Pedro. No equivale a probar el micrófono físico del
usuario: el navegador del teléfono pedirá su permiso la primera vez.
