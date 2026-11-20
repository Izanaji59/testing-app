'use client';

// Sous-menu de l'onglet Communauté : tchat, événements, personnages (votes MBTI), profil.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '@/lib/tokens';

const ITEMS = [
  { href: '/chat', label: 'TCHAT', match: '/chat' },
  { href: '/evenements', label: 'ÉVÉNEMENTS', match: '/evenements' },
  { href: '/personnages/', label: 'PERSONNAGES ↗', match: '/personnages' },
  { href: '/profile', label: 'MON PROFIL', match: '/profile' },
  { href: '/regles/', label: 'RÈGLES', match: '/regles' },
];

export function CommunityNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Communauté" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ITEMS.map(item => {
        const on = pathname.startsWith(item.match);
        return (
          <Link key={item.href} href={item.href} aria-current={on ? 'page' : undefined} style={{
            flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 12px',
            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', textDecoration: 'none', whiteSpace: 'nowrap',
            color: on ? T.bg : T.textDim, background: on ? T.cyan : 'transparent',
            border: `1px solid ${on ? T.cyan : T.line}`, boxShadow: on ? `0 0 10px ${T.cyanGlow}` : 'none',
          }}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
