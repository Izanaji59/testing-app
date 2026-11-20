'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './shell.module.css';

/** Menu « Se divertir » : les jeux. Allflix reste en ligne (/allflix/) mais n'apparaît plus dans le menu. */
const GAMES = [
  { label: 'Échecs', hint: 'À deux ou contre un bot', href: '/chess', external: false },
  { label: 'Empreinte', hint: 'Un duel de territoire', href: '/game/memoire/', external: true },
];

export function SlumbywiseNav() {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const gameToggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname() ?? '';
  const close = () => { setOpen(false); setGames(false); };
  useEffect(() => {
    function outside(e: PointerEvent) { if (!nav.current?.contains(e.target as Node)) close(); }
    function key(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (games) { setGames(false); gameToggle.current?.focus(); }
      else if (open) { setOpen(false); toggle.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open, games]);
  useEffect(close, [pathname]);
  const here = (prefix: string) => (pathname.startsWith(prefix) ? 'page' : undefined);
  return <nav ref={nav} className={s.nav} aria-label="Navigation principale">
    <Link href="/" className="sw-brand" aria-label="Slumbywise — accueil" onClick={close}><img src="/icons/slumbywise-256.png" alt="" width={48} height={48} className="sw-brand-logo" /><div><div className="sw-brand-mark">Slumby<em>wise</em></div><div className="sw-brand-by">by Denshiku</div></div></Link>
    <button ref={toggle} type="button" className={s.menuToggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? 'Fermer' : 'Menu'}</button>
    <div id="site-navigation" className={`${s.links} ${open ? s.open : ''}`}>
      <Link href="/carnet" aria-current={here('/carnet')} onClick={close}>Carnet</Link>
      <Link href="/livre" aria-current={here('/livre')} onClick={close}>Le livre</Link>
      <div className={s.games}>
        <button ref={gameToggle} type="button" aria-expanded={games} aria-controls="site-games" className={here('/chess') ? s.activeGroup : undefined} onClick={() => setGames(!games)}>
          Se divertir<span aria-hidden="true" className={s.caret}>▾</span>
        </button>
        {games && <div id="site-games" className={s.dropdown}>
          {GAMES.map(g => g.external
            ? <a key={g.href} href={g.href} onClick={close}><span>{g.label}</span><small>{g.hint}</small></a>
            : <Link key={g.href} href={g.href} aria-current={here(g.href)} onClick={close}><span>{g.label}</span><small>{g.hint}</small></Link>)}
        </div>}
      </div>
      <Link href="/grindleveling" onClick={close}>Grindleveling</Link>
      <Link href="/association" aria-current={here('/association')} onClick={close}>Denshiku</Link>
      <Link href="/boutique/" aria-current={here('/boutique')} onClick={close}>Boutique</Link>
      <Link className={s.contactLink} href="/contact" onClick={close}>Nous écrire</Link>
    </div>
  </nav>;
}
