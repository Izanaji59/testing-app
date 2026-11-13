'use client';

// Carte affichée sous un message du tchat qui contient un lien de quête ou de défi partagé.

import Link from 'next/link';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META } from '@/lib/engine/stats';
import type { ShareLink } from '@/lib/share';
import type { Challenge } from '@/hooks/useChallenges';

export function ChatShareCard({ link, challenges }: { link: ShareLink; challenges: Challenge[] }) {
  if (link.kind === 'quest') {
    const q = link.quest;
    const meta = DIFFICULTY_META[q.tier];
    return (
      <Card accent={meta.color}>
        <DataReadout size={8} color={meta.color}>⚔ QUÊTE · {meta.symbol} {meta.label} · {q.minutes} MIN</DataReadout>
        <div style={{ fontFamily: T.display, fontSize: 14, color: T.text, overflowWrap: 'anywhere' }}>{q.title}</div>
        {q.stats.length > 0 && <DataReadout size={8} color={T.textDim}>{q.stats.map(s => STAT_META[s].label).join(' · ')}</DataReadout>}
        <Link href={link.path} style={cta}>RELEVER LA QUÊTE →</Link>
      </Card>
    );
  }
  const c = challenges.find(x => x.id === link.id);
  return (
    <Card accent={T.amber}>
      <DataReadout size={8} color={T.amber}>⚑ DÉFI COMMUN{c ? ` · ${c.duration_days} JOURS · ${c.members} PARTICIPANT${c.members > 1 ? 'S' : ''}` : ''}</DataReadout>
      <div style={{ fontFamily: T.display, fontSize: 14, color: T.text, overflowWrap: 'anywhere' }}>{c ? c.title : 'Défi partagé'}</div>
      {c && <div style={{ fontSize: 12, color: T.textDim }}>Chaque jour : {c.daily_goal}</div>}
      <Link href={link.path} style={{ ...cta, color: T.amber, borderColor: `${T.amber}88` }}>{c?.joined_at ? 'VOIR LE DÉFI →' : 'REJOINDRE LE DÉFI →'}</Link>
    </Card>
  );
}

function Card({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 6, padding: '10px 12px', maxWidth: '82%', minWidth: 220, border: `1px solid ${T.lineMid}`, borderLeft: `3px solid ${accent}`, background: 'rgba(14,26,46,0.72)', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: `0 0 14px ${accent}22` }}>
      {children}
    </div>
  );
}

const cta: React.CSSProperties = {
  alignSelf: 'flex-start', marginTop: 2, padding: '8px 12px', minHeight: 40, display: 'inline-flex', alignItems: 'center',
  border: `1px solid ${T.cyan}88`, color: T.cyan, textDecoration: 'none', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em',
};
