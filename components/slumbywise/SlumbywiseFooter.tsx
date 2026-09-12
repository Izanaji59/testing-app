'use client';

import Link from 'next/link';

export function SlumbywiseFooter() {
  return (
    <footer className="sw-footer">
      <div className="sw-footer-inner">
        <div className="sw-footer-top">
          <div className="sw-footer-brand-block">
            <div className="sw-footer-brand">Slumby<em>wise</em></div>
            <div className="sw-footer-by">by Denshiku</div>
            <p className="sw-footer-mission">
              Une bibliothèque associative pour les veilleurs. <em>Chaque euro reversé finance l&apos;éducation d&apos;un enfant orphelin.</em>
            </p>
          </div>
          <div className="sw-footer-col">
            <div className="sw-footer-col-title">Le site</div>
            <ul>
              <li><Link href="/#livre">Le livre</Link></li>
              <li><Link href="/carnet">Le carnet</Link></li>
            </ul>
          </div>
          <div className="sw-footer-col">
            <div className="sw-footer-col-title">Nos projets</div>
            <ul>
              <li><Link href="/grindleveling">Grindleveling</Link></li>
              <li><Link href="/chess">Chess</Link></li>
            </ul>
          </div>
          <div className="sw-footer-col">
            <div className="sw-footer-col-title">Contact</div>
            <ul>
              <li><a href="#">Nous écrire</a></li>
              <li><a href="#">Presse</a></li>
              <li><a href="#">Mentions légales</a></li>
            </ul>
          </div>
        </div>
        <div className="sw-footer-bottom">
          <div>© 2026 · Association Denshiku (loi 1901)</div>
          <div>Fait la nuit, à Belfort.</div>
        </div>
      </div>
    </footer>
  );
}
