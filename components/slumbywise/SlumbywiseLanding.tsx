'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import s from './home.module.css';

export function SlumbywiseLanding() {
  useSlumbywiseBody();
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    tick(); const timer = setInterval(tick, 30000); return () => clearInterval(timer);
  }, []);
  return <><SlumbywiseStyles /><div className="sw-root"><SlumbywiseNav />
    <main id="main-content" className={s.main}>
      <section className={s.hero} aria-labelledby="home-title">
        <img className={s.backdrop} src="/images/slumbywise/night-window.jpg" alt="" width={1659} height={948} fetchPriority="high" />
        <div className={s.heroInner}><div className={s.time}><span>À ton rythme</span>{clock && <time>{clock}</time>}</div><h1 id="home-title">La nuit<br />t’appartient.</h1><p>Une lecture, une quête, une partie.<br />Trouve ce qui te fait du bien, à cette heure-ci.</p><Link href="/carnet" className="sw-btn-primary">Ouvrir le Carnet</Link></div>
        <div className={s.entrances} aria-label="Explorer Slumbywise">
          <Link href="/carnet"><span className={s.number}>01</span><div><h2>Lire</h2><p>Les articles du Carnet</p></div></Link>
          <Link href="/grindleveling"><span className={s.number}>02</span><div><h2>Avancer</h2><p>Tes quêtes avec Grindleveling</p></div></Link>
          <a href="#jouer"><span className={s.number}>03</span><div><h2>Jouer</h2><p>Échecs et Empreinte</p></div></a>
        </div>
      </section>
      <section className={s.section} aria-labelledby="carnet-title">
        <div className={s.heading}><div><p className={s.eyebrow}>Le Carnet</p><h2 id="carnet-title">À lire, <em>quand tu veux.</em></h2></div><Link href="/carnet" className={s.textLink}>Tous les articles</Link></div>
        <div className={s.articles}>{CARNET_ARTICLES.map(article => <Link key={article.slug} href={'/carnet/' + article.slug} className={s.article}><span className={s.tag}>{article.tag}</span><h3>{article.title}</h3><span className={s.read}>Lire l’article</span></Link>)}</div>
      </section>
      <section id="livre" className={s.bookSection} aria-labelledby="book-title"><div className={s.bookInner}>
        <Link href="/livre" className={s.coverLink} aria-label="Découvrir Le Carnet du Concierge"><img src="/images/slumbywise/carnet-du-concierge-cover.jpg" alt="Couverture du Carnet du Concierge" width={600} height={900} loading="lazy" /></Link>
        <div><p className={s.eyebrow}>Le Livre</p><h2 id="book-title">Le Carnet<br />du <em>Concierge.</em></h2><p className={s.description}>Des repères pour vivre en décalé, construire tes habitudes et trouver ton rythme. Un livre à garder près de soi.</p><div className={s.bookAction}><Link href="/livre" className="sw-btn-primary">Découvrir le livre</Link><span>19 EUR</span></div><Link className={s.subtleLink} href="/carnet">Lire les articles du Carnet</Link></div>
      </div></section>
      <section className={`${s.section} ${s.focus}`} aria-labelledby="focus-title">
        <div><p className={s.eyebrow}>Grindleveling</p><h2 id="focus-title">Une quête.<br /><em>Un pas de plus.</em></h2><p className={s.description}>Choisis une tâche, lance un temps de concentration et retrouve ton effort dans tes statistiques. Ton objectif reste en vue.</p><Link href="/grindleveling" className="sw-btn-primary">Retrouver mes quêtes</Link></div>
        <div className={s.questExample} aria-label="Exemple de quête dans Grindleveling"><div className={s.exampleHeader}><span>Exemple de quête</span><span>Grindleveling</span></div><span className={s.questGoal}>Objectif : lancer mon activité</span><h3>Rédiger ma première offre</h3><div className={s.timer}><span>Concentration</span><strong>25:00</strong><span>Une tâche à la fois</span></div><div className={s.exampleFooter}><span>Temps consacré à la quête</span><span>Suivi dans tes statistiques</span></div></div>
      </section>
      <section id="jouer" className={`${s.section} ${s.games}`} aria-labelledby="games-title"><div className={s.heading}><div><p className={s.eyebrow}>Les jeux</p><h2 id="games-title">Le temps <em>d’une partie.</em></h2></div><p className={s.aside}>Directement dans ton navigateur.</p></div>
        <div className={s.gameGrid}><Link href="/chess" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/chess-preview.png" alt="Le plateau d’échecs de Slumbywise" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Échecs</h3><p>À deux sur un écran, ou contre un bot.</p></div><span>Jouer</span></div></Link>
        <a href="/game/memoire/" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/empreinte-preview.png" alt="Le plateau d’Empreinte et ses pierres" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Empreinte</h3><p>Un duel de territoire, des pouvoirs MBTI.</p></div><span>Jouer</span></div></a></div>
      </section>
      <section className={s.association}><p>Un projet porté par Denshiku.</p><Link href="/association" className={s.textLink}>Rencontrer l’association</Link></section>
    </main><SlumbywiseFooter /></div></>;
}
