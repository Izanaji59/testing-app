'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS, TabIcon } from './TabBar';
import s from './shell.module.css';

/** Menu latéral, affiché seulement sur ordinateur (≥ 1024 px) à la place des onglets du bas. */
export function SideNav() {
  const pathname = usePathname();
  const active = TABS.find(t => pathname?.startsWith(t.href))?.id ?? 'cmd';
  return (
    <nav className={s.sideNav} aria-label="Navigation Grindleveling">
      <Link href="/cmd" className={s.brand}>
        <span className={s.brandTop}><span className={s.brandDot} aria-hidden="true" />LATRACTION · LV</span>
        <span className={s.brandName}>GRINDLEVELING</span>
      </Link>
      {TABS.map(tab => (
        <Link key={tab.id} href={tab.href} className={s.navItem} aria-current={tab.id === active ? 'page' : undefined}>
          <TabIcon kind={tab.icon} active={tab.id === active} />
          {tab.label}
        </Link>
      ))}
      <div className={s.sideFooter}><Link href="/">← SLUMBYWISE</Link></div>
    </nav>
  );
}
