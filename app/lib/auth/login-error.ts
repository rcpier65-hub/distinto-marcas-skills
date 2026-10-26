/** Public messages only: never show the provider response or credentials. */
export function loginErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object'
    ? error as { status?: number; code?: string; message?: string }
    : {}
  const message = typeof details.message === 'string' ? details.message : ''

  // Supabase may return HTTP 402 without an Auth error code when the entire
  // project is restricted. This does not mean the user's password is wrong.
  if (details.status === 402 || /exceed_\w+_quota|Service for this project is restricted/i.test(message)) {
    return 'El servicio está temporalmente restringido por el proveedor. El administrador debe restablecerlo. No cambies tu contraseña.'
  }
  if (details.status === 429 || details.code === 'over_request_rate_limit') {
    return 'Hay demasiados intentos de acceso. Espera unos minutos y vuelve a intentar.'
  }
  if (details.code === 'invalid_credentials' || /^Invalid login credentials$/i.test(message)) {
    return 'Email o contraseña incorrectos'
  }
  if (details.code === 'email_not_confirmed') {
    return 'Tu cuenta necesita confirmar el correo. Comunícate con el administrador.'
  }
  return 'No pudimos conectar con el servicio de acceso. Inténtalo más tarde o comunícate con soporte. No es necesario cambiar tu contraseña.'
}
