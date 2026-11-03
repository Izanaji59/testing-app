import type { Quest } from './types';

export type ReviewKind = 'deadline' | 'started_day';
export type DeadlineReview = { quest_id: string; due_at: string; amount: number; kind?: ReviewKind };
export function deadlineKey(questId: string, dueAt: string) {
  return `${questId}:${new Date(dueAt).getTime()}`;
}

/** Fin de la journée de démarrage : minuit local du jour courant. */
export function startOfLocalDay(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const SAME_DAY_MS = 20 * 3600 * 1000;

/**
 * Mission démarrée un jour précédent et toujours en cours : un bilan par
 * journée, la mission reste en cours. Même tolérance de fuseau que le RPC
 * review_started_quest (une réponse à moins de 20 h couvre la journée).
 */
export function pendingStartedReviews(quests: Quest[], reviews: DeadlineReview[], now = Date.now()) {
  const dayEnd = startOfLocalDay(now);
  return quests.filter(q => {
    if (q.status !== 'IN_PROGRESS' || !q.starts_at) return false;
    // Les missions planifiées suivent leur échéance, sans second bilan quotidien.
    if (q.due_at) return false;
    const started = Date.parse(q.starts_at);
    if (!Number.isFinite(started) || started >= dayEnd) return false;
    return !reviews.some(r => r.quest_id === q.id && (
      Date.parse(r.due_at) === dayEnd ||
      (r.kind === 'started_day' && Math.abs(Date.parse(r.due_at) - dayEnd) < SAME_DAY_MS)
    ));
  });
}

/** The selected local calendar day's end, including days with a clock change. */
export function localDayDeadline(day = new Date()): string {
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

export function questsForToday(quests: Quest[], now = new Date()) {
  const end = Date.parse(localDayDeadline(now));
  return quests.filter(q =>
    (q.status === 'PENDING' || q.status === 'IN_PROGRESS') &&
    (!q.due_at || Date.parse(q.due_at) <= end)
  );
}

/** A timer's estimated duration is not a deadline. Only dated, unfinished quests qualify. */
export function pendingDeadlineReviews(quests: Quest[], reviews: DeadlineReview[], now = Date.now()) {
  const reviewed = new Set(reviews.map(r => deadlineKey(r.quest_id, r.due_at)));
  return quests.filter(q =>
    (q.status === 'PENDING' || q.status === 'IN_PROGRESS') && q.due_at &&
    Number.isFinite(Date.parse(q.due_at)) && Date.parse(q.due_at) <= now &&
    !reviewed.has(deadlineKey(q.id, q.due_at))
  ).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
}
