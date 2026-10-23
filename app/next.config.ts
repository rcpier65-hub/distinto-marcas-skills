import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // Un solo worker durante la compilación del VPS; no modifica la app en ejecución.
  ...(process.env.DISTINTO_VPS_BUILD === '1' ? {
    experimental: { cpus: 1, webpackMemoryOptimizations: true },
  } : {}),
  // Excluir Chromium + puppeteer del bundle de Next.js.
  // Si Next intenta empaquetarlos, su mecanismo interno de resolución de binaries
  // (libs nativas como libnss3, etc) se rompe y Chromium no puede lanzarse.
  // Estos paquetes los carga Node directamente desde node_modules en runtime.
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],

  // Páginas legales del sitio público (mismo texto que distintostudio.com).
  async rewrites() {
    return [
      { source: '/privacidad', destination: '/legal/privacidad.html' },
      { source: '/terminos', destination: '/legal/terminos.html' },
    ]
  },

  // Identificador único por despliegue. Se inyecta en el bundle del cliente
  // (NEXT_PUBLIC_*) y se compara contra /api/version en runtime para detectar
  // cuándo hay una versión nueva publicada y recargar la app sola (ver
  // components/pwa/auto-update.tsx). En Vercel usamos el commit; si no está,
  // la URL única del deploy; en local, 'dev' (no auto-recarga).
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_BUILD_ID || process.env.VERCEL_URL || 'dev',
  },
};

export default nextConfig;
