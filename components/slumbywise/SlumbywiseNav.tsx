'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { WHATSAPP_ORDER_URL } from './SlumbywiseStyles';

export function SlumbywiseNav() {
  const [gameOpen, setGameOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clic en dehors du dropdown (ou touche Échap) → on le referme.
  useEffect(() => {
    if (!gameOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGameOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setGameOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [gameOpen]);

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
        <div className="sw-nav-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="sw-nav-dropdown-trigger"
            aria-expanded={gameOpen}
            onClick={() => setGameOpen(o => !o)}
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
