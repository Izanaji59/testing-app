// lib/engine/progress.ts — Avancement d'un projet / donjon.
// Source unique : projects.progress_pct, tenu à jour par le trigger SQL à partir
// des quêtes terminées. Toutes les vues (salles, phases, HP boss, barre) en
// dérivent, pour ne plus jamais afficher un donjon "complet" à 0 % ou l'inverse.

import type { Project } from '@/lib/types';

export function projectPct(p: Pick<Project, 'progress_pct'>): number {
  const n = Number(p.progress_pct);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

export type PhaseView = {
  total: number;
  /** Étapes franchies. */
  done: number;
  /** Étape en cours, 1-indexée ; `total + 1` quand tout est terminé. */
  current: number;
  pct: number;
};

/**
 * Découpe l'avancement en `total` étapes (salles, phases…).
 * `phase_count` vaut 1 par défaut en base et n'est jamais renseigné par l'UI :
 * on ne le suit que s'il est explicitement supérieur à 1, sinon `fallback`.
 */
export function phaseView(p: Pick<Project, 'progress_pct' | 'phase_count'>, fallback: number): PhaseView {
  const total = p.phase_count > 1 ? p.phase_count : fallback;
  const pct = projectPct(p);
  const done = pct >= 100 ? total : Math.floor((total * pct) / 100);
  return { total, done, current: Math.min(total + 1, done + 1), pct };
}
