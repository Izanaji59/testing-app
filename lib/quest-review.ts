import type { Quest } from './types';

export type DeadlineReview = { quest_id: string; due_at: string; amount: number };
export function deadlineKey(questId: string, dueAt: string) {
  return `${questId}:${new Date(dueAt).getTime()}`;
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
