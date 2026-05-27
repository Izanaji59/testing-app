'use client';

import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { fmtRank } from '@/lib/utils';
import type { Profile } from '@/lib/types';

type Props = {
  profile: Profile | null;
  title?: string;
};

function useNowClock() {
  // Compact, no extra deps. SSR-safe : ne s'affiche que côté client.
  if (typeof window === 'undefined') return '00:00';
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function Header({ profile, title }: Props) {
  const clock = useNowClock();
  const code = profile?.operator_code ?? 'OPERATOR_____';
  const mbti = profile?.mbti ? `· ${profile.mbti}` : '';
  const rank = profile ? fmtRank(profile.rank_letter, profile.rank_tier) : 'E';
  const level = profile?.level ?? 1;
  const letter = rank.replace(/[+\-]/g, '');
  const tier = rank.endsWith('+') ? '+' : rank.endsWith('−') || rank.endsWith('-') ? '-' : '';

  return (
    <div
      style={{
        padding: '12px 20px 18px',
        borderBottom: `1px solid ${T.line}`,
        background: 'linear-gradient(180deg, rgba(78, 205, 255, 0.04), transparent)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              background: T.cyan,
              boxShadow: `0 0 8px ${T.cyan}`,
              animation: 'lt-pulse 1.6s ease-in-out infinite',
            }}
          />
          <DataReadout color={T.cyan} size={9} letterSpacing="0.28em">LATRACTION · LV</DataReadout>
        </div>
        <DataReadout color={T.textMute} size={9}>{clock}</DataReadout>
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <DataReadout color={T.textMute} size={9}>{code} {mbti}</DataReadout>
          <div
            style={{
              marginTop: 4,
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: 22,
              color: T.text,
              letterSpacing: '0.06em',
              textShadow: `0 0 12px ${T.cyanGlow}`,
            }}
          >
            {title ?? code}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RankEmblem letter={letter} tier={tier as '+' | '-' | ''} size={36} color={T.cyan} glow={1} />
          <div
            style={{
              fontFamily: T.rank,
              fontWeight: 800,
              fontSize: 30,
              color: T.text,
              textShadow: `0 0 10px ${T.cyanGlow}`,
              lineHeight: 0.9,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {level}
          </div>
        </div>
      </div>
    </div>
  );
}
