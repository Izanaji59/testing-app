// lib/ai/signals.ts — Calcul client-side des 7 signaux de l'IA adaptative.
// Lecture seule. La source de vérité reste les agrégats SQL (analytics_daily)
// mais ces fonctions permettent un calcul live à l'écran.

import type { Quest, Project, SessionRow, XpEvent } from '@/lib/types';

export type SignalSet = {
  regularity: number;        // 0..1, plus haut = plus régulier
  cognitiveLoad: number;     // 0..100
  dispersion: number;        // 0..1, plus haut = plus dispersé
  realFocus: number;         // minutes/session moyennes
  velocity: number;          // ratio xp_7j / xp_4w_avg
  balance: number;           // 0..1, variance inverse des stats
  reportTruth: number;       // -1..+1, écart self-report vs réel
};

/** Régularité : 1 - écart-type normalisé des intervalles entre sessions (30j). */
export function regularity(sessions: SessionRow[]): number {
  if (sessions.length < 3) return 0;
  const sorted = [...sessions].sort((a, b) => +new Date(a.started_at) - +new Date(b.started_at));
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(+new Date(sorted[i].started_at) - +new Date(sorted[i - 1].started_at));
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const std = Math.sqrt(variance);
  return Math.max(0, Math.min(1, 1 - std / (mean || 1)));
}

/** Charge mentale : XP × difficulté × densité temporelle sur 7 jours, normalisée [0, 100]. */
export function cognitiveLoad(events: XpEvent[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  const recent = events.filter(e => +new Date(e.created_at) > cutoff);
  const total = recent.reduce((a, e) => a + e.xp_amount, 0);
  // Saturation douce : 1500 XP / 7j = ~85% charge
  return Math.min(100, Math.round((total / 1500) * 85));
}

/** Dispersion : projets actifs × switches/jour. Normalisé. */
export function dispersion(projects: Project[], events: XpEvent[]): number {
  const active = projects.filter(p => p.status === 'ACTIVE').length;
  // Approximation : nombre de switches = distincts projet_id par jour
  const last14 = Date.now() - 14 * 86400000;
  const recent = events.filter(e => +new Date(e.created_at) > last14 && e.source_ref_id);
  const refs = new Set(recent.map(e => e.source_ref_id));
  const score = (active / 5) * 0.6 + Math.min(1, refs.size / 14) * 0.4;
  return Math.min(1, score);
}

/** Focus réel : durée moyenne des sessions hors interruption (sec → min). */
export function realFocus(sessions: SessionRow[]): number {
  if (sessions.length === 0) return 0;
  const durations = sessions
    .map(s => (s.duration_sec ?? 0) / 60)
    .filter(d => d > 0);
  if (durations.length === 0) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

/** Vélocité : ratio XP cette semaine / moyenne 4 semaines. */
export function velocity(events: XpEvent[]): number {
  const w = 7 * 86400000;
  const now = Date.now();
  const xpInWindow = (start: number, end: number) =>
    events.filter(e => {
      const t = +new Date(e.created_at);
      return t >= start && t < end;
    }).reduce((a, e) => a + e.xp_amount, 0);

  const thisWeek = xpInWindow(now - w, now);
  const prev4 = [1, 2, 3, 4].map(i => xpInWindow(now - (i + 1) * w, now - i * w));
  const avg = prev4.reduce((a, b) => a + b, 0) / 4;
  return avg > 0 ? thisWeek / avg : 1;
}

/** Équilibre des stats : 1 - variance normalisée. */
export function balance(stats: Array<{ level: number }>): number {
  if (stats.length === 0) return 0;
  const levels = stats.map(s => s.level);
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance = levels.reduce((a, b) => a + (b - mean) ** 2, 0) / levels.length;
  const std = Math.sqrt(variance);
  return Math.max(0, 1 - std / (mean || 1));
}

/** Écart self-report vs signal objectif (-1 → menteur ; +1 → modeste). */
export function reportTruth(
  sessions: SessionRow[],
  realFocusMin: number,
): number {
  const reported = sessions.filter(s => s.quality !== null);
  if (reported.length === 0) return 0;
  const score = reported.reduce((a, s) => {
    return a + (s.quality === 'MAXIMAL' ? 1 : s.quality === 'NET' ? 0 : -0.5);
  }, 0) / reported.length;
  // Si focus réel faible mais score self-report élevé → menteur (négatif)
  const realScore = Math.min(1, realFocusMin / 45);
  return Math.max(-1, Math.min(1, realScore - score));
}

export function computeSignals({
  sessions,
  events,
  projects,
  stats,
}: {
  sessions: SessionRow[];
  events: XpEvent[];
  projects: Project[];
  stats: Array<{ level: number }>;
}): SignalSet {
  const focus = realFocus(sessions);
  return {
    regularity: regularity(sessions),
    cognitiveLoad: cognitiveLoad(events),
    dispersion: dispersion(projects, events),
    realFocus: focus,
    velocity: velocity(events),
    balance: balance(stats),
    reportTruth: reportTruth(sessions, focus),
  };
}
