import { ContentDecisionTool } from '@/components/recursos/content-decision-tool'
import { SiteFrame } from '@/components/sitio/site-frame'

export const metadata = {
  title: '¿Repetir, corregir o descartar este contenido? — Distinto',
  description: 'Analiza las señales de una publicación y decide qué conservar, qué corregir y qué probar después.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos/decision-contenido' },
}

export default function ContentDecisionPage() {
  return <SiteFrame active="recursos"><ContentDecisionTool /></SiteFrame>
}
