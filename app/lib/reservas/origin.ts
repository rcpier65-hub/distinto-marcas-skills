/** The public origin stays stable even when Next runs behind the VPS proxy. */
export function allowedBookingOrigin(
  origin: string | null,
  requestOrigin: string,
  production = process.env.NODE_ENV === 'production',
): boolean {
  if (origin === 'https://app.distintostudio.com') return true
  // Local previews can submit to themselves; production never trusts internal
  // hosts, forwarded headers, missing origins or the retired Vercel domain.
  return !production && !!origin && origin === requestOrigin
}
