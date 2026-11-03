# Saldos al confirmar movimientos · 3 noviembre 2026

Versión funcional `fa870e8`, basada en producción `29d9f25` y la documentación
posterior de correo/personalización. Rama `codex/finanzas-saldo-confirmacion`.

- Las cuentas del registro rápido muestran Saldo actual y su moneda, tanto en
  el selector como después de elegir una cuenta. Sirve para gastos y cobros.
- Transferencias muestra el saldo actual de origen/destino además de la
  proyección ya existente. No cambia el cálculo de transferencias.
- Preparar vuelve a consultar Finanzas sin caché antes de presentar la
  confirmación. Bloqueo de doble preparación y error explícito si falla la
  lectura; no presenta cifras anteriores como recién actualizadas.
- Reutiliza accountBalance y la consulta existente, que suma movimientos
  vigentes desde la apertura independientemente del mes del dashboard.
  Saldo desconocido sigue Por completar; cero y negativos conservan su valor.
- Los importes son saldos registrados en la app, no una conexión bancaria.
  No hubo cambios de esquema, permisos, saldos iniciales ni movimientos reales.

Verificación: build webpack/TypeScript, lint de los tres componentes y pruebas
existentes test-finance-model.mjs y test-finance-quick.mjs aprobadas. Revisión
React: datos derivados sin efectos extra, refresco bajo interacción con bloqueo,
sin polling adicional ni nuevas dependencias.

Navegador Chromium 390×844 y 1280×900: selector, cuenta elegida, cobro,
transferencia, importes desconocidos/cero/negativos y fallo de lectura. Guardado
y actualización posterior simulados en el navegador, sin reenviar POST de
Finanzas. Los registros de cuentas antes/después coinciden. Evidencias privadas
en output/finanzas-saldos-nov03/. La prueba final de producción consulta los
saldos reales y cancela el formulario sin crear pagos.

Compilación local y runtime candidato en VPS, con comparación de la versión
previa antes de promover. Conservadas las redes de app, Supabase y transcriptor.
Consultar de nuevo /api/version antes del siguiente cambio.
