import Link from 'next/link'
import { ArrowLeft, BookOpen, Check, Clock3, Download, FileText } from 'lucide-react'
import { ResourceDownload } from './resource-download'
import s from './recursos.module.css'

type GuideLandingProps = {
  number: '05' | '06'
  resource: 'decision-contenido' | 'madurez-digital'
  title: string
  description: string
  filename: string
  pages: number
  minutes: number
  chapters: string[]
  takeaways: string[]
  sources: { label: string; href: string }[]
}

export function GuideLanding(props: GuideLandingProps) {
  return <div className={s.page}>
    <section className={s.guideHero}>
      <div className={s.wrap}>
        <Link href="/recursos" className={s.back}><ArrowLeft size={16} /> Todos los recursos</Link>
        <div className={s.guideHeroGrid}>
          <div>
            <span className={s.eyebrow}>Guía gratuita · Recurso {props.number}</span>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
            <div className={s.guideMeta}>
              <span><FileText size={16} /> PDF · {props.pages} páginas</span>
              <span><Clock3 size={16} /> {props.minutes} min de lectura</span>
              <span><Download size={16} /> Descarga inmediata</span>
            </div>
          </div>
          <div className={s.coverWrap} aria-hidden="true">
            <div className={s.cover}>
              <span>RECURSO {props.number}</span>
              <strong>{props.title}</strong>
              <small>Guía práctica de Distinto</small>
              <i />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className={`${s.wrap} ${s.guideBody}`}>
      <article className={s.guideContent}>
        <span className={s.sectionLabel}>Qué encontrarás</span>
        <h2>Información para aplicar, no otra plantilla vacía.</h2>
        <p>La guía explica el criterio detrás de cada decisión, muestra cómo reconocer los errores más frecuentes y termina con una hoja de trabajo para llevarlo a tu empresa.</p>
        <div className={s.chapterList}>
          {props.chapters.map((chapter, index) => <div key={chapter}><b>{String(index + 1).padStart(2, '0')}</b><span>{chapter}</span></div>)}
        </div>

        <div className={s.takeawayBox}>
          <BookOpen size={25} />
          <div><h3>Al terminar podrás:</h3>{props.takeaways.map(item => <p key={item}><Check size={15} /> {item}</p>)}</div>
        </div>

        <div className={s.sources}>
          <h3>Base de la guía</h3>
          <p>El contenido combina metodología de trabajo de Distinto con fuentes institucionales. No promete una fórmula universal: ayuda a tomar decisiones con el contexto real del negocio.</p>
          {props.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
        </div>
      </article>

      <aside className={s.downloadSide}>
        <ResourceDownload resource={props.resource} title={props.title} filename={props.filename} />
      </aside>
    </section>
  </div>
}
