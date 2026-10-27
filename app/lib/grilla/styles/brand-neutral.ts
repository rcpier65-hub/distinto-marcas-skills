import type { StyleBuilder } from './types'

/** Plantilla editorial sin inventar un logo ni copiar la identidad de otra marca. */
export const brandNeutral: StyleBuilder = () => ({
  decorations: '',
  extraCss: `
    .poster { border-top: 12px solid var(--accent); }
    .header { gap: 22px; flex-wrap: wrap; padding-bottom: 24px; border-bottom: 1px solid var(--highlight); }
    .logo { width: 100px; height: 100px; margin: 0; padding: 8px; }
    .brand-name { min-width: 0; }
    .brand-name .small { font-size: 13px; letter-spacing: 2px; margin-bottom: 12px; }
    .brand-name .big { font-size: 40px; letter-spacing: -1px; line-height: 1.15; overflow-wrap: anywhere; }
    .date-pill { flex-shrink: 0; font-size: 14px; letter-spacing: 0; padding: 12px 16px; }
    .hero { text-align: left; margin: 34px 0 28px; }
    .hero h1 { font-size: 78px; font-weight: 800; letter-spacing: -3px; }
    .hero .sub { font-size: 18px; margin-top: 16px; }
    .divider { justify-content: flex-start; }
    .divider .line { width: 100px; background: var(--accent); }
    .divider .dot, .divider .line:last-child { display: none; }
    .card { border: 1px solid var(--highlight); box-shadow: 0 3px 8px rgba(17,24,39,.03); }
    .card.empty { opacity: .5; box-shadow: none; }
    .card .date .day { font-size: 50px; }
    .card .body .title { font-size: 26px; }
    .card .bar { background: var(--accent); }
    .footer { border-top: 1px solid var(--highlight); padding-top: 26px; }
  `,
})
