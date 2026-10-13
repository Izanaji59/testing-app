'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { advanceFocus, clockText, createFocus, distractFocus, finishFocus, phaseLabel, PRESETS, resumeFocus, validFocus, type FocusSession, type FocusRecord } from '@/lib/focus';
import styles from './focus.module.css';

const FocusContext = createContext<{ openFocus: (project?: { id: string; title: string }) => void }>({ openFocus: () => {} });
export const useFocus = () => useContext(FocusContext);

export function FocusProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const { projects } = useProjects();
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
  const [note, setNote] = useState('');
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
  function store(next: FocusSession | null) {
    setSession(next); setNow(Date.now());
    try { if (next) localStorage.setItem(sessionKey, JSON.stringify(next)); else localStorage.removeItem(sessionKey); }
    catch { setError('Sauvegarde indisponible : garde cet onglet ouvert pour conserver cette session.'); }
  }
  function openFocus(project?: { id: string; title: string }) {
    if (project && !session) { setProjectId(project.id); setObjective(project.title); }
    setMessage(project && session && project.id !== session.projectId ? 'Une session est déjà ouverte. Termine son bilan avant de changer de donjon.' : '');
    setOpen(true);
  }
  function start() {
    try {
      const p = PRESETS.find(p => p.id === preset);
      const project = projects.find(p => p.id === projectId);
      const next = createFocus({ minutes: p?.minutes ?? Number(minutes), rest: p?.rest ?? Number(rest), label: p?.label ?? 'Personnalisé', ritual: preset === 'ritual', projectId: project?.id, projectTitle: project?.title, objective }, Date.now(), crypto.randomUUID());
      setError(''); setMessage(''); setNote(''); store(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de lancer la session.'); }
  }
  function saveRecord() {
    if (!session) return;
    const record = { ...finishFocus(session, Date.now()), note: note.trim().slice(0, 1000), savedAt: Date.now() };
    const records = [record, ...history.filter(r => r.id !== record.id)].slice(0, 20);
    try {
      localStorage.setItem(historyKey, JSON.stringify(records));
      localStorage.removeItem(sessionKey);
      setHistory(records); setSession(null); setNote(''); setMessage('Bilan enregistré. Le donjon reste à valider dans tes missions.');
    } catch { setError('Le bilan n’a pas pu être enregistré. La session reste ouverte pour réessayer.'); }
  }
  const selectable = projects.filter(p => p.user_id === userId && ['ACTIVE','PLANNED','PAUSED'].includes(p.status));
  const isWork = current?.phase === 'work';
  return <FocusContext.Provider value={{ openFocus }}>
    {children}
    <button className={styles.dock} onClick={() => openFocus()} disabled={!loaded} aria-haspopup="dialog">
      {current ? `${phaseLabel(current)} ${current.phase === 'ready' || current.phase === 'complete' ? '' : clockText(current.leftMs)}` : 'Concentration'}
    </button>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="focus-title">
      <div className={styles.header}><h2 id="focus-title">Concentration</h2><button onClick={() => setOpen(false)} aria-label="Fermer le minuteur">Fermer</button></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status" className={styles.hint}>{message}</p>}
      {!current ? <div className={styles.setup}>
        <p>Un objectif à la fois. Choisis le temps que tu veux lui consacrer.</p>
        <label>Donjon ou projet<select value={projectId} onChange={e => { setProjectId(e.target.value); const p = projects.find(p => p.id === e.target.value); if (p) setObjective(p.title); }}>
          <option value="">Session libre</option>{selectable.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select></label>
        <label>Objectif de la session<input value={objective} onChange={e => setObjective(e.target.value)} maxLength={200} placeholder="Ex. Rédiger le premier chapitre" /></label>
        <fieldset><legend>Format</legend><div className={styles.presets}>{PRESETS.map(p => <button key={p.id} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}><strong>{p.label}</strong><span>{p.id === 'ritual' ? 'Bouger, réfléchir, apprendre' : `${p.minutes} min + ${p.rest} min de pause`}</span></button>)}<button aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}><strong>Personnalisé</strong><span>À ton rythme</span></button></div></fieldset>
        {preset === 'custom' && <div className={styles.row}><label>Travail (minutes)<input type="number" min={5} max={180} value={minutes} onChange={e => setMinutes(e.target.value)} /></label><label>Pause (minutes)<input type="number" min={0} max={60} value={rest} onChange={e => setRest(e.target.value)} /></label></div>}
        <p className={styles.hint}>{preset === 'ritual' ? 'Trois étapes de 20 minutes, à l’heure qui te convient. Le rituel se déroule sur une heure.' : 'Les 3 premières minutes sont un repère d’entrée en concentration, inclus dans la durée choisie. Ce minuteur ne mesure pas ton attention.'}</p>
        <button className={styles.primary} onClick={start} disabled={!objective.trim() || !loaded}>Commencer</button>
        <details><summary>Les inspirations</summary><p>Formats adaptés de Deep Work et des méthodes de Robin Sharma. La pause de 15 minutes après un bloc de 90 minutes est un choix de Grindleveling.</p><p><a href="https://calnewport.com/on-deep-breaks/" target="_blank" rel="noreferrer">Cal Newport</a> / <a href="https://robinsharma.com/the-6010-method-for-superhuman-productivity/" target="_blank" rel="noreferrer">Méthode 60/10</a> / <a href="https://robinsharma.com/the-202020-formula-for-great-mornings-6minute-episode/" target="_blank" rel="noreferrer">Rituel 20/20/20</a></p></details>
      </div> : <div className={styles.session}>
        <p className={styles.hint}>{current.projectTitle || 'Session libre'} / {current.label}</p><h3>{current.objective}</h3>
        <p className={styles.phase} role="status">{phaseLabel(current)}</p>
        <div className={styles.clock} role="timer" aria-label="Temps restant">{clockText(current.leftMs)}</div>
        <progress value={current.workedMs} max={current.totalMs} aria-label="Temps de travail accompli" />
        <p className={styles.hint}>{clockText(current.workedMs)} accomplies sur {clockText(current.totalMs)}{current.interruptions ? ` / ${current.interruptions} interruption${current.interruptions > 1 ? 's' : ''}` : ''}</p>
        {isWork && current.entryLeftMs > 0 && <p>Installation : encore {clockText(current.entryLeftMs)}. Le travail déjà accompli est conservé.</p>}
        {isWork && current.ritual && <p>Étape {Math.min(3, Math.floor(current.workedMs / 1200000) + 1)} sur 3 : {clockText(1200000 - current.workedMs % 1200000)} restantes.</p>}
        {isWork && <button onClick={() => session && store(distractFocus(session, Date.now()))}>Je me suis déconcentré</button>}
        {(current.phase === 'distraction' || current.phase === 'ready') && <><p>Le travail est suspendu. Tu peux revenir dès que tu le souhaites.</p><button className={styles.primary} onClick={() => session && store(resumeFocus(session, Date.now()))}>Replonger</button></>}
        {(current.phase === 'work' || current.phase === 'distraction' || current.phase === 'ready') && <button className={styles.quiet} onClick={() => session && store(finishFocus(session, Date.now()))}>Terminer et faire le bilan</button>}
        {(current.phase === 'recovery' || current.phase === 'complete') && <div className={styles.setup}>
          <p>{current.phase === 'recovery' ? 'Le bloc est terminé. Prends une pause ; aucune nouvelle session ne démarrera toute seule.' : 'Prends un instant pour noter ton avancée.'}</p>
          <label>Ce que j’ai avancé (facultatif)<textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)} rows={3} /></label>
          <button className={styles.primary} onClick={saveRecord}>Enregistrer le bilan</button><p className={styles.hint}>Le minuteur ne valide pas le donjon et n’attribue pas d’XP automatiquement.</p>
        </div>}
        <p className={styles.hint}>Tu peux fermer ce panneau : le minuteur continue.</p>
      </div>}
      <details className={styles.history}><summary>Dernières sessions ({history.length})</summary>{history.length === 0 ? <p>Aucune session enregistrée.</p> : <ol>{history.map(r => <li key={r.id}><strong>{r.objective}</strong><span>{new Date(r.savedAt).toLocaleDateString('fr-FR')} / {clockText(r.workedMs)} accomplies / {clockText(r.distractionMs)} de distraction</span>{r.note && <p>{r.note}</p>}</li>)}</ol>}</details>
      <p className={styles.hint}>Sessions et bilans conservés sur cet appareil, pour ton compte.</p>
    </dialog>
  </FocusContext.Provider>;
}
