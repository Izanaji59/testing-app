'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useQuests } from '@/hooks/useQuests';
import { supabase } from '@/lib/supabase/client';
import { deadlineKey, pendingDeadlineReviews, type DeadlineReview as Review } from '@/lib/quest-review';
import styles from './deadline-review.module.css';

export function DeadlineReview({ userId }: { userId: string }) {
  const { quests, refresh } = useQuests();
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
      const result = await supabase().from('quest_deadline_reviews').select('quest_id,due_at,amount').eq('user_id', userId);
      if (result.error) throw result.error;
      return (result.data ?? []) as Review[];
    }, { refreshInterval: 30_000 }
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const pending = pendingDeadlineReviews(quests.filter(q => q.user_id === userId), reviews ?? [], now);
  const quest = pending.find(q => !deferred.includes(deadlineKey(q.id, q.due_at!)));
  const key = quest ? deadlineKey(quest.id, quest.due_at!) : '';
  useEffect(() => { setReason(''); setChoice(''); setError(''); }, [key]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!quest || saving.current || !choice || !reason.trim()) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase().rpc('review_missed_quest', {
        p_quest_id: quest.id, p_due_at: quest.due_at, p_reason: reason.trim(), p_decision: choice,
      });
      if (failure) throw failure;
      setNotice(Number(data) > 0 ? `Bilan enregistré : +${Number(data)} points de résignation.` : 'Bilan enregistré, sans points de résignation. La tâche reste à faire.');
      await refreshReviews(current => [...(current ?? []), { quest_id: quest.id, due_at: quest.due_at!, amount: Number(data) }], { revalidate: false });
      await Promise.all([refresh(), mutate('quests-today'), mutate('profile-bundle')]);
    } catch {
      setError('Le bilan n’a pas pu être enregistré. Ta réponse est conservée ici. Réessaie dans un instant.');
    } finally { saving.current = false; setBusy(false); }
  }

  if (!quest) return notice || pending.length ? <aside className={styles.panel}>
    {notice && <p role="status">{notice}</p>}
    {pending.length > 0 && <button onClick={() => setDeferred([])}>Reprendre le bilan ({pending.length})</button>}
  </aside> : null;

  return <aside className={styles.panel} aria-label="Bilan des tâches en retard" aria-busy={busy}>
    {notice && <p role="status">{notice}</p>}
    <p className={styles.eyebrow}>Échéance dépassée — bilan en attente</p>
    <h2>Quelle est ton excuse ?</h2>
    <p><strong>{quest.title}</strong><br />Prévue le {new Date(quest.due_at!).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}.</p>
    <p>Explique ce qui s’est passé avant de décider des points de résignation. Répondre plus tard n’ajoute aucun point.</p>
    <form onSubmit={submit}>
      <label htmlFor="deadline-reason">Ta réponse</label>
      <textarea id="deadline-reason" required maxLength={1000} rows={3} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} />
      <fieldset disabled={busy}>
        <legend>Comment qualifies-tu ce retard ?</legend>
        <label><input type="radio" name="deadline-decision" value="constraint" checked={choice === 'constraint'} onChange={() => setChoice('constraint')} required /> Un imprévu ou une contrainte réelle — aucun point</label>
        <label><input type="radio" name="deadline-decision" value="avoidance" checked={choice === 'avoidance'} onChange={() => setChoice('avoidance')} required /> J’ai volontairement évité la tâche — appliquer les points</label>
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
