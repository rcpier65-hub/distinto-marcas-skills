import Link from 'next/link'
import { ArrowRight, ChartNoAxesCombined, Route } from 'lucide-react'
import { SiteFrame } from '@/components/sitio/site-frame'
import s from '@/components/recursos/recursos.module.css'

export const metadata = {
  title: 'Recursos para hacer crecer tu negocio — Distinto',
  description: 'Guías gratuitas de Distinto para mejorar el contenido y ordenar la transformación digital de un negocio.',
  alternates: { canonical: 'https://app.distintostudio.com/recursos' },
}

export default function ResourcesPage() {
  return <SiteFrame active="recursos"><div className={s.page}>
    <section className={s.hero}><div className={s.wrap}><span className={s.eyebrow}>Biblioteca Distinto</span><h1>Información útil. <em>Lista para aplicar.</em></h1><p>Guías gratuitas para ordenar decisiones reales de contenido, marketing y crecimiento. Léelas con calma, descárgalas y compártelas con tu equipo.</p></div></section>
    <section className={`${s.wrap} ${s.resourceGrid}`}>
      <article className={s.resourceCard}><span className={s.resourceNumber}>GUÍA 05 · 9 PÁGINAS</span><div className={s.resourceIcon}><ChartNoAxesCombined /></div><h2>Qué contenido repetir, corregir o descartar</h2><p>Aprende a leer atención, conexión, intención y negocio para decidir qué conservar y qué probar después.</p><Link href="/recursos/decision-contenido">Ver y descargar la guía <ArrowRight size={17} /></Link></article>
      <article className={s.resourceCard}><span className={s.resourceNumber}>GUÍA 06 · 10 PÁGINAS</span><div className={s.resourceIcon}><Route /></div><h2>Ruta digital de 90 días para ordenar un negocio</h2><p>Conecta demanda, ventas, seguimiento, operación y datos con un plan dividido en tres etapas ejecutables.</p><Link href="/recursos/madurez-digital">Ver y descargar la guía <ArrowRight size={17} /></Link></article>
    </section>
  </div></SiteFrame>
}
