'use client';

import { useState, useCallback } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import type { Project, Quest } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
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

function weeksBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (7 * 86400000)));
}

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: T.textDim,
  border: `1px solid ${T.line}`,
  padding: '8px 12px',
  fontFamily: T.mono,
  fontSize: 9,
  letterSpacing: '0.18em',
  cursor: 'pointer',
};

export function ProjectCard({ project }: { project: Project }) {
  const color = TYPE_COLOR[project.type] ?? T.cyan;
  const [expanded, setExpanded] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadQuests = useCallback(async () => {
    const { data } = await supabase()
      .from('quests')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });
    setQuests((data ?? []) as Quest[]);
    setLoaded(true);
  }, [project.id]);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) await loadQuests();
  }

  const start = project.starts_at ? new Date(project.starts_at) : null;
  const end = project.ends_at ? new Date(project.ends_at) : null;
  const weekNow = start ? weeksBetween(start, new Date()) + 1 : null;
  const weekTotal = start && end ? Math.max(weekNow ?? 1, weeksBetween(start, end) + 1) : null;

  return (
    <HudPanel label={`${project.type}`} glow={project.status === 'ACTIVE' ? 0.35 : 0.1}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.04em' }}>
            <span style={{ color, marginRight: 8 }}>{TYPE_GLYPH[project.type]}</span>
            {project.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {project.reward_eur > 0 && (
              <DataReadout size={9} color={T.green}>{project.reward_eur.toLocaleString('fr-FR')} €</DataReadout>
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

        <button onClick={toggleExpand} style={{ ...btnGhost, marginTop: 12 }}>
          {expanded ? '▲ ROADMAP' : `▼ ROADMAP${loaded && quests.length > 0 ? ` (${quests.filter(q => q.status === 'COMPLETED').length}/${quests.length})` : ''}`}
        </button>

        {/* Roadmap du projet : sa propre timeline + le détail par action (quêtes) */}
        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
            {weekNow && (
              <div style={{ marginBottom: 12 }}>
                <DataReadout size={9} style={{ display: 'block', marginBottom: 4 }}>
                  {weekTotal ? `SEMAINE ${weekNow} / ${weekTotal}` : `SEMAINE ${weekNow} · PAS DE DATE DE FIN`}
                </DataReadout>
                {weekTotal && <XpBar current={weekNow} max={weekTotal} height={4} color={color} />}
              </div>
            )}

            <DataReadout size={9}>ACTIONS · {loaded ? quests.length : '…'}</DataReadout>

            {!loaded ? (
              <DataReadout color={T.textDim} style={{ display: 'block', marginTop: 6 }}>CHARGEMENT…</DataReadout>
            ) : quests.length === 0 ? (
              <DataReadout color={T.textMute} style={{ display: 'block', marginTop: 6 }}>
                AUCUNE ACTION ENCORE. AJOUTE UNE QUÊTE RATTACHÉE À CE PROJET.
              </DataReadout>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {quests.map(q => {
                  const meta = q.difficulty_tier ? DIFFICULTY_META[q.difficulty_tier] : DIFFICULTY_META.ROUTINE;
                  const done = q.status === 'COMPLETED';
                  return (
                    <div
                      key={q.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px',
                        border: `1px solid ${T.line}`,
                        background: done ? 'rgba(92, 255, 178, 0.04)' : 'transparent',
                      }}
                    >
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: meta.color }}>{meta.symbol}</span>
                      <div style={{
                        flex: 1, fontFamily: T.mono, fontSize: 12,
                        color: done ? T.textMute : T.text,
                        textDecoration: done ? 'line-through' : 'none',
                      }}>
                        {q.title}
                      </div>
                      <DataReadout size={8} color={done ? T.green : T.textDim}>{q.status}</DataReadout>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
