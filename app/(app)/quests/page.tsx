'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useQuests, createQuestFlash } from '@/hooks/useQuests';
import { useProjects } from '@/hooks/useProjects';
import { Header } from '@/components/shell/Header';
import { QuestCard } from '@/components/core/QuestCard';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { QuestStatus, DifficultyTier, StatKind } from '@/lib/types';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META, STAT_KINDS } from '@/lib/engine/stats';

export default function QuestsPage() {
  const { profile } = useProfile();
  const { quests, refresh } = useQuests();
  const { projects } = useProjects();
  const [filter, setFilter] = useState<QuestStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  if (!profile) return null;

  const filtered = filter === 'ALL'
    ? quests.filter(q => q.status !== 'COMPLETED' && q.status !== 'SKIPPED')
    : quests.filter(q => q.status === filter);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="QUÊTES" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? T.cyan : 'transparent',
                color: filter === f ? T.bg : T.textDim,
                border: `1px solid ${filter === f ? T.cyan : T.line}`,
                padding: '6px 12px',
                fontFamily: T.mono,
                fontSize: 9,
                letterSpacing: '0.22em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f === 'ALL' ? 'TOUTES' : f === 'IN_PROGRESS' ? 'EN COURS' : f === 'PENDING' ? 'EN ATTENTE' : 'TERMINÉES'}
            </button>
          ))}
        </div>

        {/* Création rapide */}
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{
            background: 'transparent',
            color: T.cyan,
            border: `1px dashed ${T.lineMid}`,
            padding: '14px',
            fontFamily: T.mono,
            fontSize: 10,
            letterSpacing: '0.28em',
            cursor: 'pointer',
          }}
        >
          + NOUVELLE QUÊTE
        </button>
        {showCreate && (
          <QuestCreator
            projects={projects}
            onCreated={() => { setShowCreate(false); refresh(); }}
          />
        )}

        {/* Liste */}
        {filtered.length === 0 ? (
          <HudPanel thin>
            <div style={{ padding: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em' }}>
              AUCUNE QUÊTE.
            </div>
          </HudPanel>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(q => <QuestCard key={q.id} quest={q} onChange={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Quest Creator ───────────────────────────

function QuestCreator({
  projects,
  onCreated,
}: {
  projects: ReturnType<typeof useProjects>['projects'];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  const [estimated, setEstimated] = useState(30);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('ROUTINE');
  const [stat, setStat] = useState<StatKind | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createQuestFlash({
        title: title.trim(),
        project_id: projectId || null,
        estimated_minutes: estimated,
        difficulty_tier: difficulty,
        reward_stats: stat ? [stat as StatKind] : [],
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    background: 'rgba(78, 205, 255, 0.04)',
    border: `1px solid ${T.lineMid}`,
    color: T.text, padding: '10px 12px',
    fontFamily: T.mono, fontSize: 12,
    outline: 'none', width: '100%',
  };

  return (
    <HudPanel label="CRÉATION" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <DataReadout>TITRE</DataReadout>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          placeholder="Ex : Finir prototype écran stats"
          style={{ ...selectStyle, letterSpacing: '0.03em' }}
        />

        <DataReadout>PROJET</DataReadout>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} style={selectStyle}>
          <option value="">— Quête flash (sans projet) —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title} ({p.type})</option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <DataReadout style={{ display: 'block', marginBottom: 6 }}>DIFFICULTÉ</DataReadout>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as DifficultyTier)} style={selectStyle}>
              {(Object.keys(DIFFICULTY_META) as DifficultyTier[]).map(d => (
                <option key={d} value={d}>{DIFFICULTY_META[d].label} · {d === 'TRIVIAL' ? '5' : d === 'ROUTINE' ? '15' : d === 'NOTABLE' ? '30' : d === 'HARD' ? '60' : '150'} XP</option>
              ))}
            </select>
          </div>
          <div>
            <DataReadout style={{ display: 'block', marginBottom: 6 }}>STAT FOCUS</DataReadout>
            <select value={stat} onChange={e => setStat(e.target.value as StatKind | '')} style={selectStyle}>
              <option value="">— Aucune —</option>
              {STAT_KINDS.map(s => (
                <option key={s} value={s}>{STAT_META[s].short}</option>
              ))}
            </select>
          </div>
        </div>

        <DataReadout>DURÉE ESTIMÉE · {estimated} MIN</DataReadout>
        <input
          type="range" min={5} max={120} step={5} value={estimated}
          onChange={e => setEstimated(parseInt(e.target.value, 10))}
          style={{ accentColor: T.cyan }}
        />

        <button
          onClick={submit}
          disabled={submitting || !title.trim()}
          style={{
            background: T.cyan, color: T.bg, border: 'none', padding: '12px',
            fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.28em',
            cursor: submitting ? 'wait' : 'pointer',
            opacity: !title.trim() ? 0.5 : 1,
            boxShadow: `0 0 10px ${T.cyanGlow}`,
          }}
        >
          {submitting ? 'CRÉATION…' : 'ENREGISTRER'}
        </button>
      </div>
    </HudPanel>
  );
}
