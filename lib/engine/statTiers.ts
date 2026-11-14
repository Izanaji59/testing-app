// lib/engine/statTiers.ts — Plusieurs stats par quête ou donjon, chacune avec sa difficulté,
// et butin de donjon. Miroir des fonctions SQL de 0023 (aperçus uniquement : le serveur fait foi).
// Aucun import à l'exécution : testé par scripts/test-willpower.cjs.

import type { DifficultyTier, Project, Quest, StatKind, StatTiers } from '@/lib/types';

export const TIERS: DifficultyTier[] = ['TRIVIAL', 'ROUTINE', 'NOTABLE', 'HARD', 'LEGENDARY'];

/** Stats qui reçoivent de l'XP. Le revenu se gagne en euros, la résignation se subit. */
export const XP_STAT_KINDS: StatKind[] = ['DISCIPLINE', 'FOCUS', 'INTELLIGENCE', 'CREATIVITY', 'LEADERSHIP', 'FORCE', 'MENTALITE', 'TECHNIQUE', 'SOCIAL', 'AGUERRISSEMENT'];

/** Poids d'une stat = plafond d'XP de sa difficulté (f_base_xp_for_tier). */
export const TIER_WEIGHT: Record<DifficultyTier, number> = { TRIVIAL: 15, ROUTINE: 35, NOTABLE: 80, HARD: 180, LEGENDARY: 400 };

/** Part de l'XP des quêtes d'un donjon versée en butin à la fin (f_loot_rate). */
export const LOOT_RATE: Record<DifficultyTier, number> = { TRIVIAL: 0.25, ROUTINE: 0.4, NOTABLE: 0.6, HARD: 0.8, LEGENDARY: 1 };

export type StatTierEntry = { kind: StatKind; tier: DifficultyTier; weight: number };

/** Stats triées comme en base : la plus difficile d'abord, puis par nom. */
export function sortedStatTiers(tiers: StatTiers | null | undefined): StatTierEntry[] {
  return Object.entries(tiers ?? {})
    .filter((e): e is [StatKind, DifficultyTier] => XP_STAT_KINDS.includes(e[0] as StatKind) && TIERS.includes(e[1] as DifficultyTier))
    .map(([kind, tier]) => ({ kind, tier, weight: TIER_WEIGHT[tier] }))
    .sort((a, b) => b.weight - a.weight || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
}

/** Difficulté globale = la plus haute des stats ; null sans stat. */
export function topTier(tiers: StatTiers | null | undefined): DifficultyTier | null {
  return sortedStatTiers(tiers)[0]?.tier ?? null;
}

/** null si aucune stat valide (même règle que f_clean_stat_tiers). */
export function cleanStatTiers(tiers: StatTiers | null | undefined): StatTiers | null {
  const entries = sortedStatTiers(tiers);
  return entries.length ? Object.fromEntries(entries.map(e => [e.kind, e.tier])) as StatTiers : null;
}

/** Répartit un montant entier selon des poids ; le reste va aux premiers (f_split_weighted). */
export function splitWeighted(amount: number, weights: number[]): number[] {
  const n = weights.length;
  if (!n) return [];
  if (amount <= 0) return weights.map(() => 0);
  let w = weights.map(x => Math.max(0, x));
  let total = w.reduce((s, x) => s + x, 0);
  if (!total) { w = w.map(() => 1); total = n; }
  const shares = w.map(x => Math.floor((amount * x) / total));
  let given = shares.reduce((s, x) => s + x, 0);
  for (let i = 0; given < amount; i = (i + 1) % n) { shares[i]++; given++; }
  return shares;
}

/** Stats d'une quête pour l'affichage, y compris les anciennes quêtes (une difficulté pour toutes). */
export function questStatTiers(q: Pick<Quest, 'stat_tiers' | 'reward_stats' | 'difficulty_tier'>): StatTierEntry[] {
  if (q.stat_tiers) return sortedStatTiers(q.stat_tiers);
  const tier = q.difficulty_tier ?? 'ROUTINE';
  return sortedStatTiers(Object.fromEntries((q.reward_stats ?? []).map(k => [k, tier])) as StatTiers);
}

/** Stats d'un donjon : stat_tiers, sinon stat principale (et secondaire) à la difficulté du projet. */
export function projectStatTiers(p: Pick<Project, 'stat_tiers' | 'primary_stat' | 'secondary_stat' | 'difficulty'>): StatTierEntry[] {
  if (p.stat_tiers) return sortedStatTiers(p.stat_tiers);
  const tier = p.difficulty ?? 'NOTABLE';
  const kinds = [p.primary_stat, p.secondary_stat].filter((k): k is StatKind => !!k);
  return sortedStatTiers(Object.fromEntries(kinds.map(k => [k, tier])) as StatTiers);
}

/**
 * Répartition du butin entre les stats du donjon. Seule la stat principale reçoit le butin
 * d'un ancien projet sans stat_tiers ; à défaut de stat valide, tout va en Discipline.
 */
export function lootShares(loot: number, p: Pick<Project, 'stat_tiers' | 'primary_stat'>): Array<{ kind: StatKind; xp: number }> {
  let entries = sortedStatTiers(p.stat_tiers);
  if (!entries.length && p.primary_stat && XP_STAT_KINDS.includes(p.primary_stat)) entries = [{ kind: p.primary_stat, tier: 'NOTABLE', weight: 1 }];
  if (!entries.length) entries = [{ kind: 'DISCIPLINE', tier: 'NOTABLE', weight: 1 }];
  const shares = splitWeighted(loot, entries.map(e => e.weight));
  return entries.map((e, i) => ({ kind: e.kind, xp: shares[i] }));
}

/** Un donjon mérite d'être clos : toutes ses quêtes faites, ou échéance passée. */
export function readyToClose(p: Pick<Project, 'progress_pct' | 'ends_at'>, questTotal: number, now = Date.now()): boolean {
  const ended = !!p.ends_at && Number.isFinite(Date.parse(p.ends_at)) && Date.parse(p.ends_at) <= now;
  return ended || (questTotal > 0 && Number(p.progress_pct) >= 100);
}
