'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { useQuests, createQuestFlash, planUndatedQuestToday } from '@/hooks/useQuests';
import { localDayDeadline } from '@/lib/quest-review';
import { useProjects } from '@/hooks/useProjects';
import { createRoutine } from '@/hooks/useRoutines';
import { suggestMissions, type MissionSuggestion } from '@/lib/engine/missionCatalog';
import { useMissionTemplates, createMissionTemplate, deleteMissionTemplate } from '@/hooks/useMissionTemplates';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { QuestCard } from '@/components/core/QuestCard';
import { SharedQuestOffer } from '@/components/core/SharedQuestOffer';
import { decodeSharedQuest, type SharedQuest } from '@/lib/share';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import type { QuestStatus, DifficultyTier, StatKind, StatTiers, MissionTemplate } from '@/lib/types';
import { DIFFICULTY_META, questXpBudget } from '@/lib/engine/difficulty';
import { STAT_META, REWARDABLE_STAT_KINDS } from '@/lib/engine/stats';
import { cleanStatTiers, sortedStatTiers, topTier } from '@/lib/engine/statTiers';
import { StatTierPicker } from '@/components/core/StatTierPicker';
import { DictationButton, appendDictation } from '@/components/core/DictationButton';
import { bedtimeMinutes, fmtClock, nextOccurrence, sleepLength } from '@/lib/sleep';

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
  // Liens ?creer=1 (guide, vue Liste des donjons) : ouvre le formulaire, avec le projet ?projet=<id> présélectionné.
  const [initialProject, setInitialProject] = useState('');
  // Lien de quête partagée (?partage=…) : undefined = aucun lien, null = lien abîmé.
  const [shared, setShared] = useState<SharedQuest | null | undefined>(undefined);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('creer') === '1') setShowCreate(true);
    setInitialProject(params.get('projet') ?? '');
    if (params.has('partage')) setShared(decodeSharedQuest(params.get('partage')));
  }, []);

  function closeShared() {
    setShared(undefined);
    history.replaceState(null, '', location.pathname);
  }

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

        {shared !== undefined && <SharedQuestOffer quest={shared} onClose={closeShared} />}

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
          {showCreate ? '✕ ANNULER' : '+ NOUVELLE QUÊTE'}
        </button>
        {!showCreate && <p style={{ margin: '-4px 2px 0', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
          Une quête est un moyen : elle naît dans un <Link href="/donjon" style={{ color: T.cyan }}>donjon</Link>, qui dit qui tu es. Elle est émise une fois, ou chaque jour jusqu’à la fin du donjon.
        </p>}
        {showCreate && (
          <QuestCreator
            projects={projects.filter(p => ['ACTIVE', 'PLANNED', 'PAUSED'].includes(p.status) && p.title !== 'Quêtes flash')}
            templates={templates}
            initialProjectId={initialProject}
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
            minHeight: 44,
          }}
          aria-expanded={showTemplates}
        >
          {showTemplates ? '✕ FERMER MES MODÈLES' : `☆ MES MODÈLES DE MISSION (${templates.length})`}
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

type Cadence = 'once' | 'daily';

function QuestCreator({
  projects,
  templates,
  initialProjectId,
  onCreated,
}: {
  projects: ReturnType<typeof useProjects>['projects'];
  templates: MissionTemplate[];
  initialProjectId?: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  // Présélection appliquée une seule fois, pour ne pas écraser un choix fait ensuite.
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || !initialProjectId || !projects.some(p => p.id === initialProjectId)) return;
    preselected.current = true;
    setProjectId(initialProjectId);
  }, [initialProjectId, projects]);
  const [estimated, setEstimated] = useState(30);
  // Difficulté utilisée seulement sans stat choisie ; sinon c'est la plus haute des stats.
  const [difficulty, setDifficulty] = useState<DifficultyTier>('ROUTINE');
  const [statTiers, setStatTiers] = useState<StatTiers>({});
  const tier = topTier(statTiers) ?? difficulty;
  const [rewardEur, setRewardEur] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Une fois : émise maintenant, à finir avant sa fin de transmission (échéance).
  // Chaque jour : émise chaque jour jusqu'à la fin de transmission (celle du donjon, ou une date).
  const [cadence, setCadence] = useState<Cadence>('once');
  const [deadline, setDeadline] = useState('today');
  const [chosenDay, setChosenDay] = useState('');
  const [routineEnd, setRoutineEnd] = useState<'donjon' | 'date'>('donjon');
  const [routineEndDay, setRoutineEndDay] = useState('');
  const [error, setError] = useState('');
  const [savedTemplate, setSavedTemplate] = useState(false);
  // Suggestion « coucher » : échéance à l'heure exacte, récompense Force (santé) + Discipline.
  const [sleep, setSleep] = useState<{ due: string; bed: string } | null>(null);
  const [showSleep, setShowSleep] = useState(false);
  const [wake, setWake] = useState('07:00');
  const [cycles, setCycles] = useState(5);
  useEffect(() => { try { const w = localStorage.getItem('grind-wake-time'); if (w) setWake(w); } catch {} }, []);
  const bed = bedtimeMinutes(wake, cycles);

  const project = projects.find(p => p.id === projectId);
  const chosenStats = Object.keys(statTiers) as StatKind[];
  const mine = chosenStats.length ? templates.filter(t => chosenStats.includes(t.stat_kind)) : templates;
  const system = suggestMissions(chosenStats, 6);
  const daily = cadence === 'daily';
  const projectEnd = project?.ends_at && Number.isFinite(Date.parse(project.ends_at)) ? new Date(project.ends_at) : null;

  function applySleep() {
    if (bed === null) return;
    setTitle(`Me coucher à ${fmtClock(bed)}`);
    setDifficulty('ROUTINE'); setStatTiers({ FORCE: 'ROUTINE', DISCIPLINE: 'ROUTINE' }); setEstimated(30);
    setSleep({ due: nextOccurrence(bed).toISOString(), bed: fmtClock(bed) });
    setCadence('once'); setDeadline('exact'); setShowSleep(false); setShowSuggestions(false);
    try { localStorage.setItem('grind-wake-time', wake); } catch {}
  }

  function applyTemplate(t: MissionTemplate) {
    setTitle(t.title);
    setDifficulty(t.difficulty_tier);
    setStatTiers(cleanStatTiers({ [t.stat_kind]: t.difficulty_tier }) ?? {});
    setEstimated(t.estimated_minutes);
    setShowSuggestions(false);
  }

  function applySystem(m: MissionSuggestion) {
    setTitle(m.title);
    setDifficulty(m.tier);
    setStatTiers(cleanStatTiers({ [m.stat]: m.tier }) ?? {});
    setEstimated(m.minutes);
    setCadence(m.daily ? 'daily' : 'once');
    setShowSuggestions(false);
  }

  async function saveAsTemplate() {
    if (!title.trim()) return;
    setError('');
    try {
      await createMissionTemplate({
        title: title.trim().slice(0, 140),
        stat_kind: sortedStatTiers(cleanStatTiers(statTiers))[0]?.kind ?? 'DISCIPLINE',
        difficulty_tier: tier,
        estimated_minutes: Math.min(120, estimated),
      });
      setSavedTemplate(true);
    } catch {
      setError('Le modèle n’a pas pu être enregistré.');
    }
  }

  async function submit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true); setError('');
    try {
      const tiers = cleanStatTiers(statTiers);
      const stats = sortedStatTiers(tiers).map(e => e.kind);
      if (daily) {
        if (!projectId) throw new Error('Une quête quotidienne appartient à un donjon : choisis-en un.');
        let ends: string | null = null;
        if (routineEnd === 'date') {
          const d = routineEndDay ? new Date(routineEndDay + 'T12:00:00') : null;
          if (!d || !Number.isFinite(d.getTime()) || localDayDeadline(d) < new Date().toISOString()) throw new Error('Choisis une fin de transmission à venir.');
          ends = localDayDeadline(d);
        }
        await createRoutine({ project_id: projectId, title: title.trim(), estimated_minutes: estimated, difficulty_tier: tier, reward_stats: stats, stat_tiers: tiers, ends_at: ends });
      } else {
        const chosen = chosenDay ? new Date(chosenDay + 'T12:00:00') : null;
        if (deadline === 'date' && (!chosen || !Number.isFinite(chosen.getTime()) || localDayDeadline(chosen) < new Date().toISOString())) throw new Error('Choisis aujourd’hui ou une date à venir.');
        await createQuestFlash({
          title: title.trim(),
          project_id: projectId || null,
          estimated_minutes: estimated,
          difficulty_tier: tier,
          reward_stats: stats,
          stat_tiers: tiers,
          reward_eur: rewardEur ? parseFloat(rewardEur) : 0,
          due_at: deadline === 'none' ? null : deadline === 'exact' && sleep ? sleep.due : deadline === 'date' ? localDayDeadline(chosen!) : localDayDeadline(),
        });
      }
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
    outline: 'none', width: '100%', minHeight: 44,
  };
  const suggestionRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    background: T.surf2, border: `1px solid ${T.line}`, padding: '8px 10px', minHeight: 44,
    cursor: 'pointer', textAlign: 'left', width: '100%',
  };
  const note: React.CSSProperties = { fontSize: 12, color: T.textDim, lineHeight: 1.6, margin: 0 };
  const cadenceBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, minHeight: 44, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
    background: on ? 'rgba(78,205,255,0.12)' : 'transparent', color: on ? T.cyan : T.textDim,
    border: `1px solid ${on ? T.cyan : T.line}`, boxShadow: on ? `inset 0 -2px 0 ${T.cyan}` : 'none',
  });

  return (
    <HudPanel label="NOUVELLE QUÊTE · UN MOYEN POUR TON DONJON" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <button
            type="button"
            onClick={() => setShowSuggestions(s => !s)}
            aria-expanded={showSuggestions}
            style={{
              background: 'transparent', color: T.cyan, border: `1px solid ${T.lineMid}`, minHeight: 44,
              padding: '8px 12px', fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em',
              cursor: 'pointer', width: '100%',
            }}
          >
            {showSuggestions ? '✕ FERMER LES SUGGESTIONS' : '💡 SUGGÈRE-MOI UNE MISSION'}
          </button>
          {showSuggestions && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={note}>{chosenStats.length ? 'Suggestions pour les stats choisies ci-dessous.' : 'Choisis d’abord une stat plus bas pour des suggestions ciblées.'} Chaque mission rejoint le donjon sélectionné.</p>

              <button type="button" onClick={() => setShowSleep(s => !s)} aria-expanded={showSleep} style={{ ...suggestionRow, border: `1px solid ${T.lineMid}` }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>🌙 Me coucher à l’heure idéale</span>
                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>{STAT_META.FORCE.short} + {STAT_META.DISCIPLINE.short}</span>
              </button>
              {showSleep && (
                <div style={{ border: `1px solid ${T.line}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 12, color: T.textDim }}>Réveil prévu
                      <input type="time" aria-label="Heure de réveil" value={wake} onChange={e => setWake(e.target.value)} style={{ ...selectStyle, marginTop: 6 }} />
                    </label>
                    <label style={{ fontSize: 12, color: T.textDim }}>Sommeil
                      <select aria-label="Durée de sommeil" value={cycles} onChange={e => setCycles(Number(e.target.value))} style={{ ...selectStyle, marginTop: 6 }}>
                        {[4, 5, 6].map(c => <option key={c} value={c}>{sleepLength(c)} ({c} cycles)</option>)}
                      </select>
                    </label>
                  </div>
                  <p style={note}>
                    {bed === null ? 'Indique une heure de réveil.' : <>Coucher idéal : <strong style={{ color: T.cyan }}>{fmtClock(bed)}</strong> — cycles de 90 min, plus 15 min pour s’endormir. Se réveiller en fin de cycle évite la sensation de lourdeur.</>}
                  </p>
                  <button type="button" onClick={applySleep} disabled={bed === null} style={{ background: T.cyan, color: T.bg, border: 'none', padding: 10, minHeight: 44, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer' }}>
                    UTILISER CETTE HEURE
                  </button>
                </div>
              )}

              <DataReadout size={9} color={T.textDim} style={{ display: 'block', marginTop: 6 }}>MES MODÈLES</DataReadout>
              {mine.length === 0
                ? <p style={{ ...note, color: T.textMute }}>{templates.length ? 'Aucun de tes modèles pour ces stats.' : 'Garde une mission comme modèle (bouton ☆ plus bas) pour la retrouver ici.'}</p>
                : mine.map(t => (
                  <button key={t.id} type="button" onClick={() => applyTemplate(t)} style={suggestionRow}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{t.title}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, whiteSpace: 'nowrap' }}>{STAT_META[t.stat_kind].short} · {t.estimated_minutes} MIN</span>
                  </button>
                ))}

              <DataReadout size={9} color={T.textDim} style={{ display: 'block', marginTop: 6 }}>SUGGESTIONS DU SYSTÈME</DataReadout>
              {system.length === 0
                ? <p style={{ ...note, color: T.textMute }}>Pas encore de suggestion pour ces stats.</p>
                : system.map(m => (
                  <button key={m.key} type="button" onClick={() => applySystem(m)} style={suggestionRow}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{m.title}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: m.daily ? T.amber : T.textMute, whiteSpace: 'nowrap' }}>{m.daily ? '↻ CHAQUE JOUR' : 'UNE FOIS'} · {STAT_META[m.stat].short}</span>
                  </button>
                ))}
              <p style={{ ...note, color: T.textMute }}>Un objectif quotidien à plusieurs, avec classement (100 pompes…) ? <Link href="/defis" style={{ color: T.amber }}>Rejoins un défi commun</Link>.</p>
            </div>
          )}
        </div>

        <label htmlFor="quete-titre"><DataReadout>TITRE</DataReadout></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            id="quete-titre"
            value={title}
            onChange={e => { setTitle(e.target.value); setSavedTemplate(false); }}
            autoFocus
            placeholder="Ex : Marcher 8 000 pas"
            style={{ ...selectStyle, letterSpacing: '0.03em', flex: 1, width: 'auto', minWidth: 0 }}
          />
          <DictationButton label="titre de la quête" onText={text => setTitle(t => appendDictation(t, text))} />
        </div>

        <label htmlFor="quete-donjon"><DataReadout>DONJON</DataReadout></label>
        <select id="quete-donjon" value={projectId} onChange={e => setProjectId(e.target.value)} style={selectStyle}>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
          <option value="">Sans donjon (quête flash)</option>
        </select>
        <p style={note}>
          {project?.identity ? <>Cette quête est un moyen de devenir : <em style={{ color: T.cyan }}>« {project.identity} »</em></> : projects.length ? 'Une quête est le moyen concret d’avancer dans un donjon.' : <>Ouvre d’abord un donjon : <Link href="/donjon/?creer=1" style={{ color: T.cyan }}>ouvrir un donjon</Link>.</>}
        </p>

        <StatTierPicker
          idPrefix="quete"
          value={statTiers}
          onChange={setStatTiers}
          defaultTier="ROUTINE"
          hint="Choisis une ou plusieurs stats et la difficulté de chacune (ex. Focus notable, Mentalité difficile). Sans stat, l’XP va en Discipline."
        />
        {!topTier(statTiers) && (
          <div>
            <label htmlFor="quete-difficulte"><DataReadout style={{ display: 'block', marginBottom: 6 }}>DIFFICULTÉ</DataReadout></label>
            <select id="quete-difficulte" value={difficulty} onChange={e => setDifficulty(e.target.value as DifficultyTier)} style={selectStyle}>
              {(Object.keys(DIFFICULTY_META) as DifficultyTier[]).map(d => (
                <option key={d} value={d}>{DIFFICULTY_META[d].label} / plafond {DIFFICULTY_META[d].baseXp} XP</option>
              ))}
            </select>
          </div>
        )}

        <DataReadout>RÉPÉTITION</DataReadout>
        <div role="radiogroup" aria-label="Répétition de la quête" style={{ display: 'flex', gap: 8 }}>
          <button type="button" role="radio" aria-checked={!daily} onClick={() => setCadence('once')} style={cadenceBtn(!daily)}>
            <span style={{ display: 'block', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em' }}>◇ UNE FOIS</span>
            <span style={{ display: 'block', fontSize: 11, color: T.textDim, marginTop: 4 }}>Émise maintenant, une seule fois</span>
          </button>
          <button type="button" role="radio" aria-checked={daily} onClick={() => { setCadence('daily'); setDeadline(d => d === 'exact' ? 'today' : d); }} style={cadenceBtn(daily)}>
            <span style={{ display: 'block', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em' }}>↻ CHAQUE JOUR</span>
            <span style={{ display: 'block', fontSize: 11, color: T.textDim, marginTop: 4 }}>Émise chaque jour, jusqu’à la fin</span>
          </button>
        </div>

        {daily ? (
          <>
            <label style={{ fontSize: 12 }}>Fin de transmission
              <select aria-label="Fin de transmission" value={routineEnd} onChange={e => setRoutineEnd(e.target.value as 'donjon' | 'date')} style={{ ...selectStyle, marginTop: 8 }}>
                <option value="donjon">{projectEnd ? `Avec le donjon : le ${projectEnd.toLocaleDateString('fr-FR')}` : 'Avec le donjon : jusqu’à ce que je l’arrête'}</option>
                <option value="date">Choisir une date</option>
              </select>
            </label>
            {routineEnd === 'date' && <label style={{ fontSize: 12 }}>Dernier jour<input aria-label="Dernier jour" type="date" value={routineEndDay} onChange={e => setRoutineEndDay(e.target.value)} style={{ ...selectStyle, marginTop: 8 }} /></label>}
            <p style={note}>Émise dès aujourd’hui puis chaque jour, à valider avant 23 h 59. Un jour manqué passe par le bilan « Quelle est ton excuse ? » ; les jours passés ne sont jamais rattrapés. Tu peux arrêter la répétition depuis le donjon (vue Liste).</p>
            {!projectId && <p role="alert" style={{ ...note, color: T.amber }}>Une quête quotidienne appartient à un donjon : choisis-en un.</p>}
          </>
        ) : (
          <>
            <label style={{ fontSize: 12 }}>Fin de transmission (échéance)<select aria-label="Échéance" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...selectStyle, marginTop: 8 }}>{sleep && <option value="exact">À l’heure du coucher : {new Date(sleep.due).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</option>}<option value="today">Aujourd’hui, en fin de journée</option><option value="date">Choisir une date</option><option value="none">Sans échéance</option></select></label>
            {deadline === 'date' && <label style={{ fontSize: 12 }}>Jour prévu<input aria-label="Jour prévu" type="date" value={chosenDay} onChange={e => setChosenDay(e.target.value)} style={{ ...selectStyle, marginTop: 8 }} /></label>}
            <p style={note}>{deadline === 'none' ? 'Sans date limite, cette quête ne déclenchera pas de bilan de retard.' : deadline === 'exact' && sleep ? `Valide-la en allant te coucher. Si elle n’est pas validée à ${sleep.bed}, un bilan te sera demandé avant tout point de résignation. Récompense : Force (santé) et Discipline.` : 'À 23 h 59, heure locale. Si la quête reste inachevée, un bilan te sera demandé avant tout point de résignation.'}</p>
          </>
        )}

        <DataReadout>DURÉE ESTIMÉE · {estimated} MIN{daily ? ' PAR JOUR' : ''}</DataReadout>
        <input
          type="range" min={5} max={480} step={5} value={estimated}
          aria-label="Durée estimée en minutes"
          onChange={e => setEstimated(parseInt(e.target.value, 10))}
          style={{ accentColor: T.cyan }}
        />

        <p style={note}>Budget : <strong style={{ color: T.cyan }}>{questXpBudget(tier, estimated)} XP</strong> à la validation{daily ? ', chaque jour' : ''}. Une minute prévue vaut un XP, dans le plafond de difficulté. Le budget est fixé à l’émission ; les sous-tâches le partagent. Plafond global : 600 XP par jour, heure de Paris.</p>
        {!daily && (
          <>
            <label htmlFor="quete-revenu"><DataReadout>REVENU (€) · 0 SI ÇA NE RAPPORTE RIEN</DataReadout></label>
            <input
              id="quete-revenu"
              type="number" min={0} step={0.01} inputMode="decimal"
              value={rewardEur}
              onChange={e => setRewardEur(e.target.value)}
              placeholder="0"
              style={{ ...selectStyle, letterSpacing: '0.03em' }}
            />
          </>
        )}

        {error && <p role="alert" style={{ color: T.danger, fontSize: 12, margin: 0 }}>{error}</p>}
        <button
          onClick={submit}
          disabled={submitting || !title.trim() || (daily && !projectId)}
          style={{
            background: T.cyan, color: T.bg, border: 'none', padding: '12px', minHeight: 44,
            fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.28em',
            cursor: submitting ? 'wait' : 'pointer',
            opacity: !title.trim() || (daily && !projectId) ? 0.5 : 1,
            boxShadow: `0 0 10px ${T.cyanGlow}`,
          }}
        >
          {submitting ? 'ÉMISSION…' : daily ? '↻ ÉMETTRE CHAQUE JOUR' : 'ÉMETTRE LA QUÊTE'}
        </button>
        <button
          type="button"
          onClick={() => void saveAsTemplate()}
          disabled={!title.trim() || savedTemplate}
          style={{ background: 'transparent', color: savedTemplate ? T.green : T.textDim, border: `1px solid ${T.line}`, padding: '10px', minHeight: 44, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', cursor: 'pointer' }}
        >
          {savedTemplate ? '✓ GARDÉE DANS MES MODÈLES' : '☆ GARDER COMME MODÈLE DE MISSION'}
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
        <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
          Les missions que tu refais souvent, enregistrées une fois pour toutes. Elles apparaissent dans « Suggère-moi une mission » : tu choisis alors le donjon, et si elle est émise une fois ou chaque jour. Pour un objectif quotidien partagé avec d’autres joueurs, passe plutôt par les <Link href="/defis" style={{ color: T.amber }}>défis communs</Link>.
        </p>
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
            placeholder="Ex : Relire mes notes de cours"
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
