import { DigitalMaturityTool } from '@/components/recursos/digital-maturity-tool'
import { SiteFrame } from '@/components/sitio/site-frame'

export const metadata = {
  title: 'Evaluación de madurez digital y ruta de 90 días — Distinto',
  description: 'Evalúa seis capacidades del negocio y recibe tres prioridades con una ruta digital de 90 días.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos/madurez-digital' },
}

export default function DigitalMaturityPage() {
  return <SiteFrame active="recursos"><DigitalMaturityTool /></SiteFrame>
}
