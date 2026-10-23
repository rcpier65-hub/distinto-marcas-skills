import Link from 'next/link'
import { ArrowRight, ChartNoAxesCombined, Route } from 'lucide-react'
import { SiteFrame } from '@/components/sitio/site-frame'
import s from '@/components/recursos/recursos.module.css'

export const metadata = {
  title: 'Recursos para hacer crecer tu negocio — Distinto',
  description: 'Herramientas gratuitas de Distinto para decidir qué contenido repetir y construir una ruta realista de transformación digital.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos' },
}

export default function ResourcesPage() {
  return <SiteFrame active="recursos"><div className={s.page}>
    <section className={s.hero}><div className={s.wrap}><span className={s.eyebrow}>Recursos Distinto</span><h1>Menos plantillas. <em>Mejores decisiones.</em></h1><p>Herramientas gratuitas para entender qué está frenando tu contenido o tu negocio y salir con una próxima acción concreta.</p></div></section>
    <section className={`${s.wrap} ${s.resourceGrid}`}>
      <article className={s.resourceCard}><span className={s.resourceNumber}>RECURSO 05</span><div className={s.resourceIcon}><ChartNoAxesCombined /></div><h2>Tablero para decidir qué contenido repetir, corregir o descartar</h2><p>Analiza atención, conexión, intención y resultado comercial según el objetivo de la pieza. Termina con una decisión y el próximo experimento.</p><Link href="/recursos/decision-contenido">Analizar un contenido <ArrowRight size={17} /></Link></article>
      <article className={s.resourceCard}><span className={s.resourceNumber}>RECURSO 06</span><div className={s.resourceIcon}><Route /></div><h2>Evaluación de madurez digital con ruta de 90 días</h2><p>Diagnostica estrategia, demanda, ventas, operaciones, datos y experiencia. Prioriza tres frentes y recibe una ruta ejecutable.</p><Link href="/recursos/madurez-digital">Evaluar mi negocio <ArrowRight size={17} /></Link></article>
    </section>
  </div></SiteFrame>
}
