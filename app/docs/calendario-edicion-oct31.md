# Calendario: tipo, inicio/fin y Meet — 31 octubre 2026

Base publicada cotejada: `f2d6bb7` (reservas web), HEAD de partida `adee857`.
Rama `codex/calendario-editar-tipo-horas`; VPS de la agencia, sin Vercel.

## Uso

Abrir un evento en Calendario. Elegir **Reunión** o **Grabación**, editar fecha,
hora de inicio y hora de fin y pulsar Guardar. La duración muestra si termina
al día siguiente. Los eventos externos admiten además **Otro evento** y día
completo; las reuniones requieren hora.

El enlace de reunión aparece completo, con **Unirse a Meet** y **Copiar**. Si
no hay enlace, marcar **Generar enlace de Google Meet al guardar**. Se agrega
la conferencia al mismo evento; cuando no existe evento Google se crea uno sin
asistentes nuevos. Google puede tardar unos segundos en entregar el enlace.

## Conservación y sincronización

- Cambio de tipo interno en transacción: mantiene UUID, marca, Google ID, notas
  y creación. El registro existe en una sola tabla; los enlaces de Planificación
  cambian su tipo. `calendario_datos` conserva campos específicos para reversión.
- Una grabación con lote de guiones conectado no se convierte mientras ese lote
  siga vinculado, para evitar que la FK pierda su relación. El horario sí es editable.
- Google PATCH conserva asistentes, descripción, color y Meet. La clasificación
  externa se guarda en `extendedProperties.private.distintoTipo`, sin depender
  del título. Si hay error Google, se revierte la transacción local.
- La API Google y PostgreSQL no constituyen una transacción distribuida: una
  caída tras un PATCH remoto pero antes del COMMIT exige comprobar ambos lados.
  La UI no anuncia éxito ante errores de red. El bloqueo serializa conversiones
  simultáneas; Google usa ETag para detectar cambios concurrentes externos.
- Meet no se elimina al convertir a grabación. No se envían avisos nuevos en
  las ediciones (`sendUpdates=none`). No se cambian asistentes o credenciales.
- Se conserva duración real Google para eventos vinculados (incluido Praktico
  15–20 del 16/oct); el fallback de columnas ya no pierde duración/título/Meet
  cuando falta `guion_listo` en el esquema histórico.
- Permiso `calendario.manage` y sesión exigidos por la acción. No cambia roles.

Migración aditiva `20261031160000_calendario_edicion.sql`: título/Meet y
metadatos de conservación en las tablas existentes; no modifica eventos reales.

## Validación

- Build Next/TypeScript y lint de archivos cambiados.
- `test-calendar-edit-live.ts`: eventos temporales sin invitados; conversión
  ida/vuelta, UUID/Meet estables, horarios, notas y campos específicos,
  simultaneidad sin duplicados, error Google con rollback, tipo externo, Meet
  generado, día completo ↔ horas y cruce de medianoche. Limpieza automática.
- `test-calendar-team-live.mjs`: incluye nueva acción, permisos de equipo y
  cuentas sin edición, con payloads inválidos sin crear reuniones.
- `test-calendar-access.mjs`, `test-brand-calendar.mjs`: regresiones de acceso,
  origen, aislamiento y deduplicación.
- Evidencias de compilación y pruebas en `output/calendario-editar-oct31/`.
