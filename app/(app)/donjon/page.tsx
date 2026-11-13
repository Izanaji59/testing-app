'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mutate } from 'swr';
import { useProfile } from '@/hooks/useProfile';
import { DictationButton, appendDictation } from '@/components/core/DictationButton';
import { useProjects } from '@/hooks/useProjects';
import { useQuests } from '@/hooks/useQuests';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { ProjectMatrix } from '@/components/core/ProjectMatrix';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { ProjectType, DifficultyTier, StatKind } from '@/lib/types';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META, REWARDABLE_STAT_KINDS } from '@/lib/engine/stats';
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@/lib/engine/projectTemplates';

const PROJECT_TYPES: { value: ProjectType; label: string; desc: string }[] = [
  { value: 'OPERATION', label: 'OPÉRATION', desc: 'Tâche structurée, durée courte' },
  { value: 'CAMPAIGN',  label: 'CAMPAGNE',  desc: 'Suite de missions liées' },
  { value: 'RAID',      label: 'RAID',      desc: 'Sprint intense, délai court' },
  { value: 'DUNGEON',   label: 'DONJON',    desc: 'Projet long, phases multiples' },
  { value: 'BOSS',      label: 'BOSS',      desc: 'Objectif majeur, HP system' },
];

export default function DonjonPage() {
  const { profile, loading } = useProfile();
  const { projects, refresh } = useProjects();
  const { quests } = useQuests();
  const [showCreate, setShowCreate] = useState(false);
  // Lien du guide de démarrage (?creer=1) : ouvre directement le formulaire.
  useEffect(() => { if (new URLSearchParams(location.search).get('creer') === '1') setShowCreate(true); }, []);

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  // L'avancement d'un projet vient de ses quêtes : même règle que le trigger SQL (les quêtes abandonnées ne comptent pas).
  const questCounts: Record<string, { total: number; done: number }> = {};
  for (const q of quests) {
    if (q.status === 'SKIPPED') continue;
    const c = (questCounts[q.project_id] ??= { total: 0, done: 0 });
    c.total++;
    if (q.status === 'COMPLETED') c.done++;
  }

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

        <Link href="/defis" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${T.lineMid}`, background: 'rgba(255,178,61,0.05)', textDecoration: 'none' }}>
          <span>
            <DataReadout size={9} color={T.amber} style={{ display: 'block' }}>⚑ DÉFIS COMMUNS</DataReadout>
            <span style={{ display: 'block', fontSize: 12, color: T.textDim, marginTop: 4 }}>100 pompes, coucher avant 23 h 30… Relève un objectif quotidien avec les autres joueurs.</span>
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 14, color: T.amber }}>→</span>
        </Link>

        {showCreate && (
          <ProjectCreator
            onCreated={() => { setShowCreate(false); refresh(); }}
          />
        )}

        <ProjectMatrix projects={projects} userId={profile.user_id} questCounts={questCounts} quests={quests} />

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
  const [endsAt, setEndsAt]     = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  /** Crée le projet du modèle puis ses premières quêtes (sans échéance). */
  async function applyTemplate(t: ProjectTemplate) {
    if (submitting) return;
    setSub(true); setError(null);
    try {
      const sb = supabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error('Non authentifié');
      const { data: project, error: insertErr } = await sb.from('projects').insert({
        user_id: auth.user.id, type: t.type, title: t.title, status: 'ACTIVE', difficulty: t.difficulty,
        primary_stat: t.stat, starts_at: new Date().toISOString(),
        ends_at: t.days ? new Date(Date.now() + t.days * 86400000).toISOString() : null,
      }).select('id').single();
      if (insertErr || !project) throw insertErr ?? new Error('Projet non créé');
      const { error: questsErr } = await sb.from('quests').insert(t.quests.map(q => ({
        user_id: auth.user!.id, project_id: project.id, title: q.title, status: 'PENDING',
        difficulty_tier: q.tier, estimated_minutes: q.minutes, reward_stats: [t.stat], due_at: null, is_flash: false,
      })));
      if (questsErr) throw questsErr;
      await mutate('quests');
      onCreated();
    } catch {
      setError('Le modèle n’a pas pu être entièrement créé. Vérifie tes donjons avant de réessayer.');
    } finally {
      setSub(false);
    }
  }

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
        starts_at:    new Date().toISOString(),
        ends_at:      endsAt || null,
        weekly_target_eur: weeklyTarget ? parseFloat(weeklyTarget) : 0,
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

        <button
          type="button"
          onClick={() => setShowTemplates(s => !s)}
          aria-expanded={showTemplates}
          style={{ background: 'transparent', color: T.cyan, border: `1px solid ${T.lineMid}`, padding: '10px 12px', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', cursor: 'pointer', minHeight: 44 }}
        >
          {showTemplates ? '✕ FERMER LES MODÈLES' : '💡 PARTIR D’UN MODÈLE DE PROJET'}
        </button>
        {showTemplates && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {PROJECT_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                disabled={submitting}
                onClick={() => applyTemplate(t)}
                style={{ textAlign: 'left', background: T.surf2, border: `1px solid ${T.line}`, padding: 12, cursor: submitting ? 'wait' : 'pointer', color: T.text, minHeight: 44 }}
              >
                <DataReadout size={8} color={STAT_META[t.stat].color} style={{ display: 'block' }}>{t.domain.toUpperCase()} · {STAT_META[t.stat].short}</DataReadout>
                <span style={{ display: 'block', fontFamily: T.display, fontSize: 14, marginTop: 6 }}>{t.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: T.textDim, marginTop: 4, lineHeight: 1.5 }}>{t.pitch}</span>
                <span style={{ display: 'block', fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.14em', marginTop: 8 }}>{t.quests.length} QUÊTES DE DÉPART{t.days ? ` · ${t.days} JOURS` : ''}</span>
              </button>
            ))}
          </div>
        )}

        <DataReadout>OU TITRE DU PROJET</DataReadout>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            autoFocus
            aria-label="Titre du projet"
            placeholder="Ex : Lancer la V1 de l'app"
            style={{ ...selectStyle, letterSpacing: '0.03em', flex: 1, width: 'auto', minWidth: 0 }}
          />
          <DictationButton label="titre du projet" onText={text => setTitle(t => appendDictation(t, text))} />
        </div>

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
              {REWARDABLE_STAT_KINDS.map(s => (
                <option key={s} value={s}>{STAT_META[s].short} — {STAT_META[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        <DataReadout>DATE DE FIN · OPTIONNELLE (SINON PAS DE COMPTE À REBOURS SUR LA ROADMAP)</DataReadout>
        <input
          type="date"
          value={endsAt}
          onChange={e => setEndsAt(e.target.value)}
          style={selectStyle}
        />

        <DataReadout>OBJECTIF HEBDO (€) · OPTIONNEL — LES QUÊTES RAPPORTENT, PAS LE PROJET</DataReadout>
        <input
          type="number" min={0} step={0.01} inputMode="decimal"
          value={weeklyTarget}
          onChange={e => setWeeklyTarget(e.target.value)}
          placeholder="0"
          style={{ ...selectStyle, letterSpacing: '0.03em' }}
        />

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
