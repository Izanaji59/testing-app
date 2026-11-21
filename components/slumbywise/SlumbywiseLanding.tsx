'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { NewsletterSection } from './NewsletterSection';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import s from './home.module.css';

/**
 * « Pourquoi le sommeil compte » : vide tant que les textes et leurs sources vérifiées ne sont pas fournis
 * (aucun contenu médical inventé). Prévu : Récupérer / Penser clair / Vivre la nuit.
 * Format : { title: 'Récupérer', text: '…', source: 'Nom de la source' }.
 */
const WHY_SLEEP: Array<{ title: string; text: string; source: string }> = [];

/** Orientation : sites officiels vérifiés (SFRMS, INSV, Réseau Morphée). Aucun praticien n'est recommandé nommément. */
const SPECIALISTS: Array<{ name: string; href?: string; text: string }> = [
  { name: 'Ton médecin traitant', text: 'Le premier pas : il peut t’orienter vers une consultation ou un centre du sommeil. Si tu travailles de nuit, le médecin du travail peut aussi t’aider.' },
  { name: 'Les centres du sommeil agréés (SFRMS)', href: 'https://www.sfrms-sommeil.org/agrements/les-centres-francais-agrees-par-la-sfrms/', text: 'La Société française de recherche et médecine du sommeil liste les centres qu’elle a agréés, partout en France.' },
  { name: 'Institut National du Sommeil et de la Vigilance', href: 'https://institut-sommeil-vigilance.org/', text: 'Information et prévention sur le sommeil et la vigilance.' },
  { name: 'Réseau Morphée (Île-de-France)', href: 'https://reseau-morphee.fr/', text: 'Un réseau de santé dédié aux troubles du sommeil, pour les personnes qui vivent en Île-de-France.' },
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
          <a href="#sommeil"><span className={s.number}>03</span><div><h2>Se faire aider</h2><p>Spécialistes du sommeil</p></div></a>
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

      {/* (d) Se faire aider — les trois points « pourquoi le sommeil compte » attendent des sources vérifiées : masqués d'ici là. */}
      <section id="sommeil" className={`${s.section} ${s.anchor}`} aria-labelledby="why-title">
        <div className={s.heading}><div><p className={s.eyebrow}>Quand le sommeil coince</p><h2 id="why-title">Dormir, <em>même à contre-temps.</em></h2></div></div>
        {WHY_SLEEP.length > 0 && <ul className={s.why}>{WHY_SLEEP.map((p, i) => <li key={p.title}><span className={s.number}>0{i + 1}</span><h3>{p.title}</h3><p>{p.text}</p><p className={s.source}>Source : {p.source}</p></li>)}</ul>}
        <p className={s.medical}>En cas de trouble du sommeil persistant, parle-en à un médecin.</p>
        <div className={s.specialists}>
          <h3 id="specialists-title">Trouver un spécialiste du sommeil</h3>
          <ul>{SPECIALISTS.map(r => <li key={r.name}>{r.href ? <a href={r.href} target="_blank" rel="noopener noreferrer">{r.name}<span className={s.external}> ↗</span></a> : <strong>{r.name}</strong>}<p>{r.text}</p></li>)}</ul>
          <p className={s.disclaimer}>Ressources publiques et associatives, sans lien avec Slumbywise. Elles ne remplacent pas un avis médical.</p>
        </div>
      </section>

      {/* (e) Denshiku, la cause — Slumbywise ne parle que du sommeil : jeux, Allflix et Grindleveling n'apparaissent plus ici. */}
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
