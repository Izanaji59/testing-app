'use client';

import { useState } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/lib/types';
import { ProjectTimeline } from './project-types/ProjectTimeline';
import { CampaignPath } from './project-types/CampaignPath';
import { RaidCountdown } from './project-types/RaidCountdown';
import { DungeonMap } from './project-types/DungeonMap';
import { BossHpBar } from './project-types/BossHpBar';
import { ProjectRoadmapModal } from './ProjectRoadmapModal';

const TYPE_GLYPH: Record<string, string> = {
  OPERATION: '⊟', CAMPAIGN: '◇◇◇', RAID: '⏱', DUNGEON: '⌬', BOSS: '✦',
};

const TYPE_COLOR: Record<string, string> = {
  OPERATION: T.cyan, CAMPAIGN: T.cyan, RAID: T.danger, DUNGEON: T.purple, BOSS: T.amber,
};

export function ProjectCard({ project }: { project: Project }) {
  const color = TYPE_COLOR[project.type] ?? T.cyan;
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await supabase().from('projects').delete().eq('id', project.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <HudPanel label={`${project.type}`} glow={project.status === 'ACTIVE' ? 0.35 : 0.1}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.04em' }}>
            <span style={{ color, marginRight: 8 }}>{TYPE_GLYPH[project.type]}</span>
            {project.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {project.weekly_target_eur > 0 && (
              <DataReadout size={9} color={T.textDim}>🎯 {project.weekly_target_eur.toLocaleString('fr-FR')} €/sem</DataReadout>
            )}
            <DataReadout size={9}>{project.status}</DataReadout>
          </div>
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

        <button
          onClick={() => setShowRoadmap(true)}
          style={{
            marginTop: 12,
            background: 'transparent',
            color: T.textDim,
            border: `1px solid ${T.line}`,
            padding: '8px 12px',
            fontFamily: T.mono,
            fontSize: 9,
            letterSpacing: '0.18em',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ◉ ROADMAP DÉTAILLÉE
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              marginTop: 8,
              background: 'transparent',
              color: T.textMute,
              border: 'none',
              padding: '4px',
              fontFamily: T.mono,
              fontSize: 8,
              letterSpacing: '0.18em',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            SUPPRIMER LE PROJET
          </button>
        ) : (
          <div style={{ marginTop: 8 }}>
            <DataReadout size={8} color={T.danger} style={{ display: 'block', marginBottom: 6 }}>
              SES QUÊTES SERONT AUSSI SUPPRIMÉES. IRRÉVERSIBLE.
            </DataReadout>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={remove}
              disabled={deleting}
              style={{
                flex: 1,
                background: 'transparent',
                color: T.danger,
                border: `1px solid ${T.danger}55`,
                padding: '8px',
                fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em',
                cursor: 'pointer',
              }}
            >
              {deleting ? '…' : 'CONFIRMER LA SUPPRESSION'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              style={{
                background: 'transparent',
                color: T.textDim,
                border: `1px solid ${T.line}`,
                padding: '8px 12px',
                fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em',
                cursor: 'pointer',
              }}
            >
              ANNULER
            </button>
          </div>
          </div>
        )}
      </div>

      {showRoadmap && (
        <ProjectRoadmapModal project={project} onClose={() => setShowRoadmap(false)} />
      )}
    </HudPanel>
  );
}
