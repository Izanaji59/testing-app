'use client';

import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import type { Mission, Project } from '@/lib/types';

const HORIZON_LABEL: Record<Mission['horizon'], string> = {
  QUARTER: 'TRIMESTRE',
  YEAR: 'ANNÉE',
  LIFE: 'LONG TERME',
};

function weeksBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (7 * 86400000)));
}

export function MissionCard({ mission, projects }: { mission: Mission; projects: Project[] }) {
  const linked = projects.filter(p => p.mission_id === mission.id);
  const avgProgress = linked.length
    ? linked.reduce((a, p) => a + p.progress_pct, 0) / linked.length
    : 0;

  const start = new Date(mission.starts_at);
  const now = new Date();
  const weekNow = weeksBetween(start, now) + 1;
  const end = mission.ends_at ? new Date(mission.ends_at) : null;
  const weekTotal = end ? Math.max(weekNow, weeksBetween(start, end) + 1) : null;

  return (
    <HudPanel label={HORIZON_LABEL[mission.horizon]} glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.04em' }}>
          {mission.title}
        </div>

        <div>
          <DataReadout size={9} style={{ display: 'block', marginBottom: 4 }}>
            {weekTotal ? `SEMAINE ${weekNow} / ${weekTotal}` : `SEMAINE ${weekNow} · PAS DE DATE DE FIN`}
          </DataReadout>
          {weekTotal && <XpBar current={weekNow} max={weekTotal} height={4} />}
        </div>

        <div>
          <DataReadout size={9} style={{ display: 'block', marginBottom: 4 }}>
            {linked.length === 0
              ? 'AUCUN PROJET LIÉ ENCORE'
              : `${linked.length} PROJET${linked.length > 1 ? 'S' : ''} · ${Math.round(avgProgress)}% AVANCEMENT MOYEN`}
          </DataReadout>
          {linked.length > 0 && <XpBar current={avgProgress} max={100} height={4} color={T.green} />}
        </div>
      </div>
    </HudPanel>
  );
}
