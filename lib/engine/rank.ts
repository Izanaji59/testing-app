// lib/engine/rank.ts — Logique de rangs (informationnel, autoritatif en SQL).

import type { RankLetter } from '@/lib/types';

export type RankGate = {
  letter: RankLetter;
  label: string;
  minLevel: number;
  maxLevel?: number;
  gate: string; // description humaine
};

export const RANK_GATES: RankGate[] = [
  { letter: 'E',       label: 'Novice — test du système',  minLevel: 1,   maxLevel: 9,   gate: '—' },
  { letter: 'D',       label: 'Apprenti — construction',    minLevel: 10,  maxLevel: 24,  gate: '1 stat ≥ Lv 10' },
  { letter: 'C',       label: 'Compétent — spec choisie',   minLevel: 25,  maxLevel: 49,  gate: '3 stats ≥ Lv 20 · 1 boss' },
  { letter: 'B',       label: 'Confirmé — style établi',    minLevel: 50,  maxLevel: 79,  gate: '4 stats ≥ Lv 35 · 2 boss' },
  { letter: 'A',       label: 'Élite — reconnu',            minLevel: 80,  maxLevel: 109, gate: '5 stats ≥ Lv 50 · 3 boss (1 majeur)' },
  { letter: 'S',       label: 'Maître — influence',         minLevel: 110, maxLevel: 139, gate: '6 stats ≥ Lv 65 · 4 boss (2 majeurs)' },
  { letter: 'MONARCH', label: 'Légende — souveraineté',     minLevel: 140,                gate: '7 stats ≥ Lv 75 · 2 stats ≥ Lv 90 · Monarch Boss' },
];

export function rankForLevel(level: number): RankLetter {
  for (let i = RANK_GATES.length - 1; i >= 0; i--) {
    if (level >= RANK_GATES[i].minLevel) return RANK_GATES[i].letter;
  }
  return 'E';
}
