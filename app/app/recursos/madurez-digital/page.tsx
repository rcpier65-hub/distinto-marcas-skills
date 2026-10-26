import { GuideLanding } from '@/components/recursos/guide-landing'
import { SiteFrame } from '@/components/sitio/site-frame'

export const metadata = {
  title: 'Ruta digital de 90 días para ordenar un negocio — Distinto',
  description: 'Guía práctica para conectar marketing, ventas, seguimiento, operación y datos durante los próximos 90 días.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos/madurez-digital' },
}

export default function DigitalMaturityPage() {
  return <SiteFrame active="recursos"><GuideLanding
    number="06"
    resource="madurez-digital"
    title="Ruta digital de 90 días para ordenar un negocio"
    coverImage="/recursos/portadas/recurso-06-ruta-digital.png"
    description="Una guía para conectar marketing, ventas, seguimiento, operación y datos sin llenar la empresa de herramientas que todavía no necesita."
    filename="guia-06-ruta-digital-90-dias.pdf"
    pages={10}
    minutes={16}
    chapters={[
      'Entender las seis partes de un ecosistema digital',
      'Reconocer el nivel real de madurez del negocio',
      'Hacer visible el proceso durante los primeros 30 días',
      'Conectar y estandarizar entre los días 31 y 60',
      'Medir y mejorar entre los días 61 y 90',
      'Priorizar inversiones antes de comprar tecnología',
    ]}
    takeaways={[
      'dibujar el recorrido completo de un prospecto;',
      'definir entregables e indicadores para cada mes;',
      'convertir la transformación digital en un plan ejecutable.',
    ]}
    sources={[
      { label: 'OCDE: herramientas de diagnóstico digital para pymes', href: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2020/07/digital-business-diagnostic-tools-for-smes-and-entrepreneurship_c8f2e916/516bdf9c-en.pdf' },
      { label: 'BID: transformación digital de empresas en América Latina', href: 'https://publications.iadb.org/publications/english/document/The-360-on-Digital-Transformation-in-Firms-in-Latin-America-and-the-Caribbean.pdf' },
    ]}
  /></SiteFrame>
}
