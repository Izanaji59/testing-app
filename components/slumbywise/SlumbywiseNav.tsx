'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './shell.module.css';

type Item = { label: string; hint: string; href: string; external?: boolean; match?: string };
type Group = { id: string; label: string; items: Item[] };

const GROUPS: Group[] = [
  { id: 'lire-voir', label: 'Lire et voir', items: [
    { label: 'Le Carnet', hint: 'Articles sur le sommeil et la nuit', href: '/carnet', match: '/carnet' },
    { label: 'Le livre', hint: 'Le Carnet du Concierge', href: '/livre', match: '/livre' },
    { label: 'Allflix', hint: 'Séries et films en anglais', href: '/allflix/', match: '/allflix' },
  ] },
  { id: 'divertir', label: 'Se divertir', items: [
    { label: 'Échecs', hint: 'À deux ou contre un bot', href: '/chess', match: '/chess' },
    { label: 'Empreinte', hint: 'Un duel de territoire', href: '/game/memoire/', external: true },
  ] },
];

export function SlumbywiseNav() {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const groupToggles = useRef<Record<string, HTMLButtonElement | null>>({});
  const pathname = usePathname() ?? '';
  const close = () => { setOpen(false); setGroup(null); };
  useEffect(() => {
    function outside(e: PointerEvent) { if (!nav.current?.contains(e.target as Node)) close(); }
    function key(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (group) { const g = group; setGroup(null); groupToggles.current[g]?.focus(); }
      else if (open) { setOpen(false); toggle.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open, group]);
  useEffect(close, [pathname]);
  const here = (prefix?: string) => (prefix && pathname.startsWith(prefix) ? 'page' : undefined);
  return <nav ref={nav} className={s.nav} aria-label="Navigation principale">
    <Link href="/" className="sw-brand" aria-label="Slumbywise — accueil" onClick={close}><img src="/icons/slumbywise-256.png" alt="" width={48} height={48} className="sw-brand-logo" /><div><div className="sw-brand-mark">Slumby<em>wise</em></div><div className="sw-brand-by">by Denshiku</div></div></Link>
    <button ref={toggle} type="button" className={s.menuToggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? 'Fermer' : 'Menu'}</button>
    <div id="site-navigation" className={`${s.links} ${open ? s.open : ''}`}>
      {GROUPS.map(g => (
        <div key={g.id} className={s.games}>
          <button ref={el => { groupToggles.current[g.id] = el; }} type="button" aria-expanded={group === g.id} aria-controls={`site-${g.id}`} className={g.items.some(i => here(i.match)) ? s.activeGroup : undefined} onClick={() => setGroup(group === g.id ? null : g.id)}>
            {g.label}<span aria-hidden="true" className={s.caret}>▾</span>
          </button>
          {group === g.id && <div id={`site-${g.id}`} className={s.dropdown}>
            {g.items.map(i => i.external
              ? <a key={i.href} href={i.href} onClick={close}><span>{i.label}</span><small>{i.hint}</small></a>
              : <Link key={i.href} href={i.href} aria-current={here(i.match)} onClick={close}><span>{i.label}</span><small>{i.hint}</small></Link>)}
          </div>}
        </div>
      ))}
      <Link href="/grindleveling" onClick={close}>Grindleveling</Link>
      <Link href="/association" aria-current={here('/association')} onClick={close}>Denshiku</Link>
      <Link href="/boutique/" aria-current={here('/boutique')} onClick={close}>Boutique</Link>
      <Link className={s.contactLink} href="/contact" onClick={close}>Nous écrire</Link>
    </div>
  </nav>;
}
