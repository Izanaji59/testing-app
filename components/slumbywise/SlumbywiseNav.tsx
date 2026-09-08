'use client';

import Link from 'next/link';
import { WHATSAPP_ORDER_URL } from './SlumbywiseStyles';

export function SlumbywiseNav() {
  return (
    <nav>
      <div className="sw-brand">
        <div>
          <div className="sw-brand-mark">Slumby<em>wise</em></div>
          <div className="sw-brand-by">by Denshiku</div>
        </div>
      </div>
      <div className="sw-nav-links">
        <Link href="/#livre">Le livre</Link>
        <Link href="/carnet">Le carnet</Link>
        <Link href="/#letter">La lettre</Link>
        <Link href="/grindleveling">Grindleveling</Link>
        <Link href="/chess">Chess</Link>
        <a href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer" className="sw-nav-cta">Commander</a>
      </div>
    </nav>
  );
}
