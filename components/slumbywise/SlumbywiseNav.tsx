'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WHATSAPP_ORDER_URL } from './SlumbywiseStyles';

export function SlumbywiseNav() {
  const [gameOpen, setGameOpen] = useState(false);

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
        <div
          className="sw-nav-dropdown"
          onMouseEnter={() => setGameOpen(true)}
          onMouseLeave={() => setGameOpen(false)}
        >
          <button
            type="button"
            className="sw-nav-dropdown-trigger"
            aria-expanded={gameOpen}
            onFocus={() => setGameOpen(true)}
            onClick={() => setGameOpen(true)}
          >
            Jeu <span className="sw-nav-dropdown-caret">▾</span>
          </button>
          {gameOpen && (
            <div className="sw-nav-dropdown-menu">
              <Link href="/chess" onClick={() => setGameOpen(false)}>Chess</Link>
              <Link href="/grindleveling" onClick={() => setGameOpen(false)}>Grindleveling</Link>
            </div>
          )}
        </div>
        <a href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer" className="sw-nav-cta">Commander</a>
      </div>
    </nav>
  );
}
