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

### Publicación del registro rápido — 1 de noviembre de 2026

- Producción confirmada `/api/version` = `c357f01`, rama
  `codex/finanzas-registro-rapido`, conserva `57e1a22` y su documentación.
- Build/TypeScript, lint afectado, parser y pruebas completas de API aprobadas.
  La integración se ejecutó en la imagen candidata del VPS antes de promoverla.
  No hubo cambios de esquema ni de dependencias. Respaldo de imagen:
  `distinto-agencia:quick-base-57e1a22`; compose anterior guardado en
  `/docker/distinto-agencia/quick-c357f01/compose-before.yml`.
- Se conservaron las dos redes existentes y se añadió `transcriptor_net` para
  consumir el transcriptor interno. No se cambió su servicio ni se adquirió una
  suscripción. El audio sintético tardó aproximadamente 4 s en la prueba de API.
- Navegador en producción 390×844: frase exacta de Pedro muestra dos opciones
  BCP; audio real de prueba prepara S/100, Movilidad y BCP Pedro. Se cerraron
  ambos sin confirmar. El guardado completo ya se comprobó con datos QA y se
  retiraron: cero movimientos financieros reales añadidos, cero cuentas QA.
- Evidencia: `output/finanzas-rapido-nov01/registro-movil-publicado.png`,
  `confirmacion-movil-publicada.png` y `candidate-tests.txt` (local, ignorado).
  No se probó el micrófono físico de un teléfono; se verificó audio por archivo
  y la interfaz móvil. Permiso de micrófono solicitado solo al pulsar Dictar.

### Acceso visible en móvil — 1 de noviembre de 2026

- Producción `/api/version` = `359d33c`, rama `codex/finanzas-acceso-movil`,
  conserva el registro rápido de `c357f01`. El permiso de Pedro ya estaba activo;
  al plegar Workspace desaparecía el enlace anterior. Ahora Finanzas queda fijo
  debajo de Buscar, fuera de las secciones plegables y del scroll del menú.
- El buscador global incluye Finanzas y su entrada de gastos/cobros por texto o
  audio. Ambos accesos exigen permiso explícito; no se ampliaron permisos.
- Build/TypeScript aprobado. Lint conserva dos errores y un aviso preexistentes,
  cotejados contra la base (efectos de Sidebar/CommandPalette y dependencia de
  emailActivo). Sin incidencias nuevas de lint.
- Candidata VPS: Pedro y Nayeli acceden; Ailyn y Pieer reciben bloqueo. Sesiones
  temporales de prueba revocadas. No se modificaron movimientos financieros.
- Navegador de producción a 390×844: con Workspace y Marcas plegados, Finanzas
  permanece visible; abre el registro rápido y la búsqueda «finanzas» entrega
  un resultado funcional. No equivale a prueba en el teléfono físico de Pedro.
  Evidencia local: `output/finanzas-menu-nov01/menu-movil-publicado.png`.
- Respaldo: `distinto-agencia:menu-base-c357f01`; compose anterior en
  `/docker/distinto-agencia/menu-359d33c/compose-before.yml`. Se conservaron las
  tres redes del contenedor, incluidas Supabase y transcriptor.

### Icono propio para el acceso directo — 1 de noviembre de 2026

- Producción `/api/version` = `4efe57f`, rama `codex/finanzas-icono`, conserva
  `359d33c`. `/finanzas` declara billetera blanca con moneda sobre morado,
  nombre Finanzas y manifest propio con `id`/`start_url` `/finanzas`.
- PNG de 32/180/192/512 px en `/icons/finanzas/v1/`, públicos sin sesión.
  Safari recibe un único apple-touch-icon de 180 px; el manifest tiene iconos
  normales y maskable. SVG fuente y script `generate-finance-icons.mjs` incluidos.
  La agencia conserva su manifest, nombre e imágenes originales.
- Build/TypeScript, lint y comprobación HTTP en candidata aprobados: metadata
  de Finanzas y de Inicio, formatos PNG/tamaños y manifest único. Navegador en
  producción confirma título y enlaces del head. Sin cambios de permisos ni
  datos financieros. No se probó la instalación en el iPhone físico; para un
  acceso anterior con icono guardado, volver a añadirlo desde Safari en Finanzas.
- Imagen de retorno `distinto-agencia:icon-base-359d33c`; compose anterior y
  fuente en `/docker/distinto-agencia/icon-4efe57f/`. Las tres redes conservadas.

### Consulta de meses anteriores — 1 de noviembre de 2026

- Producción `c144cd0`, rama `codex/finanzas-historial-anterior`, conserva
  `4efe57f`. El selector mensual permitía solo noviembre de 2026 en adelante,
  aunque el registro rápido y la API ya admiten pagos históricos. Ahora permite
  seleccionar meses desde enero de 2000, manteniendo el máximo en el mes actual.
- No cambia la generación de mensualidades: consultar meses anteriores al inicio
  del módulo no genera cuotas históricas. No cambia importes, fechas ni pagos.
- Build, TypeScript y lint aprobados. API y navegador en producción confirman
  la lectura de octubre y su movimiento guardado, cuenta y total mensual.
  La verificación fue de lectura; no duplicó el cobro ya registrado por solicitud
  del usuario. Evidencia privada en `output/finanzas-cobro-nov01/`, ignorada por Git.
- Respaldo `distinto-agencia:history-base-4efe57f`; fuente y compose anterior en
  `/docker/distinto-agencia/history-c144cd0/`. Las tres redes conservadas.

### Resumen de saldos por cuenta — 1 de noviembre de 2026

- Producción `c13604b`, rama `codex/finanzas-resumen-cuentas`, conserva `c144cd0`.
  Al inicio de Resumen aparecen las seis cuentas/billeteras, saldo registrado,
  movimientos netos y acceso a completar su apertura. Cuentas reutiliza el bloque
  y añade sus notas. Totales conocidos separados en PEN/USD, sin sumar monedas.
- Un saldo requiere moneda, importe inicial y fecha de apertura. Vacío no es cero:
  se muestra Por completar y se excluye del total. Se incluyen saldos negativos
  y cero; los movimientos netos ya descuentan salidas e incluyen transferencias.
  El saldo es acumulado, independiente del mes y del espacio Agencia/Personales.
  No es consulta bancaria: depende de los movimientos que se registran.
- No se modificaron cuentas ni pagos. El cobro anterior conserva su ID, importe y
  cuenta; no se convirtió en un saldo inicial. La API no cambia.
- Build/TypeScript, lint afectado y pruebas del modelo aprobados. Candidata VPS:
  saldos por cuenta cotejados con API, octubre/noviembre equivalentes, cobro
  original intacto, Pedro/Nayeli autorizados y Ailyn/Pieer/anónimo bloqueados.
  Sesiones temporales cerradas. Navegador producción en escritorio y 390×844:
  tarjetas legibles sin desborde y formulario de apertura accesible sin guardar.
- Respaldo `distinto-agencia:balances-base-c144cd0`; fuente y compose anterior en
  `/docker/distinto-agencia/balances-c13604b/`. Tres redes conservadas. Evidencia
  privada local `output/finanzas-saldos-nov01/resumen-movil.png`.

### Registro primero y resumen a demanda — 2 de noviembre de 2026

- Producción `cf4b149`, rama `codex/finanzas-registro-primero`, conserva `c13604b`
  y su documentación posterior. Finanzas abre en Registrar; el botón superior
  Resumen muestra cuentas y saldos. Registrar regresa al formulario conservando
  el texto sin guardar. Al recargar inicia nuevamente en Registrar.
- El formulario se mantiene montado mientras está oculto. En móvil se reduce el
  espacio superior; no se modifican importes, movimientos, permisos ni API.
- Build/TypeScript y lint de archivos afectados aprobados. Prueba de producción:
  registro inicial visible, resumen oculto, cuentas equivalentes entre meses,
  cobro anterior conservado; Pedro/Nayeli autorizados, Ailyn/Pieer/anónimo
  bloqueados. Sesiones de prueba revocadas y cero escrituras financieras.
- Navegador real en producción a 390×844: formulario, Dictar y Preparar visibles
  sin desplazar; Resumen muestra ocho cuentas; retorno conserva texto de prueba,
  eliminado sin confirmar. Recargar desde Resumen abre Registrar. Captura local
  privada: `output/finanzas-registro-primero-nov01/registro-movil-publicado.png`.
  No equivale a probar el dispositivo físico del usuario.
- Publicación demorada por saturación independiente del VPS: memoria disponible
  inferior a 1 GB, swap lleno y carga elevada; no se detuvieron otros servicios.
  El candidato propio se detuvo para liberar recursos. La promoción terminó
  tras recuperar respuesta; `/api/version` público confirmó `cf4b149`. Esta
  entrega no declara resuelto el consumo global del servidor.
- Respaldo `distinto-agencia:entry-base-c13604b`; fuente y compose anterior en
  `/docker/distinto-agencia/entry-cf4b149/`. Tres redes conservadas. Se verificó
  nuevamente producción antes de promover, sin publicar en Vercel.

### Cuentas personales y de agencia — 2 de noviembre de 2026

- Producción `91d986e`, rama `codex/finanzas-cuentas-separadas`, conserva la
  entrada directa al registro de `cf4b149`. Columna opcional `finance_accounts.usage`
  (migración `20261102060000_finance_account_usage.sql`) separa el uso operativo
  del titular bancario/fiscal; no deduce el uso de una cuenta a partir del nombre.
- Por instrucción expresa de Pedro se etiquetaron Personal: BCP Pedro/Yape,
  Yape Nayeli y ambos Guardaditos. Agencia: BCP Nayeli, BBVA Pedro, Interbank
  agencia y Efectivo. Se cambió exclusivamente `usage` mediante `accountUsage`,
  con sesión autorizada y auditoría. No cambiaron titulares, aperturas ni notas.
- Resumen/Cuentas muestran etiquetas y totales separados por uso y moneda.
  Los selectores de cuenta incluyen el uso. Configurar cuenta permite elegirlo;
  una solicitud antigua sin ese campo conserva la etiqueta existente. Cuentas
  futuras sin clasificación no se atribuyen silenciosamente a una categoría.
- Registro rápido avisa cuando espacio del movimiento y uso de la cuenta difieren.
  Si no está ligado a un pendiente, ofrece corregir el espacio antes de confirmar.
  Un pago de obligación existente conserva su espacio/titular. Se permiten casos
  reales de gasto personal desde cuenta de agencia y viceversa; no se inventan
  transferencias ni se reclasifica el historial automáticamente.
- Las transferencias nuevas toman el uso de la cuenta origen, no el titular.
  Continúan fuera de ingresos/gastos y conservan ambos movimientos de saldo.
  Regresión del modelo verifica BCP Nayeli de agencia, separación de totales y
  cuentas sin clasificar. El modelo y parser rápido, build/TS y lint pasan.
- Pedro eligió explícitamente S/1,500 todas las semanas, incluidos meses de cinco
  pagos. `owner-weekly-target` = 150000 céntimos PEN, con auditoría; se muestra
  como meta semanal por encima de la meta mensual histórica. No genera cargos,
  sueldos, movimientos, transferencias ni órdenes bancarias automáticas.
- Integración candidata/producción: cuatro cuentas de cada uso, meta semanal,
  conservación de datos existentes; Pedro/Nayeli autorizados, Ailyn/Pieer con
  lectura y escritura bloqueadas. Sesiones temporales cerradas; ningún gasto,
  cobro o transferencia creado durante esta entrega.
- Navegador producción 390×844: Resumen con ambos totales, ocho etiquetas y meta
  semanal; borrador de prueba desde BCP Pedro muestra aviso y cambia a Personal
  con un botón. Cerrado sin confirmar y texto borrado. Entrada Registrar conservada.
  Evidencia local privada `output/finanzas-cuentas-separadas-nov02/`.
- Respaldo `distinto-agencia:usage-base-cf4b149`; fuente/compose anterior en
  `/docker/distinto-agencia/usage-91d986e/`. Candidato detenido antes de promover
  y eliminado al finalizar; tres redes existentes conservadas. Sin despliegues
  en Vercel ni cambios en otros contenedores.

## Transferencias desde el registro rápido — 2 noviembre 2026

Escribir o dictar «Me transferí 1,500 soles del BCP de Nayeli al BCP de Pedro»
prepara una transferencia con origen y destino separados. Frases incompletas
abren una revisión para elegir las cuentas o completar el importe; «mi cuenta
personal» no supone que la persona actual sea Pedro. No se guardan movimientos
hasta confirmar. Los cobros recibidos por transferencia siguen siendo cobros.

La revisión muestra las etiquetas Agencia/Personal y el saldo registrado que
quedaría en cada cuenta, cuando se conoce su apertura. Se usa la misma acción
`transfer` del formulario manual: una fila, una transacción, identificador
idempotente para reintentos, sin nuevos ingresos/gastos. El origen resta y el
destino suma; el total combinado se mantiene. No mueve dinero en el banco.
La fecha, moneda, cuentas distintas, autorización y Origin se validan en servidor.

Pruebas: `node --experimental-strip-types scripts/test-finance-quick.mjs`.
La integración `test-finance-transfers.mjs` requiere `TEST_BASE_URL` y acceso
al PostgreSQL activo; crea únicamente cuentas QA aisladas y las limpia al terminar.
Comprueba origen/destino, dos saldos, totales por uso, reintento simultáneo,
anulación y rechazos por moneda, fecha, permisos y origen.

Verificación publicada: `/api/version` = `9687b7d`, sobre `91d986e` conservando
las etiquetas de cuentas y la meta semanal de S/1,500. Compilación, lint afectado,
pruebas de frases e integración en candidata y producción aprobadas. La prueba
usa cuentas QA propias y elimina todas sus filas al finalizar; no registra
transferencias en las cuentas reales. Navegador en 390×844: origen BCP Nayeli,
destino BCP Pedro, importe S/1,500 y confirmación visibles sin desplazar; se probó
bloqueo con cuenta repetida, datos incompletos y se conservó la revisión de gastos.
No se confirmó el ejemplo. Evidencia: `output/finanzas-transferencias-nov02/`.
Audio usa el transcriptor existente y el mismo parser; no se grabó una nueva voz
para esta verificación. La candidata y los túneles de esta prueba se retiran.

Corrección posterior de Pedro: **Efectivo también es Personal**. Se aplicó el
2-nov mediante `accountUsage` a la cuenta `05b0efeb-fd50-4baf-aa78-4dfa7ae4f3de`,
con auditoría, sin modificar titular, moneda, saldo de apertura ni movimientos.
Ahora son cinco cuentas personales y tres de agencia. Efectivo mantiene S/102
registrados en esta comprobación; no fijar ese saldo para cambios futuros.

### Resumen explicable por espacio — 2 de noviembre de 2026

Cada indicador abre su desglose en un diálogo accesible. Agencia separa cobros
confirmados del mes, cuotas por revisar y saldos anteriores; gastos pagados,
pendientes previstos y saldo actual por cuenta. Personal muestra saldo, gastos,
entradas separando transferencias externas y movimientos. Una transferencia
entre dos cuentas personales no crea ingreso. Saldos son actuales, no cierres
históricos; los movimientos se filtran por su fecha real.

La previsión es de caja, no utilidad contable: cobros realizados y pendientes del
mes menos su IGV registrado proporcional, menos pagos realizados y saldo pendiente
de obligaciones, más reserva de costos mensuales todavía sin fecha. Incluye
cuotas por revisar y excluye pendientes anteriores. No presume crédito fiscal,
renta, tipo de cambio ni otros costos. Se resta una sola vez la meta personal:
con S/1,500 semanal y día sin definir, cuatro o cinco retiros según calendario.
Las transferencias realizadas no se restan de nuevo como gasto.

`finance_settings.monthly-cost-drafts.items` conserva costos mensuales con
importe conocido y fecha pendiente. No genera pagos, deuda confirmada ni altera
cuentas. «Programar fecha» abre el formulario con datos precargados. La API bloquea
ese ajuste, crea la recurrencia y retira la reserva en la misma transacción; los
reintentos no duplican. Una reserva se programa en el mes actual, incluyendo el
primer vencimiento de ese mes. Los errores dejan intacta la reserva. Datos
específicos del usuario y sustento se guardan privadamente en la BD, fuera de Git.

Pruebas: `node scripts/test-finance-dashboard.mjs` para periodos, monedas,
abonos/IGV, transferencias, saldos y cuatro/cinco retiros; `TEST_BASE_URL=...
node scripts/test-finance-cost-drafts.mjs` para conversión concurrente/idempotente,
rollback y permisos. No ejecutan pagos reales; el segundo elimina sus fixtures.

Los gastos rápidos nuevos sin espacio explícito toman como propuesta el uso de
la cuenta seleccionada (personal/agencia), incluso al cambiar de cuenta en la
revisión. Un gasto con espacio expresamente indicado o vinculado a una obligación
conserva ese espacio. Los cobros conservan al prestador; no se reclasifican por
la cuenta que recibe el dinero. La revisión continúa siendo obligatoria. Se
cubrieron frases, selección posterior, cuentas mixtas e ingresos vinculados.
