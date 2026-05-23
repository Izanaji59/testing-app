// lib/engine/difficulty.ts — Tiers de difficulté.

import type { DifficultyTier } from '@/lib/types';
import { T } from '@/lib/tokens';

export const DIFFICULTY_META: Record<DifficultyTier, {
  symbol: string;
  label: string;
  color: string;
  baseXp: number;
  critChance: number;
}> = {
  TRIVIAL:   { symbol: '·',    label: 'TRIVIAL',    color: T.textDim, baseXp: 15,  critChance: 0    },
  ROUTINE:   { symbol: '· ·',  label: 'ROUTINIER',  color: T.cyan,    baseXp: 35,  critChance: 0.02 },
  NOTABLE:   { symbol: '◊',    label: 'NOTABLE',    color: T.cyan,    baseXp: 80,  critChance: 0.05 },
  HARD:      { symbol: '◊ ◊',  label: 'DIFFICILE',  color: T.amber,   baseXp: 180, critChance: 0.08 },
  LEGENDARY: { symbol: '✦',    label: 'LÉGENDAIRE', color: T.purple,  baseXp: 400, critChance: 0.15 },
};

/**
 * Calcul du score de difficulté à partir des 5 composantes.
 * Chaque composante normalisée [0, 1].
 */
export function difficultyScore(parts: {
  duration: number;       // [0,1] — durée estimée normalisée
  cognitiveLoad: number;  // [0,1]
  dependencies: number;   // [0,1]
  historicalCompletion: number; // [0,1] — 1 = jamais réussi
  userAssessment: number; // [0,1]
}): number {
  return (
    0.30 * parts.duration +
    0.25 * parts.cognitiveLoad +
    0.20 * parts.dependencies +
    0.15 * parts.historicalCompletion +
    0.10 * parts.userAssessment
  );
}

export function difficultyTierFromScore(score: number): DifficultyTier {
  if (score < 0.20) return 'TRIVIAL';
  if (score < 0.40) return 'ROUTINE';
  if (score < 0.60) return 'NOTABLE';
  if (score < 0.80) return 'HARD';
  return 'LEGENDARY';
}
