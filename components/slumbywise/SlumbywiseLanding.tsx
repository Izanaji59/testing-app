'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { NewsletterSection } from './NewsletterSection';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import s from './home.module.css';

/** « Pourquoi le sommeil compte » : aucun contenu médical inventé, à compléter avec des sources vérifiées. */
const WHY_SLEEP = [
  { title: 'Récupérer', text: '[À COMPLÉTER : ce que le sommeil permet au corps de réparer.]' },
  { title: 'Penser clair', text: '[À COMPLÉTER : sommeil, attention et mémoire.]' },
  { title: 'Vivre la nuit', text: '[À COMPLÉTER : ce qui change quand on vit ou travaille la nuit.]' },
];

export function SlumbywiseLanding() {
  useSlumbywiseBody();
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    tick(); const timer = setInterval(tick, 30000); return () => clearInterval(timer);
  }, []);
  return <><SlumbywiseStyles /><div className="sw-root"><SlumbywiseNav />
    <main id="main-content" className={s.main}>
      {/* (a) Hero */}
      <section className={s.hero} aria-labelledby="home-title">
        <img className={s.backdrop} src="/images/slumbywise/night-window.jpg" alt="" width={1659} height={948} fetchPriority="high" />
        <div className={s.heroInner}>
          <div className={s.time}><span>La nuit t’appartient</span>{clock && <time>{clock}</time>}</div>
          <h1 id="home-title" className={s.sleepTitle}>Bien dormir, même quand on vit la nuit.</h1>
          <p>Des repères doux pour ton sommeil quand tes journées commencent le soir.<br />Les articles du Carnet et le livre du Concierge, à ton rythme.</p>
          <div className={s.heroActions}><Link href="/carnet" className="sw-btn-primary">Lire le Carnet</Link><Link href="/livre" className="sw-btn-ghost">Découvrir le livre</Link></div>
        </div>
        <div className={s.entrances} aria-label="Explorer Slumbywise">
          <a href="#carnet"><span className={s.number}>01</span><div><h2>Le Carnet</h2><p>Articles sur la vie de nuit</p></div></a>
          <a href="#livre"><span className={s.number}>02</span><div><h2>Le livre</h2><p>Le Carnet du Concierge</p></div></a>
          <a href="#sommeil"><span className={s.number}>03</span><div><h2>Le sommeil</h2><p>Pourquoi il compte</p></div></a>
        </div>
      </section>

      {/* (b) Le Carnet */}
      <section id="carnet" className={`${s.section} ${s.anchor}`} aria-labelledby="carnet-title">
        <div className={s.heading}><div><p className={s.eyebrow}>Le Carnet</p><h2 id="carnet-title">À lire, <em>quand tu veux.</em></h2></div><Link href="/carnet" className={s.textLink}>Tous les articles</Link></div>
        <div className={s.articles}>{CARNET_ARTICLES.slice(0, 6).map(article => <Link key={article.slug} href={'/carnet/' + article.slug} className={s.article}><span className={s.tag}>{article.tag}</span><h3>{article.title}</h3><span className={s.read}>Lire l’article</span></Link>)}</div>
      </section>

      {/* (c) Le livre */}
      <section id="livre" className={`${s.bookSection} ${s.anchor}`} aria-labelledby="book-title"><div className={s.bookInner}>
        <Link href="/livre" className={s.coverLink} aria-label="Découvrir Le Carnet du Concierge"><img src="/images/slumbywise/carnet-du-concierge-cover.jpg" alt="Couverture du Carnet du Concierge" width={600} height={900} loading="lazy" /></Link>
        <div><p className={s.eyebrow}>Le livre</p><h2 id="book-title">Le Carnet<br />du <em>Concierge.</em></h2><p className={s.description}>Des repères pour vivre en décalé, protéger ton sommeil et trouver ton rythme. Un livre à garder près de soi, pour accompagner tes nuits.</p><div className={s.bookAction}><Link href="/livre" className="sw-btn-primary">Découvrir le livre</Link><span>19 €</span></div><Link className={s.subtleLink} href="/carnet">Lire les articles du Carnet</Link></div>
      </div></section>

      {/* (d) Pourquoi le sommeil compte */}
      <section id="sommeil" className={`${s.section} ${s.anchor}`} aria-labelledby="why-title">
        <div className={s.heading}><div><p className={s.eyebrow}>Pourquoi le sommeil compte</p><h2 id="why-title">Dormir, <em>même à contre-temps.</em></h2></div></div>
        <ul className={s.why}>{WHY_SLEEP.map((p, i) => <li key={p.title}><span className={s.number}>0{i + 1}</span><h3>{p.title}</h3><p><span className="sw-placeholder">{p.text}</span></p><p className={s.source}>Source : <span className="sw-placeholder">[SOURCE À COMPLÉTER]</span></p></li>)}</ul>
        <p className={s.medical}>En cas de trouble du sommeil persistant, parle-en à un médecin.</p>
      </section>

      {/* (e) Se divertir */}
      <section id="jouer" className={`${s.section} ${s.games}`} aria-labelledby="games-title"><div className={s.heading}><div><p className={s.eyebrow}>Se divertir</p><h2 id="games-title">Le temps <em>d’une partie.</em></h2></div><p className={s.aside}>Directement dans ton navigateur.</p></div>
        <div className={s.gameGrid}><Link href="/chess" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/chess-preview.png" alt="Le plateau d’échecs de Slumbywise" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Échecs</h3><p>À deux sur un écran, ou contre un bot.</p></div><span>Jouer</span></div></Link>
        <a href="/game/memoire/" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/empreinte-preview.png" alt="Le plateau d’Empreinte et ses pierres" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Empreinte</h3><p>Un duel de territoire, des pouvoirs MBTI.</p></div><span>Jouer</span></div></a></div>
      </section>

      {/* (f) Grindleveling */}
      <section className={s.grind} aria-labelledby="grind-title">
        <p><strong id="grind-title">Grindleveling</strong> — un système de progression pour avancer vers n’importe quel objectif, une quête après l’autre.</p>
        <Link href="/grindleveling" className="sw-btn-ghost">Découvrir Grindleveling</Link>
      </section>

      {/* (g) Denshiku, la cause */}
      <section id="denshiku" className={s.denshiku} aria-labelledby="denshiku-title"><div className={s.denshikuInner}>
        <div><p className={s.eyebrow}>Denshiku · l’association</p><h2 id="denshiku-title">L’héritage,<br /><em>c’est le partage.</em></h2>
          <blockquote className={s.motto}><p>Donne et échange ce qui a de la valeur, pas ce qui est matériel. Donne-lui de quoi ne pas être gourmand s’il a faim.</p></blockquote>
          <Link href="/association" className="sw-btn-primary">Rencontrer Denshiku</Link></div>
        <ol className={s.mission}>
          <li><span className={s.number}>01</span><div><h3>Un numérique bien utilisé</h3><p>Accompagner les enfants et les personnes âgées : le numérique comme un outil pour grandir.</p></div></li>
          <li><span className={s.number}>02</span><div><h3>Rémunérer des étudiants</h3><p>Une partie de ce que nous gagnons les rémunère.</p></div></li>
          <li><span className={s.number}>03</span><div><h3>Aider les enfants démunis</h3><p>L’autre partie revient à l’association, pour les enfants démunis du monde entier, d’abord dans les pays en développement.</p></div></li>
        </ol>
      </div></section>

      {/* (h) Newsletter */}
      <NewsletterSection id="lettre" />
    </main><SlumbywiseFooter /></div></>;
}
