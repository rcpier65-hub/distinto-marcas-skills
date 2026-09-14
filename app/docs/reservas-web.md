# Reservas públicas — Distinto

## URLs

- Página pública: `https://distinto-app.vercel.app/reservar/diagnostico`
- Configuración interna: `https://distinto-app.vercel.app/grabaciones/calendario/reservas`
- GET disponibilidad: `/api/reservas/disponibilidad?desde=YYYY-MM-DD` (31 días, sin datos privados).
- POST reserva: `/api/reservas` (utilizado por el formulario del mismo origen).

## Conexión verificada

La conexión existente con `calendar.events` permite consultar eventos mediante `events.list`. Se verificó disponibilidad real y una reserva temporal con Google Meet, reintento sin duplicados y limpieza completa, sin invitados ni correos. No es necesario reconectar Google.

La nueva API usa la sesión OAuth existente de la app, no el conector de Google del asistente. No es necesario iniciar sesión en la app para reservar.

## Ajustes iniciales

Citas de 60 minutos, lunes a viernes 09:00–18:00, 24 horas de anticipación, hasta 45 días adelante. Horario de Perú. Ajustables en el panel interno por director/admin. El calendario destino es `primary`. Se consulta el estado ocupado de primary, el calendario conectado en la app y el calendario destino, además de reuniones y grabaciones internas. Las reuniones internas sin duración se bloquean durante 60 minutos; grabaciones con hora durante 120 minutos y sin hora por el día completo, porque el esquema existente no tiene hora final. Son bloqueos conservadores.

## Código para insertar en la web

```html
<iframe id="distinto-reservas"
  src="https://distinto-app.vercel.app/reservar/diagnostico"
  title="Agenda tu reunión de diagnóstico con Distinto"
  loading="lazy"
  style="display:block;width:100%;height:850px;border:0;border-radius:24px;"
></iframe>
<script>
(() => {
  const frame = document.getElementById('distinto-reservas');
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://distinto-app.vercel.app' || event.source !== frame.contentWindow) return;
    if (event.data?.type !== 'distinto-booking:resize') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height >= 200 && height <= 3000) frame.style.height = Math.ceil(height) + 'px';
  });
})();
</script>
```

El iframe admite `https://distintostudio.com` y `https://www.distintostudio.com`. Mantener origen y comprobación de ventana del listener. No se necesitan claves ni tokens en la web. El documento se sirve mediante un Route Handler independiente: no renderiza el layout interno ni carga sus datos.

## Persistencia y sincronización

Las tablas `booking_settings`, `web_bookings` y `booking_rate_limits` tienen RLS activado y acceso exclusivo de service_role. El servidor verifica el intervalo firmado y vuelve a consultar disponibilidad al confirmar. Una restricción de exclusión de Postgres impide reservas web superpuestas. El evento Google tiene un identificador determinista por reserva para evitar duplicados en reintentos. Un fallo incierto conserva el estado pendiente; el usuario puede confirmar de nuevo con los mismos datos.

Las reservas confirmadas aparecen en la vista interna a través de su evento Google. La sección Reservas de la web muestra los datos del prospecto sin inventar una marca cliente. Las cancelaciones y cambios de hora hechos en Google se reflejan al consultar disponibilidad. La consulta visible se refresca cada minuto y al volver a la pestaña; no se usan webhooks.

Google Calendar no ofrece una transacción conjunta con Postgres: se verifica justo antes de crear, pero una modificación simultánea hecha directamente en Google puede ocurrir entre esa consulta y la inserción. El bloqueo transaccional cubre las reservas de esta página.

## Pruebas realizadas

- `node scripts/test-reservas.mjs`: fechas, zona horaria, anticipación, horizonte, superposición, pausa y sintaxis JS.
- `npx tsc --noEmit` y `npm run build`.
- `scripts/test-reservas.sql`: exclusión, permisos y límites de solicitudes dentro de BEGIN/ROLLBACK; no deja reservas ni envía correos.
- Demo local `node scripts/preview-reservas.mjs`: selección y confirmación ficticia en navegador; móvil 390px sin desbordamiento horizontal.
- Supabase advisors: sin hallazgos que mencionen las tres tablas nuevas.

- `scripts/test-live-reservas.ts`: persistencia real en Supabase, creación de evento y Google Meet, reintento idempotente y eliminación del evento y registro temporales. No se enviaron invitaciones durante la prueba.

La migración `20260913194318_public_booking.sql` ya se aplicó mediante Management API a `exhmimlehdisonjvedvx`. No volver a ejecutarla a ciegas ni correr todas las migraciones históricas sobre producción.
