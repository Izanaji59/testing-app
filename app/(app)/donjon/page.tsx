'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useProjects } from '@/hooks/useProjects';
import { Header } from '@/components/shell/Header';
import { ProjectCard } from '@/components/core/ProjectCard';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { ProjectType, DifficultyTier, StatKind } from '@/lib/types';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META, STAT_KINDS } from '@/lib/engine/stats';

const PROJECT_TYPES: { value: ProjectType; label: string; desc: string }[] = [
  { value: 'OPERATION', label: 'OPÉRATION', desc: 'Tâche structurée, durée courte' },
  { value: 'CAMPAIGN',  label: 'CAMPAGNE',  desc: 'Suite de missions liées' },
  { value: 'RAID',      label: 'RAID',      desc: 'Sprint intense, délai court' },
  { value: 'DUNGEON',   label: 'DONJON',    desc: 'Projet long, phases multiples' },
  { value: 'BOSS',      label: 'BOSS',      desc: 'Objectif majeur, HP system' },
];

export default function DonjonPage() {
  const { profile } = useProfile();
  const { projects, refresh } = useProjects();
  const [showCreate, setShowCreate] = useState(false);

  if (!profile) return null;

  const active   = projects.filter(p => p.status === 'ACTIVE');
  const planned  = projects.filter(p => p.status === 'PLANNED');
  const paused   = projects.filter(p => p.status === 'PAUSED');

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="DONJONS" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Bouton création */}
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
          {showCreate ? '✕ ANNULER' : '+ NOUVEAU PROJET'}
        </button>

        {showCreate && (
          <ProjectCreator
            onCreated={() => { setShowCreate(false); refresh(); }}
          />
        )}

        <Section title={`ACTIFS · ${active.length}`}   projects={active}  emptyMsg="AUCUN PROJET ACTIF." />
        <Section title={`EN ATTENTE · ${planned.length}`} projects={planned} emptyMsg="—" />
        <Section title={`EN SOMMEIL · ${paused.length}`}  projects={paused}  emptyMsg="—" />

        {projects.length === 0 && !showCreate && (
          <HudPanel thin>
            <div style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em' }}>
                AUCUN PROJET POUR LE MOMENT.
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.22em', marginTop: 8 }}>
                UTILISE LE BOUTON + CI-DESSUS.
              </div>
            </div>
          </HudPanel>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Project Creator ───────────────────────────

function ProjectCreator({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle]       = useState('');
  const [type, setType]         = useState<ProjectType>('OPERATION');
  const [difficulty, setDiff]   = useState<DifficultyTier>('NOTABLE');
  const [stat, setStat]         = useState<StatKind | ''>('');
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setSub(true);
    setError(null);
    try {
      const sb = supabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error('Non authentifié');

      const { error: insertErr } = await sb.from('projects').insert({
        user_id:      auth.user.id,
        type,
        title:        title.trim(),
        status:       'ACTIVE',
        difficulty,
        primary_stat: stat || null,
      });

      if (insertErr) throw insertErr;
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSub(false);
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
    <HudPanel label="NOUVEAU PROJET" glow={0.4}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        <DataReadout>TITRE DU PROJET</DataReadout>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          autoFocus
          placeholder="Ex : Lancer la V1 de l'app"
          style={{ ...selectStyle, letterSpacing: '0.03em' }}
        />

        <DataReadout>TYPE</DataReadout>
        <select value={type} onChange={e => setType(e.target.value as ProjectType)} style={selectStyle}>
          {PROJECT_TYPES.map(pt => (
            <option key={pt.value} value={pt.value}>{pt.label} — {pt.desc}</option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <DataReadout style={{ display: 'block', marginBottom: 6 }}>DIFFICULTÉ</DataReadout>
            <select value={difficulty} onChange={e => setDiff(e.target.value as DifficultyTier)} style={selectStyle}>
              {(Object.keys(DIFFICULTY_META) as DifficultyTier[]).map(d => (
                <option key={d} value={d}>{DIFFICULTY_META[d].label}</option>
              ))}
            </select>
          </div>
          <div>
            <DataReadout style={{ display: 'block', marginBottom: 6 }}>STAT PRINCIPALE</DataReadout>
            <select value={stat} onChange={e => setStat(e.target.value as StatKind | '')} style={selectStyle}>
              <option value="">— Aucune —</option>
              {STAT_KINDS.map(s => (
                <option key={s} value={s}>{STAT_META[s].short} — {STAT_META[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.danger, letterSpacing: '0.12em' }}>
            ERREUR : {error}
          </div>
        )}

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
          {submitting ? 'CRÉATION…' : 'CRÉER LE PROJET'}
        </button>
      </div>
    </HudPanel>
  );
}

// ─────────────────────────── Section ───────────────────────────

function Section({
  title, projects, emptyMsg,
}: {
  title: string;
  projects: ReturnType<typeof useProjects>['projects'];
  emptyMsg: string;
}) {
  if (projects.length === 0 && emptyMsg === '—') return null;
  return (
    <div>
      <DataReadout color={T.textDim} size={10} letterSpacing="0.28em" style={{ padding: '0 4px 8px' }}>
        {title}
      </DataReadout>
      {projects.length === 0 ? (
        <HudPanel thin>
          <div style={{ padding: 18, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.2em' }}>
            {emptyMsg}
          </div>
        </HudPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
