'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './shell.module.css';

export function SlumbywiseNav() {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const gameToggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
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
  return <nav ref={nav} className={s.nav} aria-label="Navigation principale">
    <Link href="/" className="sw-brand" aria-label="Slumbywise — accueil" onClick={close}><img src="/icons/slumbywise-256.png" alt="" width={48} height={48} className="sw-brand-logo" /><div><div className="sw-brand-mark">Slumby<em>wise</em></div><div className="sw-brand-by">by Denshiku</div></div></Link>
    <button ref={toggle} type="button" className={s.menuToggle} aria-expanded={open} aria-controls="site-navigation" onClick={()=>setOpen(!open)}>{open ? 'Fermer' : 'Menu'}</button>
    <div id="site-navigation" className={`${s.links} ${open ? s.open : ''}`}>
      <Link href="/carnet" aria-current={pathname.startsWith('/carnet')?'page':undefined} onClick={close}>Le Carnet</Link>
      <Link href="/livre" aria-current={pathname.startsWith('/livre')?'page':undefined} onClick={close}>Le Livre</Link>
      <Link href="/grindleveling" onClick={close}>Avancer</Link>
      <div className={s.games}><button ref={gameToggle} type="button" aria-expanded={games} aria-controls="site-games" onClick={()=>setGames(!games)}>Jouer</button>{games && <div id="site-games" className={s.dropdown}><Link href="/chess" onClick={close}>Échecs</Link><a href="/game/memoire/" onClick={close}>Empreinte</a></div>}</div>
      <Link href="/allflix/" onClick={close}>Allflix</Link>
      <Link href="/boutique/" aria-current={pathname.startsWith('/boutique')?'page':undefined} onClick={close}>Boutique</Link>
      <Link className={s.contactLink} href="/contact" onClick={close}>Nous écrire</Link>
    </div>
  </nav>;
}
