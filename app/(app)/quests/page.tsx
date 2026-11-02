'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useQuests, createQuestFlash, planUndatedQuestToday } from '@/hooks/useQuests';
import { localDayDeadline } from '@/lib/quest-review';
import { useProjects } from '@/hooks/useProjects';
import { useMissionTemplates, createMissionTemplate, deleteMissionTemplate } from '@/hooks/useMissionTemplates';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { QuestCard } from '@/components/core/QuestCard';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { QuestStatus, DifficultyTier, StatKind, MissionTemplate } from '@/lib/types';
import { DIFFICULTY_META, questXpBudget } from '@/lib/engine/difficulty';
import { STAT_META, REWARDABLE_STAT_KINDS } from '@/lib/engine/stats';

export default function QuestsPage() {
  const { profile, loading } = useProfile();
  const { quests, refresh } = useQuests();
  const { projects } = useProjects();
  const { templates, refresh: refreshTemplates } = useMissionTemplates();
  const [filter, setFilter] = useState<QuestStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [planning, setPlanning] = useState('');
  const [planError, setPlanError] = useState('');

  async function planToday(id: string) {
    if (planning) return;
    setPlanning(id); setPlanError('');
    try { await planUndatedQuestToday(id); }
    catch (e) { setPlanError(e instanceof Error ? e.message : 'La date n’a pas pu être enregistrée.'); }
    finally { setPlanning(''); }
  }

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

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
            templates={templates}
            onCreated={() => { setShowCreate(false); refresh(); }}
          />
        )}

        {/* Modèles de mission */}
        <button
          onClick={() => setShowTemplates(s => !s)}
          style={{
            background: 'transparent',
            color: T.textDim,
            border: `1px dashed ${T.line}`,
            padding: '10px',
            fontFamily: T.mono,
            fontSize: 9,
            letterSpacing: '0.22em',
            cursor: 'pointer',
          }}
        >
          MES MODÈLES DE MISSION ({templates.length})
        </button>
        {showTemplates && (
          <MissionTemplateManager templates={templates} onChange={refreshTemplates} />
        )}

        {/* Liste */}
        {quests.some(q => !q.due_at && ['PENDING','IN_PROGRESS'].includes(q.status)) && <details style={{border:`1px solid ${T.line}`,padding:12,fontSize:12}}>
          <summary style={{cursor:'pointer',padding:'6px 0'}}>Quêtes sans échéance</summary>
          <p style={{color:T.textDim,lineHeight:1.6}}>Ces quêtes n’ont pas de bilan de retard. Tu peux en planifier une pour aujourd’hui, sans pénalité sur les jours passés.</p>
          {quests.filter(q => !q.due_at && ['PENDING','IN_PROGRESS'].includes(q.status)).map(q => <div key={q.id} style={{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',padding:'10px 0'}}><span>{q.title}</span><button disabled={!!planning} onClick={()=>planToday(q.id)} style={{background:'transparent',color:T.cyan,border:`1px solid ${T.line}`,padding:10,minHeight:44}}>{planning===q.id?'Enregistrement…':'Prévoir aujourd’hui'}</button></div>)}
          {planError && <p role="alert" style={{color:T.danger}}>{planError}</p>}
        </details>}
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
  templates,
  onCreated,
}: {
  projects: ReturnType<typeof useProjects>['projects'];
  templates: MissionTemplate[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  const [estimated, setEstimated] = useState(30);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('ROUTINE');
  const [stat, setStat] = useState<StatKind | ''>('');
  const [rewardEur, setRewardEur] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deadline, setDeadline] = useState('today');
  const [chosenDay, setChosenDay] = useState('');
  const [error, setError] = useState('');

  const suggestions = stat ? templates.filter(t => t.stat_kind === stat) : templates;

  function applySuggestion(t: MissionTemplate) {
    setTitle(t.title);
    setDifficulty(t.difficulty_tier);
    setStat(t.stat_kind);
    setEstimated(t.estimated_minutes);
    setShowSuggestions(false);
  }

  async function submit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true); setError('');
    try {
      const chosen = chosenDay ? new Date(chosenDay + 'T12:00:00') : null;
      if (deadline === 'date' && (!chosen || !Number.isFinite(chosen.getTime()) || localDayDeadline(chosen) < new Date().toISOString())) throw new Error('Choisis aujourd’hui ou une date à venir.');
      await createQuestFlash({
        title: title.trim(),
        project_id: projectId || null,
        estimated_minutes: estimated,
        difficulty_tier: difficulty,
        reward_stats: stat ? [stat as StatKind] : [],
        reward_eur: rewardEur ? parseFloat(rewardEur) : 0,
        due_at: deadline === 'none' ? null : deadline === 'date' ? localDayDeadline(chosen!) : localDayDeadline(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La quête n’a pas pu être enregistrée. Réessaie.');
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
        {templates.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowSuggestions(s => !s)}
              style={{
                background: 'transparent', color: T.cyan, border: `1px solid ${T.lineMid}`,
                padding: '8px 12px', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em',
                cursor: 'pointer', width: '100%',
              }}
            >
              {showSuggestions ? '✕ FERMER LES SUGGESTIONS' : '💡 SUGGÈRE-MOI UNE MISSION'}
            </button>
            {showSuggestions && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.length === 0 ? (
                  <DataReadout size={9} color={T.textMute}>AUCUN MODÈLE POUR CETTE STAT.</DataReadout>
                ) : suggestions.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applySuggestion(t)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: T.surf2, border: `1px solid ${T.line}`, padding: '8px 10px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{t.title}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>{STAT_META[t.stat_kind].short}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                <option key={d} value={d}>{DIFFICULTY_META[d].label} / plafond {DIFFICULTY_META[d].baseXp} XP</option>
              ))}
            </select>
          </div>
          <div>
            <DataReadout style={{ display: 'block', marginBottom: 6 }}>STAT FOCUS</DataReadout>
            <select value={stat} onChange={e => setStat(e.target.value as StatKind | '')} style={selectStyle}>
              <option value="">— Aucune —</option>
              {REWARDABLE_STAT_KINDS.map(s => (
                <option key={s} value={s}>{STAT_META[s].short}</option>
              ))}
            </select>
          </div>
        </div>

        <label style={{fontSize:12}}>Échéance<select aria-label="Échéance" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{...selectStyle,marginTop:8}}><option value="today">Aujourd’hui, en fin de journée</option><option value="date">Choisir une date</option><option value="none">Sans échéance</option></select></label>
        {deadline === 'date' && <label style={{fontSize:12}}>Jour prévu<input aria-label="Jour prévu" type="date" value={chosenDay} onChange={e=>setChosenDay(e.target.value)} style={{...selectStyle,marginTop:8}} /></label>}
        <p style={{fontSize:12,color:T.textDim,lineHeight:1.6,margin:0}}>{deadline === 'none' ? 'Sans date limite, cette quête ne déclenchera pas de bilan de retard.' : 'À 23 h 59, heure locale. Si la quête reste inachevée, un bilan te sera demandé avant tout point de résignation.'}</p>
        <DataReadout>DURÉE ESTIMÉE · {estimated} MIN</DataReadout>
        <input
          type="range" min={5} max={480} step={5} value={estimated}
          onChange={e => setEstimated(parseInt(e.target.value, 10))}
          style={{ accentColor: T.cyan }}
        />

        <p style={{fontSize:12,color:T.textDim,lineHeight:1.6}}>Budget : <strong style={{color:T.cyan}}>{questXpBudget(difficulty,estimated)} XP</strong> à la validation. Une minute prévue vaut un XP, dans le plafond de difficulté. Le budget est fixé à la création ; les sous-tâches le partagent. Plafond global : 600 XP par jour, heure de Paris.</p>
        <DataReadout>REVENU (€) · 0 SI ÇA NE RAPPORTE RIEN</DataReadout>
        <input
          type="number" min={0} step={0.01} inputMode="decimal"
          value={rewardEur}
          onChange={e => setRewardEur(e.target.value)}
          placeholder="0"
          style={{ ...selectStyle, letterSpacing: '0.03em' }}
        />

        {error && <p role="alert" style={{color:T.danger,fontSize:12}}>{error}</p>}
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

// ─────────────────────── Modèles de mission (personnalisables) ───────────────────────

function MissionTemplateManager({
  templates,
  onChange,
}: {
  templates: MissionTemplate[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState<StatKind>('DISCIPLINE');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('ROUTINE');
  const [estimated, setEstimated] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const selectStyle: React.CSSProperties = {
    background: 'rgba(78, 205, 255, 0.04)',
    border: `1px solid ${T.lineMid}`,
    color: T.text, padding: '10px 12px',
    fontFamily: T.mono, fontSize: 12,
    outline: 'none', width: '100%',
  };

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createMissionTemplate({
        title: title.trim(),
        stat_kind: stat,
        difficulty_tier: difficulty,
        estimated_minutes: estimated,
      });
      setTitle('');
      onChange();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HudPanel label="MES MODÈLES DE MISSION" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {templates.length === 0 ? (
          <DataReadout size={9} color={T.textMute}>AUCUN MODÈLE POUR L&apos;INSTANT.</DataReadout>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {templates.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: T.surf2, border: `1px solid ${T.line}`, padding: '8px 10px',
                }}
              >
                <div>
                  <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{t.title}</div>
                  <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginTop: 2 }}>
                    {STAT_META[t.stat_kind].short} · {DIFFICULTY_META[t.difficulty_tier].label} · {t.estimated_minutes} MIN
                  </DataReadout>
                </div>
                <button
                  onClick={() => deleteMissionTemplate(t.id).then(onChange)}
                  style={{
                    background: 'transparent', color: T.danger, border: `1px solid ${T.danger}55`,
                    padding: '6px 10px', fontFamily: T.mono, fontSize: 9, cursor: 'pointer',
                  }}
                >
                  SUPPRIMER
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DataReadout>NOUVEAU MODÈLE</DataReadout>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex : Faire 100 pompes"
            style={{ ...selectStyle, letterSpacing: '0.03em' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <DataReadout style={{ display: 'block', marginBottom: 6 }}>STAT</DataReadout>
              <select value={stat} onChange={e => setStat(e.target.value as StatKind)} style={selectStyle}>
                {REWARDABLE_STAT_KINDS.map(s => (
                  <option key={s} value={s}>{STAT_META[s].short}</option>
                ))}
              </select>
            </div>
            <div>
              <DataReadout style={{ display: 'block', marginBottom: 6 }}>DIFFICULTÉ</DataReadout>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as DifficultyTier)} style={selectStyle}>
                {(Object.keys(DIFFICULTY_META) as DifficultyTier[]).map(d => (
                  <option key={d} value={d}>{DIFFICULTY_META[d].label}</option>
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
            }}
          >
            {submitting ? 'AJOUT…' : '+ AJOUTER LE MODÈLE'}
          </button>
        </div>
      </div>
    </HudPanel>
  );
}
