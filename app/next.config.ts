import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excluir Chromium + puppeteer del bundle de Next.js.
  // Si Next intenta empaquetarlos, su mecanismo interno de resolución de binaries
  // (libs nativas como libnss3, etc) se rompe y Chromium no puede lanzarse.
  // Estos paquetes los carga Node directamente desde node_modules en runtime.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default nextConfig;
