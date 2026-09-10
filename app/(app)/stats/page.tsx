'use client';

import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useXpHistory, type XpHistoryEntry } from '@/hooks/useXpHistory';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { StatRadar } from '@/components/hud/StatRadar';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { statXpForLevel } from '@/lib/engine/xp';
import { STAT_META } from '@/lib/engine/stats';
import type { XpSource } from '@/lib/types';

export default function StatsPage() {
  const { profile, stats, loading } = useProfile();
  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="STATS" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <HudPanel label="RADAR · 11 AXES" glow={0.4}>
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
                  <DataReadout size={9} color={T.textDim} style={{ marginTop: 8, display: 'block', lineHeight: 1.5 }}>
                    {meta.description}
                  </DataReadout>
                </div>
              </HudPanel>
            );
          })}
        </div>

        <XpHistoryPanel />
      </div>
    </div>
  );
}

// ─────────────────────────── Historique XP ───────────────────────────

const SOURCE_LABEL: Record<XpSource, string> = {
  QUEST_COMPLETE: 'Quête',
  SESSION: 'Session de focus',
  BOSS_PHASE: 'Phase de boss',
  CRIT: 'Coup critique',
  STREAK_BONUS: 'Bonus de régularité',
  DAILY_BRIEFING: 'Briefing quotidien',
  ADJUSTMENT: 'Ajustement',
  DECAY: 'Déclin (inactivité)',
};

function fmtRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'à l\'instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function describeEntry(e: XpHistoryEntry): string {
  if (e.questTitle && e.projectTitle) return `${e.questTitle} · ${e.projectTitle}`;
  if (e.questTitle) return e.questTitle;
  if (e.projectTitle) return e.projectTitle;
  return SOURCE_LABEL[e.source];
}

function XpHistoryPanel() {
  const { entries, hasMore, loading, loaded, loadMore } = useXpHistory();

  useEffect(() => {
    if (!loaded && !loading) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HudPanel label="HISTORIQUE XP" glow={0.2}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loaded && entries.length === 0 ? (
          <DataReadout size={9} color={T.textMute}>AUCUN GAIN D&apos;XP POUR L&apos;INSTANT.</DataReadout>
        ) : (
          entries.map(e => {
            const meta = e.stat_kind ? STAT_META[e.stat_kind] : null;
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  padding: '8px 10px', border: `1px solid ${T.line}`, background: T.surf2,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {describeEntry(e)}
                  </div>
                  <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginTop: 2 }}>
                    {meta ? `${meta.short} · ` : ''}{fmtRelativeTime(e.created_at)}
                  </DataReadout>
                </div>
                <div style={{ fontFamily: T.rank, fontSize: 14, color: e.is_crit ? T.amber : T.green, whiteSpace: 'nowrap' }}>
                  +{e.xp_amount}{e.is_crit ? ' ⚡' : ''}
                </div>
              </div>
            );
          })
        )}

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              marginTop: 4, background: 'transparent', color: T.cyan,
              border: `1px dashed ${T.lineMid}`, padding: '10px',
              fontFamily: T.mono, fontSize: 9, letterSpacing: '0.22em',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'CHARGEMENT…' : 'CHARGER PLUS'}
          </button>
        )}
      </div>
    </HudPanel>
  );
}
