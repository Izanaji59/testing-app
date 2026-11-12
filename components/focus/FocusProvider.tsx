'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useQuests } from '@/hooks/useQuests';
import { supabase } from '@/lib/supabase/client';
import { mutate } from 'swr';
import type { Quest } from '@/lib/types';
import { advanceFocus, clockText, createFocus, distractFocus, distractionEndedAt, finishFocus, phaseLabel, PRESETS, resumeFocus, validFocus, type FocusSession, type FocusRecord } from '@/lib/focus';
import { DictationButton, appendDictation } from '@/components/core/DictationButton';
import { notifyRefocus, playAlarm, unlockAlarm } from './alarm';
import styles from './focus.module.css';

const FocusContext = createContext<{ openFocus: (project?: { id: string; title: string }, quest?: Quest) => void }>({ openFocus: () => {} });
export const useFocus = () => useContext(FocusContext);

export function FocusProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const { projects } = useProjects();
  const { quests } = useQuests();
  const [questId, setQuestId] = useState('');
  const [free, setFree] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [history, setHistory] = useState<FocusRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [preset, setPreset] = useState('25');
  const [minutes, setMinutes] = useState('45');
  const [rest, setRest] = useState('10');
  const [projectId, setProjectId] = useState('');
  const [objective, setObjective] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const sessionKey = 'grind-focus-v1:' + userId;
  const historyKey = 'grind-focus-history-v1:' + userId;
  useEffect(() => {
    setSession(null); setHistory([]); setLoaded(false); setOpen(false);
    function read() {
      try {
        const value = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        if (value !== null && !validFocus(value)) throw new Error('Session invalide');
        setSession(value); setNow(Date.now());
        const records: unknown = JSON.parse(localStorage.getItem(historyKey) || '[]');
        setHistory(Array.isArray(records) ? records.filter((r): r is FocusRecord => validFocus(r) && 'note' in r && typeof r.note === 'string' && 'savedAt' in r && Number.isFinite(r.savedAt)).slice(0, 20) : []);
      } catch { setError('La sauvegarde locale est indisponible ou illisible. Cette session reste utilisable dans cet onglet.'); }
      setLoaded(true);
    }
    read();
    const sync = (e: StorageEvent) => { if (e.key === sessionKey || e.key === historyKey || e.key === null) read(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [sessionKey, historyKey]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);
  const current = session ? advanceFocus(session, now) : null;
  // Distraction de 10 minutes écoulée sans reprise : alerte insistante jusqu'à une décision.
  const alarm = useRef<HTMLDialogElement>(null);
  const alarmed = useRef('');
  const overdueSince = session ? distractionEndedAt(session, now) : null;
  const alarmKey = session && overdueSince !== null ? `${session.id}:${session.interruptions}` : '';
  useEffect(() => {
    const d = alarm.current;
    if (!alarmKey) { if (d?.open) d.close(); return; }
    if (d && !d.open) d.showModal();
    if (alarmed.current !== alarmKey) {
      alarmed.current = alarmKey;
      notifyRefocus(session?.questTitle || session?.objective || 'ta quête');
    }
    playAlarm();
    const ring = window.setInterval(playAlarm, 20000);
    const title = document.title;
    let flip = false;
    const blink = window.setInterval(() => { flip = !flip; document.title = flip ? '⚠ REPLONGE MAINTENANT' : title; }, 1000);
    return () => { clearInterval(ring); clearInterval(blink); document.title = title; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmKey]);
  const note = session?.reviewNote ?? '';
  const completeQuest = session?.reviewCompleteQuest ?? false;
  const reviewLocked = saving || session?.submittedAt !== undefined;
  function store(next: FocusSession | null) {
    setSession(next); setNow(Date.now());
    try { if (next) localStorage.setItem(sessionKey, JSON.stringify(next)); else localStorage.removeItem(sessionKey); }
    catch { setError('Sauvegarde indisponible : garde cet onglet ouvert pour conserver cette session.'); }
  }
  function openFocus(project?: { id: string; title: string }, quest?: Quest) {
    if (!session && (project || quest)) {
      setProjectId(quest?.project_id || project?.id || ''); setQuestId(quest?.id || '');
      setObjective(quest?.title || ''); setFree(false);
    }
    setMessage(session && (quest && quest.id !== session.questId || project && project.id !== session.projectId) ? 'Une session est déjà ouverte. Termine son bilan avant de changer de quête.' : '');
    setOpen(true);
  }
  function start() {
    try {
      const p = PRESETS.find(p => p.id === preset);
      const quest = !free ? quests.find(q => q.id === questId && q.user_id === userId && ['PENDING','IN_PROGRESS'].includes(q.status)) : undefined;
      if (!free && !quest) throw new Error('Choisis une quête à avancer.');
      const project = projects.find(p => p.id === (quest?.project_id || projectId));
      const next = createFocus({ minutes: p?.minutes ?? Number(minutes), rest: p?.rest ?? Number(rest), label: p?.label ?? 'Personnalisé', ritual: preset === 'ritual', projectId: project?.id, projectTitle: project?.title, questId: quest?.id, questTitle: quest?.title, objective }, Date.now(), crypto.randomUUID());
      setError(''); setMessage(''); store(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de lancer la session.'); }
  }
  async function saveRecord() {
    if (!session || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    // Freeze the submitted review before the request. A lost response or reload
    // must retry the same session, timestamps and explicit completion choice.
    const submittedAt = session.submittedAt ?? Date.now();
    const submitted = { ...finishFocus(session, submittedAt), submittedAt };
    store(submitted);
    const record: FocusRecord = { ...submitted, note: note.trim().slice(0, 1000), savedAt: submittedAt };
    try {
      let questCompleted = false;
      if (record.questId) {
        const { data, error: failure } = await supabase().rpc('save_quest_focus', {
          p_session_id: record.id, p_quest_id: record.questId,
          p_started_at: new Date(record.startedAt).toISOString(), p_ended_at: new Date(record.savedAt).toISOString(),
          p_focus_seconds: Math.floor(record.workedMs / 1000), p_interruptions: record.interruptions,
          p_notes: record.note, p_complete: completeQuest,
        });
        if (failure) throw failure;
        questCompleted = data === true;
        record.questCompleted = questCompleted;
        // A failed refresh must not turn a committed save into an apparent failure.
        void Promise.allSettled(['quests','quests-today','projects','profile-bundle','focus-stats','xp-history'].map(key => mutate(key)));
      }
      const historyJSON = localStorage.getItem(historyKey);
      let saved: unknown;
      try { saved = JSON.parse(historyJSON || '[]'); } catch { saved = history; }
      const latest = Array.isArray(saved) ? saved.filter((r): r is FocusRecord => validFocus(r) && 'note' in r && typeof r.note === 'string' && 'savedAt' in r && Number.isFinite(r.savedAt)) : history;
      const records = [record, ...latest.filter(r => r.id !== record.id)].slice(0, 20);
      localStorage.setItem(historyKey, JSON.stringify(records));
      const sessionJSON = localStorage.getItem(sessionKey);
      let active: unknown;
      try { active = JSON.parse(sessionJSON || 'null'); } catch { active = null; }
      if (!active || validFocus(active) && active.id === record.id) localStorage.removeItem(sessionKey);
      setHistory(records); setSession(active && validFocus(active) && active.id !== record.id ? active : null); setQuestId(''); setObjective('');
      setMessage(record.questId ? questCompleted ? 'Quête validée. Le temps, les récompenses et la progression du donjon sont à jour.' : 'Temps enregistré sur la quête. Tu pourras poursuivre cette tâche dans une prochaine session.' : 'Bilan enregistré sur cet appareil.');
    } catch { setError('Le bilan n’a pas pu être entièrement enregistré. La session et ta réponse restent ouvertes : tu peux réessayer sans compter deux fois.'); }
    finally { saveLock.current = false; setSaving(false); }
  }
  const selectable = projects.filter(p => p.user_id === userId && ['ACTIVE','PLANNED','PAUSED'].includes(p.status));
  const questChoices = quests.filter(q => q.user_id === userId && ['PENDING','IN_PROGRESS'].includes(q.status) && (!projectId || q.project_id === projectId));
  const isWork = current?.phase === 'work';
  return <FocusContext.Provider value={{ openFocus }}>
    {children}
    <button className={`${styles.dock} ${overdueSince !== null ? styles.dockAlert : ''}`} onClick={() => openFocus()} disabled={!loaded} aria-haspopup="dialog">
      {overdueSince !== null ? `⚠ Replonge · +${clockText(now - overdueSince)}` : current ? `${phaseLabel(current)} ${current.phase === 'ready' || current.phase === 'complete' ? '' : clockText(current.leftMs)}` : 'J’ai besoin de me concentrer'}
    </button>
    <dialog ref={alarm} role="alertdialog" className={`${styles.dialog} ${styles.alarm}`} onCancel={e => e.preventDefault()} aria-labelledby="alarm-title" aria-describedby="alarm-text">
      <p className={styles.alarmEyebrow}>Alerte de concentration</p>
      <h2 id="alarm-title">Distraction terminée</h2>
      <p id="alarm-text">Les 10 minutes sont écoulées. {current?.questTitle || current?.objective ? <>« {current?.questTitle || current?.objective} » t’attend.</> : 'Ta session t’attend.'}</p>
      <div className={styles.overtime} role="timer" aria-label="Temps de distraction en plus">+{overdueSince !== null ? clockText(now - overdueSince) : '00:00'}</div>
      <p className={styles.hint}>de distraction en plus. Chaque minute compte dans ton bilan.</p>
      <button className={styles.primary} onClick={() => session && store(resumeFocus(session, Date.now()))}>Replonger maintenant</button>
      <button className={styles.quiet} onClick={() => { if (session) { store(finishFocus(session, Date.now())); setOpen(true); } }}>Arrêter et faire le bilan</button>
    </dialog>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="focus-title">
      <div className={styles.header}><h2 id="focus-title">Me concentrer</h2><button onClick={() => setOpen(false)} aria-label="Fermer le minuteur">Fermer</button></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status" className={styles.hint}>{message}</p>}
      {!current ? <div className={styles.setup}>
        <p>Une quête à la fois. Le donjon donne le cap ; choisis l’action que tu vas avancer maintenant.</p>
        <label>Type de session<select aria-label="Type de session" value={free ? 'free' : 'quest'} onChange={e => { setFree(e.target.value === 'free'); setQuestId(''); setObjective(''); }}><option value="quest">Avancer une quête</option><option value="free">Session libre ou rituel</option></select></label>
        <label>Donjon ou projet (contexte)<select value={projectId} onChange={e => { setProjectId(e.target.value); setQuestId(''); setObjective(''); }}>
          <option value="">Tous les donjons</option>{selectable.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select></label>
        {!free && <><label>Quête à avancer<select value={questId} onChange={e => { setQuestId(e.target.value); setObjective(questChoices.find(q => q.id === e.target.value)?.title || ''); }}><option value="">Choisir une quête</option>{questChoices.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label>{!questChoices.length && <p>Aucune quête ouverte dans cette sélection. <a href="/quests/">Créer une quête</a> pour commencer.</p>}</>}
        <label>Action pendant cette session<span className={styles.withDictation}><input value={objective} onChange={e => setObjective(e.target.value)} maxLength={200} placeholder="Ex. Rédiger l’introduction du dossier" /><DictationButton label="action de la session" onText={text => setObjective(o => appendDictation(o, text).slice(0, 200))} /></span></label>
        <fieldset><legend>Format</legend><div className={styles.presets}>{PRESETS.map(p => <button key={p.id} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}><strong>{p.label}</strong><span>{p.id === 'ritual' ? 'Bouger, réfléchir, apprendre' : `${p.minutes} min + ${p.rest} min de pause`}</span></button>)}<button aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}><strong>Personnalisé</strong><span>À ton rythme</span></button></div></fieldset>
        {preset === 'custom' && <div className={styles.row}><label>Travail (minutes)<input type="number" min={5} max={180} value={minutes} onChange={e => setMinutes(e.target.value)} /></label><label>Pause (minutes)<input type="number" min={0} max={60} value={rest} onChange={e => setRest(e.target.value)} /></label></div>}
        <p className={styles.hint}>{preset === 'ritual' ? 'Trois étapes de 20 minutes, à l’heure qui te convient. Le rituel se déroule sur une heure.' : 'Les 3 premières minutes sont un repère d’entrée en concentration, inclus dans la durée choisie. Ce minuteur ne mesure pas ton attention.'}</p>
        <button className={styles.primary} onClick={start} disabled={!objective.trim() || !loaded || (!free && !questId)}>Commencer</button>
        <details><summary>Les inspirations</summary><p>Formats adaptés de Deep Work et des méthodes de Robin Sharma. La pause de 15 minutes après un bloc de 90 minutes est un choix de Grindleveling.</p><p><a href="https://calnewport.com/on-deep-breaks/" target="_blank" rel="noreferrer">Cal Newport</a> / <a href="https://robinsharma.com/the-6010-method-for-superhuman-productivity/" target="_blank" rel="noreferrer">Méthode 60/10</a> / <a href="https://robinsharma.com/the-202020-formula-for-great-mornings-6minute-episode/" target="_blank" rel="noreferrer">Rituel 20/20/20</a></p></details>
      </div> : <div className={styles.session}>
        <p className={styles.hint}>{current.projectTitle ? `Cap : ${current.projectTitle}` : 'Session libre'} / {current.label}</p><h3>{current.questTitle || current.objective}</h3>{current.questTitle && current.objective !== current.questTitle && <p>{current.objective}</p>}
        <p className={styles.phase} role="status">{phaseLabel(current)}</p>
        <div className={styles.clock} role="timer" aria-label="Temps restant">{clockText(current.leftMs)}</div>
        <progress value={current.workedMs} max={current.totalMs} aria-label="Temps de travail accompli" />
        <p className={styles.hint}>{clockText(current.workedMs)} accomplies sur {clockText(current.totalMs)}{current.interruptions ? ` / ${current.interruptions} interruption${current.interruptions > 1 ? 's' : ''}` : ''}</p>
        {isWork && current.entryLeftMs > 0 && <p>Installation : encore {clockText(current.entryLeftMs)}. Le travail déjà accompli est conservé.</p>}
        {isWork && current.ritual && <p>Étape {Math.min(3, Math.floor(current.workedMs / 1200000) + 1)} sur 3 : {clockText(1200000 - current.workedMs % 1200000)} restantes.</p>}
        {isWork && <button onClick={() => { unlockAlarm(); if (session) store(distractFocus(session, Date.now())); }}>Je me suis déconcentré</button>}
        {current.phase === 'distraction' && <p className={styles.hint}>Une alerte sonnera à la fin des 10 minutes si tu n’as pas replongé.</p>}
        {(current.phase === 'distraction' || current.phase === 'ready') && <><p>Le travail est suspendu. Tu peux revenir dès que tu le souhaites.</p><button className={styles.primary} onClick={() => session && store(resumeFocus(session, Date.now()))}>Replonger</button></>}
        {(current.phase === 'work' || current.phase === 'distraction' || current.phase === 'ready') && <button className={styles.quiet} onClick={() => session && store(finishFocus(session, Date.now()))}>Terminer et faire le bilan</button>}
        {(current.phase === 'recovery' || current.phase === 'complete') && <div className={styles.setup}>
          <p>{current.phase === 'recovery' ? 'Le bloc est terminé. Prends une pause ; aucune nouvelle session ne démarrera toute seule.' : 'Prends un instant pour noter ton avancée.'}</p>
          <label>Ce que j’ai avancé (facultatif)<textarea maxLength={1000} value={note} disabled={reviewLocked} onChange={e => session && store({ ...session, reviewNote: e.target.value })} rows={3} /></label>
          {current.questId && <label className={styles.completion}><input type="checkbox" checked={completeQuest} disabled={reviewLocked} onChange={e => session && store({ ...session, reviewCompleteQuest: e.target.checked })} /> J’ai terminé cette quête</label>}
          {session?.submittedAt !== undefined && !saving && <p className={styles.hint}>Ce bilan attend sa confirmation. Réessaie l’enregistrement pour conserver exactement la même réponse, sans doublon.</p>}
          <button className={styles.primary} onClick={saveRecord} disabled={saving}>{saving ? 'Enregistrement…' : completeQuest && current.questId ? 'Enregistrer et valider la quête' : 'Enregistrer le bilan'}</button><p className={styles.hint}>{current.questId ? 'Le temps de travail alimente tes statistiques. Seule la validation de la quête déclenche ses récompenses et fait avancer le donjon.' : 'Cette session libre reste dans ton historique local, sans récompense de quête.'}</p>
        </div>}
        <p className={styles.hint}>Tu peux fermer ce panneau : le minuteur continue.</p>
      </div>}
      <details className={styles.history}><summary>Dernières sessions ({history.length})</summary>{history.length === 0 ? <p>Aucune session enregistrée.</p> : <ol>{history.map(r => <li key={r.id}><strong>{r.objective}</strong><span>{new Date(r.savedAt).toLocaleDateString('fr-FR')} / {clockText(r.workedMs)} accomplies / {clockText(r.distractionMs)} de distraction</span>{r.note && <p>{r.note}</p>}</li>)}</ol>}</details>
      <p className={styles.hint}>Le minuteur en cours reste sur cet appareil. Les bilans liés à une quête sont enregistrés sur ton compte.</p>
    </dialog>
  </FocusContext.Provider>;
}
