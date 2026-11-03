'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useQuests } from '@/hooks/useQuests';
import { supabase } from '@/lib/supabase/client';
import {
  deadlineKey, pendingDeadlineReviews, pendingStartedReviews, startOfLocalDay,
  type DeadlineReview as Review, type ReviewKind,
} from '@/lib/quest-review';
import type { Quest } from '@/lib/types';
import styles from './deadline-review.module.css';

type Item = { quest: Quest; dueAt: string; kind: ReviewKind };
const itemKey = (i: Item) => `${i.kind}:${deadlineKey(i.quest.id, i.dueAt)}`;
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export function DeadlineReview({ userId }: { userId: string }) {
  const { quests, refresh, error: questsError } = useQuests();
  const [now, setNow] = useState(Date.now);
  const [deferred, setDeferred] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<'' | 'constraint' | 'avoidance'>('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { data: reviews, error: loadError, mutate: refreshReviews } = useSWR(
    ['deadline-reviews', userId], async () => {
      const result = await supabase().from('quest_deadline_reviews').select('quest_id,due_at,amount,kind').eq('user_id', userId);
      if (result.error) throw result.error;
      return (result.data ?? []) as Review[];
    }, { refreshInterval: 30_000 }
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    const syncClock = () => setNow(Date.now());
    const onVisible = () => { if (document.visibilityState === 'visible') syncClock(); };
    window.addEventListener('focus', syncClock);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', syncClock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const mine = quests.filter(q => q.user_id === userId);
  const dayEnd = new Date(startOfLocalDay(now)).toISOString();
  const pending: Item[] = [
    ...pendingDeadlineReviews(mine, reviews ?? [], now).map(q => ({ quest: q, dueAt: q.due_at!, kind: 'deadline' as const })),
    ...pendingStartedReviews(mine, reviews ?? [], now).map(q => ({ quest: q, dueAt: dayEnd, kind: 'started_day' as const })),
  ];
  const item = pending.find(i => !deferred.includes(itemKey(i)));
  const key = item ? itemKey(item) : '';
  useEffect(() => { setReason(''); setChoice(''); setError(''); }, [key]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!item || saving.current || !choice || !reason.trim()) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const { data, error: failure } = item.kind === 'deadline'
        ? await supabase().rpc('review_missed_quest', {
            p_quest_id: item.quest.id, p_due_at: item.dueAt, p_reason: reason.trim(), p_decision: choice,
          })
        : await supabase().rpc('review_started_quest', {
            p_quest_id: item.quest.id, p_day_end: item.dueAt, p_reason: reason.trim(), p_decision: choice,
          });
      if (failure) throw failure;
      const amount = Number(data);
      setNotice(item.kind === 'deadline'
        ? (amount > 0 ? `Bilan enregistré : +${amount} points de résignation.` : 'Bilan enregistré, sans points de résignation. La tâche reste à faire.')
        : (amount > 0 ? `Bilan enregistré : +${amount} points de résignation. La mission reste en cours.` : 'Bilan enregistré, sans points de résignation. La mission reste en cours.'));
      await refreshReviews(current => [...(current ?? []), { quest_id: item.quest.id, due_at: item.dueAt, amount, kind: item.kind }], { revalidate: false });
      await Promise.all([refresh(), mutate('quests-today'), mutate('profile-bundle')]);
    } catch {
      setError('Le bilan n’a pas pu être enregistré. Ta réponse est conservée ici. Réessaie dans un instant.');
    } finally { saving.current = false; setBusy(false); }
  }

  if (!item) return notice || pending.length || questsError ? <aside className={styles.panel}>
    {questsError && <p role="alert">Les quêtes n’ont pas pu être chargées. Le bilan sera disponible une fois la connexion rétablie.</p>}
    {notice && <p role="status">{notice}</p>}
    {pending.length > 0 && <button onClick={() => setDeferred([])}>Reprendre le bilan ({pending.length})</button>}
  </aside> : null;

  const started = item.kind === 'started_day';
  return <aside className={styles.panel} aria-label="Bilan des tâches en retard" aria-busy={busy}>
    {notice && <p role="status">{notice}</p>}
    <p className={styles.eyebrow}>{started ? 'Mission démarrée, non terminée — bilan en attente' : 'Échéance dépassée — bilan en attente'}</p>
    <h2>Quelle est ton excuse ?</h2>
    {started
      ? <p><strong>{item.quest.title}</strong><br />Démarrée le {fmt(item.quest.starts_at!)}, toujours en cours. Elle reste en cours quoi que tu répondes.</p>
      : <p><strong>{item.quest.title}</strong><br />Prévue le {fmt(item.dueAt)}.</p>}
    <p>Explique ce qui s’est passé avant de décider des points de résignation. Répondre plus tard n’ajoute aucun point.</p>
    <form onSubmit={submit}>
      <label htmlFor="deadline-reason">Ta réponse</label>
      <textarea id="deadline-reason" required maxLength={1000} rows={3} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} />
      <fieldset disabled={busy}>
        <legend>{started ? 'Pourquoi n’est-elle pas terminée ?' : 'Comment qualifies-tu ce retard ?'}</legend>
        <label><input type="radio" name="deadline-decision" value="constraint" checked={choice === 'constraint'} onChange={() => setChoice('constraint')} required /> Un imprévu ou une contrainte réelle — aucun point</label>
        <label><input type="radio" name="deadline-decision" value="avoidance" checked={choice === 'avoidance'} onChange={() => setChoice('avoidance')} required /> {started ? 'J’ai volontairement repoussé la mission — appliquer l’XP non gagnée en résignation' : 'J’ai volontairement évité la tâche — appliquer les points'}</label>
      </fieldset>
      {loadError && <p role="alert">Le service de bilan est indisponible. Aucune pénalité ne sera demandée depuis cet écran.</p>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={busy || !reviews || !!loadError || !reason.trim() || !choice}>{busy ? 'Enregistrement…' : 'Valider mon bilan'}</button>
        <button type="button" disabled={busy} onClick={() => setDeferred(current => [...current, key])}>Répondre plus tard</button>
      </div>
    </form>
  </aside>;
}
