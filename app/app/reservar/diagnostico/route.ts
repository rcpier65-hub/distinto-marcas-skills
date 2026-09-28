import { bookingHtml } from '@/lib/reservas/widget'
export async function GET() {
  return new Response(bookingHtml, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self' https://distintostudio.com https://www.distintostudio.com; base-uri 'none'; form-action 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  } })
}
