'use client';

import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import type { Project } from '@/lib/types';
import { ProjectTimeline } from './project-types/ProjectTimeline';
import { CampaignPath } from './project-types/CampaignPath';
import { RaidCountdown } from './project-types/RaidCountdown';
import { DungeonMap } from './project-types/DungeonMap';
import { BossHpBar } from './project-types/BossHpBar';

const TYPE_GLYPH: Record<string, string> = {
  OPERATION: '⊟', CAMPAIGN: '◇◇◇', RAID: '⏱', DUNGEON: '⌬', BOSS: '✦',
};

const TYPE_COLOR: Record<string, string> = {
  OPERATION: T.cyan, CAMPAIGN: T.cyan, RAID: T.danger, DUNGEON: T.purple, BOSS: T.amber,
};

export function ProjectCard({ project }: { project: Project }) {
  const color = TYPE_COLOR[project.type] ?? T.cyan;

  return (
    <HudPanel label={`${project.type}`} glow={project.status === 'ACTIVE' ? 0.35 : 0.1}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.04em' }}>
            <span style={{ color, marginRight: 8 }}>{TYPE_GLYPH[project.type]}</span>
            {project.title}
          </div>
          <DataReadout size={9}>{project.status}</DataReadout>
        </div>

        {/* Vue spécifique au type */}
        <div style={{ margin: '12px 0' }}>
          {project.type === 'OPERATION' && <ProjectTimeline project={project} />}
          {project.type === 'CAMPAIGN' && <CampaignPath project={project} />}
          {project.type === 'RAID' && <RaidCountdown project={project} />}
          {project.type === 'DUNGEON' && <DungeonMap project={project} />}
          {project.type === 'BOSS' && <BossHpBar project={project} />}
        </div>

        {/* Progression générique en fallback */}
        {project.type !== 'BOSS' && (
          <>
            <XpBar current={project.progress_pct} max={100} height={3} color={color} />
            <DataReadout size={9} style={{ marginTop: 6, display: 'block' }}>
              {Math.round(project.progress_pct)}% · {project.primary_stat ?? '—'}
            </DataReadout>
          </>
        )}
      </div>
    </HudPanel>
  );
}
