import { GuideLanding } from '@/components/recursos/guide-landing'
import { SiteFrame } from '@/components/sitio/site-frame'

export const metadata = {
  title: '¿Repetir, corregir o descartar este contenido? — Distinto',
  description: 'Analiza las señales de una publicación y decide qué conservar, qué corregir y qué probar después.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos/decision-contenido' },
}

export default function ContentDecisionPage() {
  return <SiteFrame active="recursos"><GuideLanding
    number="05"
    resource="decision-contenido"
    title="Qué contenido repetir, corregir o descartar"
    coverImage="/recursos/portadas/recurso-05-contenido.png"
    description="Una guía para dejar de evaluar publicaciones solo por sus vistas y convertir cada pieza en una decisión concreta para el siguiente contenido."
    filename="guia-05-decidir-contenido.pdf"
    pages={9}
    minutes={14}
    chapters={[
      'Definir la función real de cada contenido',
      'Leer atención, conexión, intención y negocio',
      'Usar la matriz de decisión sin matar ideas demasiado pronto',
      'Diagnosticar el cuello de botella por sus síntomas',
      'Repetir un concepto sin copiar el video',
      'Aplicar una revisión semanal de 30 minutos',
    ]}
    takeaways={[
      'separar una mala idea de una mala ejecución;',
      'elegir qué conservar y qué variable cambiar;',
      'crear un siguiente experimento verificable.',
    ]}
    sources={[{ label: 'YouTube Studio: métricas de participación y retención', href: 'https://support.google.com/youtube/answer/9313698?hl=es' }]}
  /></SiteFrame>
}
