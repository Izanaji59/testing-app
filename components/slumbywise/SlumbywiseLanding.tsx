'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import s from './home.module.css';

const PILLARS = [
  { tag: 'Identité', title: 'Tu dis qui tu es', text: 'Chaque donjon décrit une part de toi : « Je suis quelqu’un qui prend soin de son corps. » Pas un objectif à tenir, une identité à habiter.' },
  { tag: 'Moyens', title: 'Le Système te donne le chemin', text: 'Des quêtes simples, émises une fois ou chaque jour, un temps de concentration, des défis à plusieurs. Tu avances par les moyens, les objectifs suivent.' },
  { tag: 'Personnalité', title: 'Ta progression te ressemble', text: 'Des stats qui montent à chaque pas, des rangs E à S nommés selon ton profil MBTI, une jauge de volonté et une batterie sociale à ton image.' },
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
      <section className={s.hero} aria-labelledby="home-title">
        <img className={s.backdrop} src="/images/slumbywise/night-window.jpg" alt="" width={1659} height={948} fetchPriority="high" />
        <div className={s.heroInner}>
          <div className={s.time}><span>À ton rythme</span>{clock && <time>{clock}</time>}</div>
          <h1 id="home-title">La nuit<br />t’appartient.</h1>
          <p>Voir, lire et se divertir correctement.<br />Des lectures, des quêtes et des jeux qui te font grandir.</p>
          <div className={s.heroActions}><Link href="/grindleveling" className="sw-btn-primary">Éveiller mon Système</Link><Link href="/carnet" className="sw-btn-ghost">Ouvrir le Carnet</Link></div>
        </div>
        <div className={s.entrances} aria-label="Explorer Slumbywise">
          <a href="#lire"><span className={s.number}>01</span><div><h2>Voir ou lire</h2><p>Le Carnet, le Livre, Allflix</p></div></a>
          <a href="#divertir"><span className={s.number}>02</span><div><h2>Se divertir</h2><p>Grindleveling, Échecs, Empreinte</p></div></a>
          <a href="#denshiku"><span className={s.number}>03</span><div><h2>Partager</h2><p>Denshiku, l’association</p></div></a>
        </div>
      </section>

      <section id="lire" className={`${s.section} ${s.anchor}`} aria-labelledby="carnet-title">
        <div className={s.heading}><div><p className={s.eyebrow}>Voir ou lire correctement</p><h2 id="carnet-title">À lire, <em>quand tu veux.</em></h2></div><Link href="/carnet" className={s.textLink}>Tous les articles</Link></div>
        <div className={s.articles}>{CARNET_ARTICLES.map(article => <Link key={article.slug} href={'/carnet/' + article.slug} className={s.article}><span className={s.tag}>{article.tag}</span><h3>{article.title}</h3><span className={s.read}>Lire l’article</span></Link>)}</div>
        <Link href="/allflix/" className={s.allflix}><span className={s.tag}>Allflix</span><strong>Choisir quoi regarder, en connaissant ses personnages.</strong><span className={s.read}>Films, séries et animés, avec le profil MBTI de leurs personnages →</span></Link>
      </section>
      <section id="livre" className={s.bookSection} aria-labelledby="book-title"><div className={s.bookInner}>
        <Link href="/livre" className={s.coverLink} aria-label="Découvrir Le Carnet du Concierge"><img src="/images/slumbywise/carnet-du-concierge-cover.jpg" alt="Couverture du Carnet du Concierge" width={600} height={900} loading="lazy" /></Link>
        <div><p className={s.eyebrow}>Le Livre</p><h2 id="book-title">Le Carnet<br />du <em>Concierge.</em></h2><p className={s.description}>Des repères pour vivre en décalé, construire tes habitudes et trouver ton rythme. Un livre à garder près de soi.</p><div className={s.bookAction}><Link href="/livre" className="sw-btn-primary">Découvrir le livre</Link><span>19 EUR</span></div><Link className={s.subtleLink} href="/carnet">Lire les articles du Carnet</Link></div>
      </div></section>

      <section id="divertir" className={`${s.section} ${s.anchor}`} aria-labelledby="focus-title">
        <div className={s.focus}>
          <div><p className={s.eyebrow}>Se divertir correctement · Grindleveling</p><h2 id="focus-title">Deviens qui tu es.<br /><em>Le moyen d’abord.</em></h2><p className={s.description}>Grindleveling ne te demande pas de tenir des objectifs. Tu dis qui tu es, et le Système te donne les moyens d’y arriver, une quête après l’autre. Tes objectifs se dessinent d’eux-mêmes : ils font partie de toi.</p><Link href="/grindleveling" className="sw-btn-primary">Éveiller mon Système</Link></div>
          <div className={s.questExample} aria-label="Exemple de donjon dans Grindleveling"><div className={s.exampleHeader}><span>Donjon</span><span>Grindleveling</span></div><span className={s.questGoal}>« Je suis quelqu’un qui crée. »</span><h3>Créer pendant 15 minutes</h3><div className={s.timer}><span>↻ Émise chaque jour</span><strong>15:00</strong><span>Une quête à la fois</span></div><div className={s.exampleFooter}><span>Jusqu’à la fin du donjon</span><span>XP en Créativité</span></div></div>
        </div>
        <ul className={s.pillars}>{PILLARS.map(p => <li key={p.tag}><span className={s.tag}>{p.tag}</span><h3>{p.title}</h3><p>{p.text}</p></li>)}</ul>
      </section>
      <section id="jouer" className={`${s.section} ${s.games}`} aria-labelledby="games-title"><div className={s.heading}><div><p className={s.eyebrow}>Se divertir correctement · Les jeux</p><h2 id="games-title">Le temps <em>d’une partie.</em></h2></div><p className={s.aside}>Directement dans ton navigateur.</p></div>
        <div className={s.gameGrid}><Link href="/chess" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/chess-preview.png" alt="Le plateau d’échecs de Slumbywise" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Échecs</h3><p>À deux sur un écran, ou contre un bot.</p></div><span>Jouer</span></div></Link>
        <a href="/game/memoire/" className={s.game}><div className={s.gameImage}><img src="/images/slumbywise/empreinte-preview.png" alt="Le plateau d’Empreinte et ses pierres" width={800} height={600} loading="lazy" /></div><div className={s.gameCaption}><div><h3>Empreinte</h3><p>Un duel de territoire, des pouvoirs MBTI.</p></div><span>Jouer</span></div></a></div>
      </section>

      <section id="denshiku" className={s.denshiku} aria-labelledby="denshiku-title"><div className={s.denshikuInner}>
        <div><p className={s.eyebrow}>Denshiku · l’association</p><h2 id="denshiku-title">L’héritage,<br /><em>c’est le partage.</em></h2>
          <blockquote className={s.motto}><p>Donne et échange ce qui a de la valeur, pas ce qui est matériel. Donne-lui de quoi ne pas être gourmand s’il a faim.</p></blockquote>
          <Link href="/association" className="sw-btn-primary">Rencontrer Denshiku</Link></div>
        <ol className={s.mission}>
          <li><span className={s.number}>01</span><div><h3>Digitaliser correctement</h3><p>Les enfants et les personnes âgées : le numérique comme un outil pour grandir.</p></div></li>
          <li><span className={s.number}>02</span><div><h3>Rémunérer des étudiants</h3><p>Une partie de ce que nous gagnons les rémunère.</p></div></li>
          <li><span className={s.number}>03</span><div><h3>Aider les enfants démunis</h3><p>L’autre partie revient à l’association, pour les enfants démunis du monde entier, d’abord dans les pays en développement.</p></div></li>
        </ol>
      </div></section>
    </main><SlumbywiseFooter /></div></>;
}
