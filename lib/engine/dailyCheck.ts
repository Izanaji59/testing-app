// lib/engine/dailyCheck.ts — Règles du bilan « Qu'as-tu fait aujourd'hui ? » (centre de commande).

export const DAY_MS = 86_400_000;

export type AlertLevel = 'done' | 'calm' | 'warn' | 'danger';

export const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Niveau d'alerte : rien d'alarmant le matin, orange l'après-midi, rouge à partir de 18 h. */
export function alertLevel(doneToday: number, hour: number): AlertLevel {
  if (doneToday > 0) return 'done';
  if (hour < 12) return 'calm';
  return hour < 18 ? 'warn' : 'danger';
}

/** Jours pleins écoulés depuis la dernière quête validée (null si aucune). */
export function idleDays(quests: { status: string; completed_at: string | null }[], now: Date): number | null {
  let last = -Infinity;
  for (const q of quests) {
    if (q.status !== 'COMPLETED' || !q.completed_at) continue;
    const t = Date.parse(q.completed_at);
    if (Number.isFinite(t) && t > last) last = t;
  }
  if (last === -Infinity) return null;
  return Math.max(0, Math.round((startOfLocalDay(now) - startOfLocalDay(new Date(last))) / DAY_MS));
}

/** Quêtes validées depuis minuit (heure locale). */
export function completedToday<Q extends { status: string; completed_at: string | null }>(quests: Q[], now: Date): Q[] {
  const start = startOfLocalDay(now);
  return quests.filter(q => q.status === 'COMPLETED' && !!q.completed_at && Date.parse(q.completed_at) >= start);
}

/** Heures entières restantes avant minuit. */
export const hoursBeforeMidnight = (now: Date) => Math.max(0, Math.ceil((startOfLocalDay(now) + DAY_MS - now.getTime()) / 3_600_000));
