import type { Quest } from './types';

export type DeadlineReview = { quest_id: string; due_at: string; amount: number };
export function deadlineKey(questId: string, dueAt: string) {
  return `${questId}:${new Date(dueAt).getTime()}`;
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
