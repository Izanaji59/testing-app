'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { ProjectRoadmapModal } from './ProjectRoadmapModal';
import { ProjectLoot } from './ProjectLoot';
import { StatTierChips } from './StatTierPicker';
import { projectStatTiers } from '@/lib/engine/statTiers';
import { T } from '@/lib/tokens';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { projectPct } from '@/lib/engine/progress';
import type { Project, Quest } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = { OPERATION: 'OPÉRATION', CAMPAIGN: 'CAMPAGNE', RAID: 'RAID', DUNGEON: 'DONJON', BOSS: 'BOSS' };
const TYPE_COLOR: Record<string, string> = { OPERATION: T.cyan, CAMPAIGN: T.cyan, RAID: T.danger, DUNGEON: T.purple, BOSS: T.amber };
const DONE_PREVIEW = 6;

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

/** Vue « Liste » des donjons : chaque projet avec ses quêtes à faire et terminées. */
export function ProjectQuestBoard({ projects, quests }: { projects: Project[]; quests: Quest[] }) {
  const [roadmap, setRoadmap] = useState<Project | null>(null);
  if (!projects.length) return <p style={{ color: T.textDim, fontSize: 13 }}>Aucun projet en cours.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      {projects.map(p => <ProjectBlock key={p.id} project={p} quests={quests.filter(q => q.project_id === p.id)} onRoadmap={() => setRoadmap(p)} />)}
      {roadmap && <ProjectRoadmapModal project={roadmap} onClose={() => setRoadmap(null)} />}
    </div>
  );
}

function ProjectBlock({ project: p, quests, onRoadmap }: { project: Project; quests: Quest[]; onRoadmap: () => void }) {
  const [allDone, setAllDone] = useState(false);
  const now = Date.now();
  const todo = quests.filter(q => q.status === 'PENDING' || q.status === 'IN_PROGRESS')
    .sort((a, b) => (Date.parse(a.due_at ?? '') || Infinity) - (Date.parse(b.due_at ?? '') || Infinity));
  const done = quests.filter(q => q.status === 'COMPLETED')
    .sort((a, b) => Date.parse(b.completed_at ?? b.created_at) - Date.parse(a.completed_at ?? a.created_at));
  const color = TYPE_COLOR[p.type] ?? T.cyan;
  const pct = Math.round(projectPct(p));

  return (
    <HudPanel label={TYPE_LABEL[p.type] ?? p.type} glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: T.display, fontSize: 17, color: T.text, letterSpacing: '0.04em', overflowWrap: 'anywhere' }}>{p.title}</h3>
          <span style={{ fontFamily: T.rank, fontSize: 18, color, textShadow: `0 0 10px ${color}66`, whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
        <XpBar current={pct} max={100} height={3} color={color} />
        <DataReadout size={9} color={T.textDim}>
          {todo.length} À FAIRE · {done.length} TERMINÉE{done.length > 1 ? 'S' : ''}{p.ends_at ? ` · ÉCHÉANCE ${fmtDay(p.ends_at)}` : ''}
        </DataReadout>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <Column title="À FAIRE" count={todo.length} accent={T.cyan}>
            {todo.length === 0
              ? <Empty>Aucune quête ouverte. Ajoute la prochaine action.</Empty>
              : todo.map(q => {
                const late = !!q.due_at && Date.parse(q.due_at) < now;
                const meta = DIFFICULTY_META[q.difficulty_tier ?? 'ROUTINE'];
                return (
                  <li key={q.id} style={row(late ? T.danger : T.line)}>
                    <span aria-hidden="true" style={{ fontFamily: T.mono, fontSize: 10, color: meta.color, width: 22 }}>{meta.symbol}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: T.text, overflowWrap: 'anywhere' }}>{q.title}</span>
                      <span style={{ display: 'block', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: late ? T.danger : T.textMute, marginTop: 2 }}>
                        {q.status === 'IN_PROGRESS' ? 'EN COURS · ' : ''}{q.due_at ? (late ? `EN RETARD · ${fmtDay(q.due_at)}` : `POUR LE ${fmtDay(q.due_at)}`) : 'SANS ÉCHÉANCE'}
                      </span>
                    </span>
                  </li>
                );
              })}
          </Column>
          <Column title="TERMINÉES" count={done.length} accent={T.green}>
            {done.length === 0
              ? <Empty>Pas encore de quête terminée.</Empty>
              : (allDone ? done : done.slice(0, DONE_PREVIEW)).map(q => (
                <li key={q.id} style={row(T.line)}>
                  <span aria-hidden="true" style={{ fontFamily: T.mono, fontSize: 11, color: T.green, width: 22 }}>✓</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, color: T.textDim, textDecoration: 'line-through', overflowWrap: 'anywhere' }}>{q.title}</span>
                    {q.completed_at && <span style={{ display: 'block', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', color: T.textMute, marginTop: 2 }}>LE {fmtDay(q.completed_at)}</span>}
                  </span>
                </li>
              ))}
            {done.length > DONE_PREVIEW && (
              <li><button type="button" onClick={() => setAllDone(s => !s)} style={{ ...ghost, width: '100%' }}>{allDone ? 'VOIR MOINS' : `VOIR LES ${done.length}`}</button></li>
            )}
          </Column>
        </div>

        {projectStatTiers(p).length > 0 && <StatTierChips entries={projectStatTiers(p)} />}
        <ProjectLoot project={p} questCount={{ total: quests.filter(q => q.status !== 'SKIPPED').length, done: done.length }} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onRoadmap} style={ghost}>◉ ROADMAP</button>
          <Link href={`/quests/?creer=1&projet=${p.id}`} style={{ ...ghost, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>+ QUÊTE</Link>
        </div>
      </div>
    </HudPanel>
  );
}

function Column({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${accent}55`, paddingBottom: 6, marginBottom: 8 }}>
        <DataReadout size={9} color={accent}>{title}</DataReadout>
        <DataReadout size={9} color={accent}>{count}</DataReadout>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ul>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <li style={{ fontSize: 12, color: T.textMute, padding: '8px 0' }}>{children}</li>;
const row = (border: string): React.CSSProperties => ({ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', border: `1px solid ${border}`, background: 'rgba(78,205,255,0.03)' });
const ghost: React.CSSProperties = { background: 'transparent', color: T.cyan, border: `1px solid ${T.lineMid}`, padding: '10px 14px', minHeight: 44, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer' };
