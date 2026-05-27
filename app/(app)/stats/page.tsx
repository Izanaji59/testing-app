'use client';

import { useProfile } from '@/hooks/useProfile';
import { Header } from '@/components/shell/Header';
import { HudPanel } from '@/components/hud/HudPanel';
import { StatRadar } from '@/components/hud/StatRadar';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { statXpForLevel } from '@/lib/engine/xp';
import { STAT_META } from '@/lib/engine/stats';

export default function StatsPage() {
  const { profile, stats } = useProfile();
  if (!profile) return null;

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="STATS" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <HudPanel label="RADAR · 9 AXES" glow={0.4}>
          <div style={{ padding: 18, display: 'grid', placeItems: 'center' }}>
            <StatRadar stats={stats} size={280} />
          </div>
        </HudPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map(s => {
            const meta = STAT_META[s.kind];
            const need = statXpForLevel(s.level);
            return (
              <HudPanel key={s.id} thin glow={0.15}>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: meta.color, letterSpacing: '0.18em' }}>
                        {meta.symbol} {meta.label}
                      </span>
                    </div>
                    <div style={{ fontFamily: T.rank, fontSize: 22, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                      {s.level}
                    </div>
                  </div>
                  <XpBar current={s.xp} max={need} height={4} color={meta.color} />
                  <DataReadout style={{ marginTop: 6, display: 'block' }}>
                    {s.xp.toLocaleString('fr-FR')} / {need.toLocaleString('fr-FR')} XP
                    {s.decay_pct > 0 && (
                      <span style={{ color: T.danger, marginLeft: 8 }}>· DECAY {s.decay_pct}%</span>
                    )}
                  </DataReadout>
                </div>
              </HudPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
