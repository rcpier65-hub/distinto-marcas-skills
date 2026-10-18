/* Logos oficiales de las redes (formas y colores de marca) para los reportes.
   Pedro 18-oct-2026: "los iconos deben ser originales de las redes sociales". */

type P = { size?: number; className?: string };

export function FacebookLogo({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#0866FF" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
      <path fill="#fff" d="m16.67 15.56.53-3.5h-3.32V9.8c0-.96.47-1.89 1.96-1.89h1.5V4.95s-1.37-.24-2.68-.24c-2.74 0-4.54 1.68-4.54 4.7v2.66H7.08v3.49h3.04V24a12.3 12.3 0 0 0 3.76 0v-8.44z" />
    </svg>
  );
}

export function InstagramLogo({ size = 20, className }: P) {
  const id = `ig-grad-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.07" r="1.3">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.1" stopColor="#FFDD55" />
          <stop offset="0.5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${id})`} />
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.3" cy="7.7" r="1.05" fill="#fff" />
    </svg>
  );
}

export function TikTokLogo({ size = 20, className }: P) {
  const d = "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <g transform="translate(1.2 1.2) scale(.9)">
        <path d={d} fill="#25F4EE" transform="translate(-0.6 -0.6)" />
        <path d={d} fill="#FE2C55" transform="translate(0.6 0.6)" />
        <path d={d} fill="#fff" />
      </g>
    </svg>
  );
}

export function MetaLogo({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#0081FB" d="M6.9 5C4.1 5 2 8.6 2 12.4 2 15 3.3 17 5.5 17c1.6 0 2.8-.7 4.5-3.5l1.2-2 .4-.6.3.5 1.5 2.5c1.6 2.5 2.7 3.1 4.3 3.1 2.3 0 3.3-2 3.3-4.6C21 8.5 19 5 16.2 5c-1.5 0-2.8 1-4.3 3.1C10.4 6 9 5 6.9 5Zm.2 2.4c1.1 0 2 .9 3.6 3.3l-1.3 2c-1.3 2-1.9 2.4-2.7 2.4-.9 0-1.5-.8-1.5-2.4 0-2.7 1.3-5.3 1.9-5.3Zm9 0c.9 0 2.2 2.4 2.2 5.2 0 1.6-.6 2.5-1.5 2.5-.7 0-1.3-.6-2.6-2.6l-1.8-2.9c1.5-1.9 2.6-2.2 3.7-2.2Z" />
    </svg>
  );
}

export const NETWORK_LOGO = { facebook: FacebookLogo, instagram: InstagramLogo, tiktok: TikTokLogo } as const;
