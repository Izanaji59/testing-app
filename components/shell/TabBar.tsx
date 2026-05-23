'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '@/lib/tokens';

type TabId = 'cmd' | 'quests' | 'donjon' | 'stats' | 'profile';

const TABS: Array<{ id: TabId; label: string; href: string; icon: 'square' | 'diamond' | 'tower' | 'radar' | 'circle' }> = [
  { id: 'cmd',     label: 'CMD',     href: '/cmd',     icon: 'square'  },
  { id: 'quests',  label: 'QUÊTES',  href: '/quests',  icon: 'diamond' },
  { id: 'donjon',  label: 'DONJON',  href: '/donjon',  icon: 'tower'   },
  { id: 'stats',   label: 'STATS',   href: '/stats',   icon: 'radar'   },
  { id: 'profile', label: 'PROFIL',  href: '/profile', icon: 'circle'  },
];

export function TabBar() {
  const pathname = usePathname();
  const activeTab = TABS.find(t => pathname?.startsWith(t.href))?.id ?? 'cmd';

  return (
    <div
      style={{
        position: 'fixed',
        left: 14, right: 14, bottom: 20,
        maxWidth: 480,
        margin: '0 auto',
        height: 64,
        borderRadius: 18,
        background: 'rgba(6, 9, 26, 0.86)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: `1px solid ${T.lineMid}`,
        boxShadow: `0 8px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(78, 205, 255, 0.08)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 50,
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: isActive ? 1 : 0.5,
              position: 'relative',
              textDecoration: 'none',
              padding: '6px 8px',
              minWidth: 56,
              transition: 'opacity 0.2s ease',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: -6,
                width: 24, height: 2,
                background: T.cyan,
                boxShadow: `0 0 6px ${T.cyan}`,
              }} />
            )}
            <TabIcon kind={tab.icon} active={isActive} />
            <div style={{
              fontFamily: T.mono,
              fontSize: 8,
              letterSpacing: '0.22em',
              color: isActive ? T.cyan : T.textDim,
            }}>
              {tab.label}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TabIcon({ kind, active }: { kind: 'square' | 'diamond' | 'tower' | 'radar' | 'circle'; active: boolean }) {
  const stroke = active ? T.cyan : T.textDim;
  const fill = active ? 'rgba(78, 205, 255, 0.2)' : 'none';
  const glow = active ? { filter: `drop-shadow(0 0 4px ${T.cyan})` } : {};
  const props = { width: 20, height: 20, viewBox: '0 0 20 20', style: glow };
  switch (kind) {
    case 'square':
      return (
        <svg {...props}>
          <rect x={3} y={3} width={14} height={14} stroke={stroke} strokeWidth={1.5} fill={fill} />
          <rect x={6} y={6} width={8} height={8} stroke={stroke} strokeWidth={1} fill={active ? T.cyan : 'none'} />
        </svg>
      );
    case 'diamond':
      return (
        <svg {...props}>
          <polygon points="10,2 18,10 10,18 2,10" stroke={stroke} strokeWidth={1.5} fill={fill} />
          <polygon points="10,6 14,10 10,14 6,10" fill={active ? T.cyan : stroke} opacity={active ? 1 : 0.6} />
        </svg>
      );
    case 'tower':
      return (
        <svg {...props}>
          <rect x={6} y={2} width={8} height={3} stroke={stroke} strokeWidth={1.2} fill={fill} />
          <rect x={5} y={7} width={10} height={3} stroke={stroke} strokeWidth={1.2} fill={active ? 'rgba(78, 205, 255, 0.4)' : 'none'} />
          <rect x={4} y={12} width={12} height={3} stroke={stroke} strokeWidth={1.2} fill={fill} />
        </svg>
      );
    case 'radar':
      return (
        <svg {...props}>
          <circle cx={10} cy={10} r={7} stroke={stroke} strokeWidth={1.2} fill="none" />
          <circle cx={10} cy={10} r={3.5} stroke={stroke} strokeWidth={1} fill="none" />
          <line x1={10} y1={3} x2={10} y2={17} stroke={stroke} strokeWidth={0.8} />
          <line x1={3} y1={10} x2={17} y2={10} stroke={stroke} strokeWidth={0.8} />
          <circle cx={10} cy={10} r={1.5} fill={active ? T.cyan : stroke} />
        </svg>
      );
    case 'circle':
      return (
        <svg {...props}>
          <circle cx={10} cy={10} r={7} stroke={stroke} strokeWidth={1.5} fill={fill} />
          <circle cx={10} cy={8} r={2.5} stroke={stroke} strokeWidth={1} fill={active ? T.cyan : 'none'} />
          <path d="M5 16 Q 10 12 15 16" stroke={stroke} strokeWidth={1} fill="none" />
        </svg>
      );
  }
}
