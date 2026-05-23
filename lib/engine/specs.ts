// lib/engine/specs.ts — Définitions des 7 spécialisations.

import type { SpecKind, StatKind } from '@/lib/types';

export const SPECS: Record<SpecKind, {
  label: string;
  identity: string;
  dominantStats: StatKind[];
  bonus: string;
  unlockRank: 'C' | 'S';
}> = {
  ARCHITECT: {
    label: 'ARCHITECTE',
    identity: 'Bâtisseur de systèmes.',
    dominantStats: ['INTELLIGENCE', 'TECHNIQUE', 'DISCIPLINE'],
    bonus: '+15% XP sur tâches longues (>2h)',
    unlockRank: 'C',
  },
  STRATEGIST: {
    label: 'STRATÈGE',
    identity: 'Maître du plan.',
    dominantStats: ['LEADERSHIP', 'INTELLIGENCE', 'MENTAL_RESISTANCE'],
    bonus: '+20% XP sur décisions documentées',
    unlockRank: 'C',
  },
  CREATOR: {
    label: 'CRÉATEUR',
    identity: "Producteur d'œuvres.",
    dominantStats: ['CREATIVITY', 'TECHNIQUE', 'FOCUS'],
    bonus: '+25% XP sur output original',
    unlockRank: 'C',
  },
  WARRIOR: {
    label: 'GUERRIER',
    identity: 'Force et constance.',
    dominantStats: ['ENERGY', 'DISCIPLINE', 'MENTAL_RESISTANCE'],
    bonus: '+20% XP sur entraînement physique',
    unlockRank: 'C',
  },
  DIPLOMAT: {
    label: 'DIPLOMATE',
    identity: 'Influence par lien.',
    dominantStats: ['SOCIAL', 'LEADERSHIP', 'CREATIVITY'],
    bonus: '+15% XP sur interactions de qualité',
    unlockRank: 'C',
  },
  SCHOLAR: {
    label: 'ÉRUDIT',
    identity: 'Soif de savoir.',
    dominantStats: ['INTELLIGENCE', 'FOCUS', 'CREATIVITY'],
    bonus: '+25% XP sur apprentissage profond',
    unlockRank: 'C',
  },
  MONARCH: {
    label: 'MONARCH',
    identity: 'Souveraineté.',
    dominantStats: ['DISCIPLINE', 'FOCUS', 'INTELLIGENCE', 'LEADERSHIP'],
    bonus: '+10% XP partout, accès aux Monarch Quests',
    unlockRank: 'S',
  },
};

/**
 * Recommande les 2-3 specs les plus alignées avec les stats actuelles.
 */
export function recommendSpecs(stats: Array<{ kind: StatKind; level: number }>) {
  const byKind = new Map(stats.map(s => [s.kind, s.level]));
  const scored = (Object.keys(SPECS) as SpecKind[])
    .filter(k => k !== 'MONARCH')
    .map(specKind => {
      const s = SPECS[specKind];
      const score = s.dominantStats.reduce((acc, k) => acc + (byKind.get(k) ?? 1), 0);
      return { specKind, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.specKind);
}
