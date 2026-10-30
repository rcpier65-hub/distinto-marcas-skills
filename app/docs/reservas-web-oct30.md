# Reservas públicas corregidas — 30 de octubre de 2026

Producción VPS: `f2d6bb7` (`f2d6bb73f4bc4f077b2379d3c6dcf4e8fc067840`),
sobre `d1a1626` y documentación `51c3ab6`. Rama `codex/reservas-web-vps`.
Commit posterior `46d2b09` añade únicamente pruebas.

## Causas verificadas

- POST público desde `https://app.distintostudio.com` devolvía 403 «Origen no
  permitido» antes de leer el formulario. Next reconstruye la URL con el host
  interno del contenedor; la excepción hardcodeada seguía siendo Vercel.
- El 30 de octubre, la regla existente de anticipación de 24 h y el fin de semana
  dejaban octubre sin espacios. El widget abría ese mes con Continuar desactivado,
  aunque noviembre tenía disponibilidad. Reproducido dentro de distintostudio.com.

## Corrección

- Se admite exactamente el origen público de la app en producción. Se rechazan
  otros dominios, subdominios engañosos, HTTP, origen nulo, localhost y Vercel.
  En desarrollo se conserva el mismo origen local. No se confía en cabeceras
  forwarded arbitrarias y no se desactiva la protección de origen.
- La primera carga busca el primer mes disponible, limitada por el horizonte
  configurado. La navegación manual sigue disponible; un mes vacío ofrece
  «Buscar próximo horario». La pausa y los errores se muestran explícitamente.
- Se conservan horarios, anticipación, duración, reservas existentes, permisos
  y configuración de Google. Ninguna nueva reserva comercial ni invitación.

## Verificación

- Build local, TypeScript, lint afectado y `test-reservas.mjs` pasan.
- `test-reservas-widget.mjs` cubre el origen VPS, rechazo de otros orígenes,
  cierre de mes/año, selección, navegación manual, horizonte, pausa y fallos.
- `test-live-reservas.ts`: fila temporal real, evento Google sin asistentes,
  Meet y reintento idempotente. Con `TEST_BASE_URL`, confirma el evento temporal
  existente a través del POST público: 200 con Meet, rechazo 403 de otro origen
  y 409 si cambian los datos. El evento precreado evita enviar invitaciones.
  Verificado en candidata privada y producción. Todos los temporales eliminados.
- Navegador en producción: noviembre aparece automáticamente, permite elegir
  día/hora y continuar. Evidencia `output/reservas-web-oct30/reservas-corregidas.png`.
- No se probó el dispositivo físico del cliente ni la recepción de correo:
  las pruebas deliberadamente no envían invitaciones.

## Despliegue

Next compilado localmente con NEXT_PUBLIC originales del VPS en memoria.
Mismas dependencias, public y next.config; imagen runtime activa reutilizada.
Imagen nueva `distinto-agencia:reservas-f2d6bb7`, manifest
`eb170517eb2cff57c47a78065729e28675ff30cec35d0e991d5dc09292415ffd`.
Retorno conservado `distinto-agencia:reservas-base-d1a1626`.
Solo se reemplazó distinto-agencia, conservando ambas redes y Supabase VPS.
Candidata y túnel retirados. Reconsultar `/api/version` antes del siguiente cambio.
