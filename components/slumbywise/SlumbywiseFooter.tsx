'use client';
import Link from 'next/link';
/** Slumbywise = le sommeil. Les autres projets de Denshiku n'apparaissent qu'en une ligne discrète. */
export function SlumbywiseFooter() {
  return <footer className="sw-footer"><div className="sw-footer-inner"><div className="sw-footer-top">
    <div className="sw-footer-brand-block"><Link href="/" aria-label="Slumbywise — accueil"><img src="/icons/slumbywise-256.png" alt="" width={72} height={72} className="sw-footer-logo" loading="lazy" /></Link><div className="sw-footer-brand">Slumby<em>wise</em></div><div className="sw-footer-by">by Denshiku</div><p className="sw-footer-mission">Bien dormir, même quand on vit la nuit. La nuit t’appartient.</p></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Le sommeil</div><ul><li><Link href="/carnet">Le Carnet</Link></li><li><Link href="/livre">Le livre</Link></li><li><Link href="/boutique/">Boutique</Link></li></ul></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Denshiku</div><ul><li><Link href="/association">L’association</Link></li><li><Link href="/contact">Nous écrire</Link></li><li><a href="mailto:denshiku.corp@gmail.com?subject=Presse%20Slumbywise">Presse</a></li></ul></div>
    <div className="sw-footer-col"><div className="sw-footer-col-title">Un autre projet</div><ul><li><Link href="/grindleveling">Grindleveling</Link></li></ul></div>
  </div>
  <nav className="sw-footer-legal" aria-label="Informations légales"><Link href="/informations#mentions-legales">Mentions légales</Link><Link href="/informations#conditions-de-vente">Conditions de vente</Link><Link href="/informations#confidentialite">Confidentialité</Link></nav>
  <div className="sw-footer-bottom"><span>© 2026 Slumbywise</span><span>Un site associatif porté par Denshiku.</span></div></div></footer>;
}
