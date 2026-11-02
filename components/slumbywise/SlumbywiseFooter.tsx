'use client';
import Link from 'next/link';
export function SlumbywiseFooter() {
  return <footer className="sw-footer"><div className="sw-footer-inner"><div className="sw-footer-top">
    <div className="sw-footer-brand-block"><Link href="/" aria-label="Slumbywise — accueil"><img src="/icons/slumbywise-256.png" alt="" width={72} height={72} className="sw-footer-logo" loading="lazy" /></Link><div className="sw-footer-brand">Slumby<em>wise</em></div><div className="sw-footer-by">by Denshiku</div><p className="sw-footer-mission">Des lectures, des quêtes et des jeux pour trouver ton rythme.</p></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Lire</div><ul><li><Link href="/carnet">Les articles du Carnet</Link></li><li><Link href="/livre">Le Livre</Link></li><li><Link href="/association">Denshiku</Link></li></ul></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Explorer</div><ul><li><Link href="/grindleveling">Grindleveling</Link></li><li><Link href="/allflix/">Allflix</Link></li><li><Link href="/chess">Échecs</Link></li><li><a href="/game/memoire/">Empreinte</a></li></ul></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Échanger</div><ul><li><Link href="/contact">Nous écrire</Link></li><li><a href="mailto:denshiku.corp@gmail.com?subject=Presse%20Slumbywise">Presse</a></li><li><Link href="/informations">Informations et confidentialité</Link></li></ul></div>
  </div><div className="sw-footer-bottom"><span>© 2026 Slumbywise</span><span>Un projet porté par Denshiku.</span></div></div></footer>;
}
