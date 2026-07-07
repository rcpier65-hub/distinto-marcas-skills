// app/lib/grilla/styles/distinto-studio.ts
// Distinto Web Studio — estilo "studio-tech" (sub-marca de la agencia).
// Manual oficial (Drive, verificado 27-jun-2026):
//   Azul profundo #132D46 (fondo principal) + Verde vibrante #4ADE80 (acento)
//   + degradado verde->azul como ELEMENTO CLAVE de la identidad. Tipografía Poppins.
//
// Mood: estudio digital/web moderno. Lienzo azul oscuro, textura de grilla tech
// sutil, mallas de degradado verde->azul, wordmark tipográfico (Poppins) blanco
// + verde, cards blancas con acento verde. Date pill con degradado de marca.

import type { StyleBuilder } from './types'

export const studioTech: StyleBuilder = () => ({
  decorations: `
    <div class="st-grid"></div>
    <div class="st-mesh st-mesh-tr"></div>
    <div class="st-mesh st-mesh-bl"></div>
    <div class="st-dot st-dot-1"></div>
    <div class="st-dot st-dot-2"></div>
    <div class="st-dot st-dot-3"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Azul profundo + grilla tech sutil + mallas de degradado verde->azul. */
    .poster { background: var(--canvas) !important; }
    /* Grilla de puntos/líneas (vibe digital studio) */
    .st-grid {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(74,222,128,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(74,222,128,0.06) 1px, transparent 1px);
      background-size: 54px 54px;
      mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 55%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 55%, transparent 100%);
    }
    /* Mallas de degradado verde->azul (elemento clave del manual) */
    .st-mesh {
      position: absolute; z-index: 0; pointer-events: none;
      border-radius: 50%; filter: blur(8px);
    }
    .st-mesh-tr {
      width: 540px; height: 420px; top: -200px; right: -180px;
      background: radial-gradient(circle at 60% 40%, rgba(74,222,128,0.42), rgba(19,45,70,0) 68%);
    }
    .st-mesh-bl {
      width: 520px; height: 460px; bottom: -220px; left: -200px;
      background: radial-gradient(circle at 40% 60%, rgba(74,222,128,0.30), rgba(19,45,70,0) 70%);
    }
    .st-dot { position: absolute; z-index: 1; border-radius: 50%; pointer-events: none; }
    .st-dot-1 { width: 12px; height: 12px; top: 268px; right: 86px; background: #4ADE80; box-shadow: 0 0 16px rgba(74,222,128,0.8); }
    .st-dot-2 { width: 8px;  height: 8px;  top: 320px; right: 130px; background: #7DF0A6; opacity: 0.7; }
    .st-dot-3 { width: 7px;  height: 7px;  bottom: 250px; left: 96px; background: #4ADE80; opacity: 0.6; }

    /* ═══════════════ HEADER ═══════════════
       Isotipo (degradado) pequeño + wordmark tipográfico DISTINTO / WEB STUDIO.
       Date pill con degradado verde->azul. */
    .header {
      position: relative; z-index: 3;
      align-items: center !important;
      gap: 18px !important;
      margin-bottom: 6px !important;
    }
    /* Logo: isotipo SVG (círculo sólido + burbuja punteada) a la izquierda,
       wordmark "DIST/NTO" + "STUDIO" en .brand-name con Poppins (fiel al logo real). */
    .logo {
      width: 96px !important; height: 90px !important;
      margin: 0 8px 0 0 !important; padding: 0 !important;
      background: transparent !important;
      border-radius: 0 !important;
      object-fit: contain !important;
      object-position: center center !important;
      box-shadow: none !important;
    }
    .brand-name { flex: 1; }
    .brand-name .small {
      font-family: 'Poppins', sans-serif !important;
      font-size: 12px !important; font-weight: 500 !important;
      letter-spacing: 7px !important; text-transform: uppercase;
      color: #4ADE80 !important;
      margin-bottom: 1px !important;
      opacity: 0.9 !important;
    }
    .brand-name .big {
      font-family: 'Poppins', sans-serif !important;
      font-size: 40px !important; font-weight: 900 !important;
      letter-spacing: -1px !important; text-transform: uppercase;
      color: #4ADE80 !important;
      line-height: 1 !important;
    }
    .date-pill {
      margin-left: auto !important;
      background: linear-gradient(135deg, #4ADE80 0%, #2BB673 100%) !important;
      color: #0B2030 !important;
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 19px !important;
      letter-spacing: 0.3px !important;
      padding: 13px 25px !important;
      border-radius: 999px !important;
      box-shadow: 0 10px 28px rgba(74,222,128,0.30);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 36px 0 30px !important;
    }
    .hero h1 {
      font-family: 'Poppins', sans-serif !important;
      font-style: normal !important;
      font-weight: 800 !important;
      font-size: 96px !important;
      letter-spacing: -2px !important;
      line-height: 0.98 !important;
      color: #FFFFFF !important;
    }
    .hero .sub {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
      font-size: 21px !important;
      letter-spacing: 0.2px !important;
      color: #BFD2E0 !important;
      margin-top: 14px !important;
    }
    /* Divisor: línea con degradado verde + dot verde glow */
    .divider { margin-top: 18px !important; gap: 14px !important; }
    .divider .line {
      height: 3px !important; width: 200px !important; border-radius: 3px !important;
      background: linear-gradient(90deg, rgba(74,222,128,0) 0%, #4ADE80 100%) !important;
    }
    .divider .line:last-child {
      background: linear-gradient(90deg, #4ADE80 0%, rgba(74,222,128,0) 100%) !important;
    }
    .divider .dot {
      width: 12px !important; height: 12px !important;
      background: #4ADE80 !important;
      border-radius: 50% !important;
      box-shadow: 0 0 16px rgba(74,222,128,0.85);
    }

    /* ═══════════════ CARDS ═══════════════
       Blancas (default) y verde muy claro (alterna), con acento verde a la
       izquierda. Número de día azul profundo Poppins bold. */
    .cards {
      position: relative; z-index: 3;
      gap: 15px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 16px !important;
      padding: 21px 28px !important;
      gap: 24px !important;
      box-shadow: 0 12px 30px rgba(7,20,32,0.30) !important;
      border-left: 6px solid #4ADE80 !important;
    }
    .card.is-alt { background: #EAFBF1 !important; }
    .card .bar { display: none !important; }
    .card .date {
      min-width: 92px !important;
      text-align: center !important;
      padding-right: 22px;
      border-right: 1px solid rgba(19,45,70,0.14);
      display: flex !important; flex-direction: column !important;
    }
    /* .day = número del día · .month = abreviatura del día (Lun/Mar…) */
    .card .date .day {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 800 !important;
      font-size: 50px !important;
      letter-spacing: -1.5px !important;
      color: #132D46 !important;
      line-height: 0.92 !important;
      order: 2;
    }
    .card .date .month {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 15px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      color: #1Fae66 !important;
      opacity: 1 !important;
      margin: 0 0 2px !important;
      order: 1;
    }
    .card .body .title {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 27px !important;
      letter-spacing: -0.4px !important;
      color: #132D46 !important;
      line-height: 1.12 !important;
    }
    .card .body .meta {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
      font-size: 16px !important;
      letter-spacing: 0.2px !important;
      text-transform: none;
      color: #4A6173 !important;
      margin-top: 6px !important;
    }
    .card .icon {
      color: #2BB673 !important;
      opacity: 0.9;
      width: 54px !important; height: 54px !important;
    }

    /* Empty cards — dashed verde tenue sobre azul, transparente */
    .card.empty {
      background: rgba(255,255,255,0.04) !important;
      border: 1.5px dashed rgba(74,222,128,0.35) !important;
      border-left: 1.5px dashed rgba(74,222,128,0.35) !important;
      box-shadow: none !important;
    }
    .card.empty .date { border-right-color: rgba(255,255,255,0.14); }
    .card.empty .date .day { color: #FFFFFF !important; opacity: 0.45; }
    .card.empty .date .month { color: #FFFFFF !important; opacity: 0.45; }
    .card.empty .body .title {
      color: #FFFFFF !important; opacity: 0.5;
      font-weight: 500 !important; font-style: italic;
    }
    .card.empty .body .meta { color: #FFFFFF !important; opacity: 0.32; }
    .card.empty .icon { color: #FFFFFF !important; opacity: 0.2; }

    /* ═══════════════ FOOTER ═══════════════
       Ocultamos el agency-mark (morado/amarillo choca con el azul); el header
       ya dice DISTINTO. Solo URL en verde. */
    .footer {
      position: relative; z-index: 3;
      padding-top: 22px !important;
      border-top: 1px solid rgba(74,222,128,0.22);
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { display: none !important; }
    .footer .url {
      color: #4ADE80 !important;
      opacity: 0.85 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      font-weight: 600 !important;
      margin-top: 14px !important;
    }
  `,
})
