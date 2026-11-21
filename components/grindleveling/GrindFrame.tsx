// Cadre public de Grindleveling : en-tête et pied de page des pages visibles sans compte
// (Personnages, page d'accueil). Sans état : utilisable côté serveur comme côté client.

import Link from 'next/link';
import a from '@/components/allflix/allflix.module.css';
import g from './grind.module.css';

type Section = 'personnages' | 'accueil' | 'regles';

const NAV: Array<{ href: string; label: string; section?: Section }> = [
  { href: '/personnages/', label: 'PERSONNAGES', section: 'personnages' },
  { href: '/chat/', label: 'COMMUNAUTÉ' },
];

export function GrindHeader({ current }: { current?: Section }) {
  return <header className={g.header}><div className={g.headerInner}>
    <Link href="/grindleveling/" className={g.brand} aria-label="Grindleveling, accueil">
      <span className={g.brandTop}><span className={g.brandDot} aria-hidden="true" />DENSHIKU · SYSTÈME</span>
      <span className={g.brandName}>GRINDLEVELING</span>
    </Link>
    <nav className={g.nav} aria-label="Navigation Grindleveling">
      {NAV.map(item => <Link key={item.href} href={item.href} aria-current={item.section && item.section === current ? 'page' : undefined}>{item.label}</Link>)}
    </nav>
    <Link href="/login/" className={g.cta}>MON ESPACE</Link>
  </div></header>;
}

/** Pied de page : `credits` affiche les crédits TMDB / AniList sur les pages qui utilisent leurs données. */
export function GrindFooter({ credits, extraCredit }: { credits?: boolean; extraCredit?: React.ReactNode }) {
  return <footer className={g.footer}>
    <div className={g.footerBrand}>
      <strong>GRINDLEVELING</strong>
      <p>Ta personnalité te fait progresser. Un projet de l’association Denshiku.</p>
      <nav className={g.footerLinks} aria-label="Liens utiles">
        <Link href="/regles/">Règles de la communauté</Link>
        <Link href="/association/">Denshiku</Link>
        <Link href="/informations/#confidentialite">Confidentialité</Link>
        <Link href="/contact/">Nous écrire</Link>
      </nav>
    </div>
    {credits && <div className={g.credits}>
      <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="/allflix/tmdb.svg" alt="TMDB" width="95" height="22" /></a>
      <p>Personnages de films et de séries, et leurs images : TMDB.</p>
      {extraCredit}
      <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </div>}
  </footer>;
}

/** Cadre complet des pages Personnages : reprend la mise en page des fiches, aux couleurs de Grindleveling. */
export function GrindFrame({ children, extraCredit, current = 'personnages' }: { children: React.ReactNode; extraCredit?: React.ReactNode; current?: Section }) {
  return <div className={`${a.app} ${a.grind}`}>
    <GrindHeader current={current} />
    {children}
    <GrindFooter credits extraCredit={extraCredit} />
  </div>;
}
