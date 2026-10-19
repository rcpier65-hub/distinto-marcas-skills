/* Logos de integraciones para el sitio público (formas y colores de marca). */
type P = { size?: number };
export function GoogleCalendarLogo({ size = 28 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="5" fill="#fff" stroke="#dadce0" />
      <path d="M6 14V11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v3z" fill="#4285F4" />
      <rect x="6" y="34" width="9" height="8" fill="#34A853" />
      <path d="M33 42h4a5 5 0 0 0 5-5v-4h-9z" fill="#EA4335" />
      <rect x="33" y="14" width="9" height="19" fill="#FBBC04" />
      <text x="24" y="33" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="15" fill="#1a73e8">31</text>
    </svg>
  );
}
export function ShopifyLogo({ size = 28 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M34.6 9.8c0-.2-.2-.3-.4-.3l-3.4-.3-2.5-2.5c-.2-.2-.7-.2-.9-.1L26 7c-.6-1.8-1.8-3.5-3.8-3.5h-.2C21.4 2.8 20.7 2.5 20.1 2.5c-4.7 0-7 5.9-7.7 8.9l-3.3 1c-1 .3-1.1.4-1.2 1.4L5.4 40.1 31.8 45l14.3-3.1zM24.3 8l-2.2.7v-.5c0-1.4-.2-2.6-.5-3.5 1.4.2 2.3 1.7 2.7 3.3zm-4.6-3.2c.4 1 .6 2.3.6 4.1v.3l-4.6 1.4c.9-3.4 2.5-5.1 4-5.8zm-1.8-1.6c.3 0 .5.1.8.3-1.9.9-4 3.2-4.9 7.8l-3.6 1.1c1-3.4 3.4-9.2 7.7-9.2z" fill="#95BF47" />
      <path d="M34.2 9.5l-3.4-.3-2.5-2.5c-.1-.1-.2-.1-.3-.1L26.1 45l20-4.3-11.5-30.9c0-.2-.2-.3-.4-.3z" fill="#5E8E3E" />
      <path d="M22 16.6l-1.4 4.3s-1.3-.7-2.8-.7c-2.3 0-2.4 1.4-2.4 1.8 0 2 5.2 2.7 5.2 7.3 0 3.6-2.3 6-5.4 6-3.7 0-5.6-2.3-5.6-2.3l1-3.3s2 1.7 3.6 1.7c1.1 0 1.5-.8 1.5-1.5 0-2.6-4.3-2.7-4.3-7 0-3.6 2.6-7.1 7.8-7.1 2 0 2.8.6 2.8.6z" fill="#fff" />
    </svg>
  );
}
