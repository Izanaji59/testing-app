// lib/engine/rank.ts — Logique de rangs (informationnel, autoritatif en SQL).

import type { RankLetter } from '@/lib/types';

export type RankGate = {
  letter: RankLetter;
  label: string;
  minLevel: number;
  minXp: number;
  projects: number;
  maxLevel?: number;
  gate: string; // description humaine
};

export const RANK_GATES: RankGate[] = [
  { letter: 'E', label: 'Premiers repères', minLevel: 1, maxLevel: 9, minXp: 0, projects: 0, gate: 'Construire ses premières habitudes' },
  { letter: 'D', label: 'Rythme installé', minLevel: 10, maxLevel: 24, minXp: 4000, projects: 0, gate: '4 000 XP' },
  { letter: 'C', label: 'Pratique solide', minLevel: 25, maxLevel: 49, minXp: 12000, projects: 0, gate: '12 000 XP' },
  { letter: 'B', label: 'Parcours confirmé', minLevel: 50, maxLevel: 79, minXp: 30000, projects: 0, gate: '30 000 XP' },
  { letter: 'A', label: 'Accomplissement', minLevel: 80, maxLevel: 109, minXp: 65000, projects: 3, gate: '65 000 XP et 3 projets terminés' },
  { letter: 'S', label: 'Maîtrise', minLevel: 110, maxLevel: 139, minXp: 150000, projects: 8, gate: '150 000 XP et 8 projets terminés' },
  { letter: 'MONARCH', label: 'Au-delà de la maîtrise', minLevel: 140, minXp: 300000, projects: 12, gate: '300 000 XP et 12 projets terminés' },
];

export function rankForLevel(level: number): RankLetter {
  for (let i = RANK_GATES.length - 1; i >= 0; i--) {
    if (level >= RANK_GATES[i].minLevel) return RANK_GATES[i].letter;
  }
  return 'E';
}
