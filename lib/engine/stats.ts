// lib/engine/stats.ts — Métadonnées des 9 stats.

import type { StatKind } from '@/lib/types';
import { T } from '@/lib/tokens';

export const STAT_META: Record<StatKind, {
  label: string;
  short: string;
  symbol: string;
  color: string;
  description: string;
}> = {
  DISCIPLINE: {
    label: 'DISCIPLINE', short: 'DISC', symbol: '◆', color: T.cyan,
    description: 'Constance, anti-procrastination, respect des engagements.',
  },
  FOCUS: {
    label: 'FOCUS', short: 'FOC', symbol: '◊', color: T.cyanHi,
    description: 'Sessions deep work, pas de switch, sessions longues.',
  },
  INTELLIGENCE: {
    label: 'INTELLIGENCE', short: 'INT', symbol: '◉', color: T.cyan,
    description: 'Lecture, étude, analyse, prise de notes.',
  },
  CREATIVITY: {
    label: 'CRÉATIVITÉ', short: 'CRE', symbol: '✦', color: T.purple,
    description: 'Production originale, écriture, design, idées.',
  },
  LEADERSHIP: {
    label: 'LEADERSHIP', short: 'LEAD', symbol: '▲', color: T.amber,
    description: 'Influence, communication, gestion, prise de décision.',
  },
  ENERGY: {
    label: 'ÉNERGIE', short: 'ENE', symbol: '⚡', color: T.green,
    description: 'Sport, sommeil, nutrition, marche, récupération.',
  },
  MENTAL_RESISTANCE: {
    label: 'RÉSISTANCE', short: 'RES', symbol: '❖', color: T.purple,
    description: 'Surmonter échec, persister, sortir de zone de confort.',
  },
  TECHNIQUE: {
    label: 'TECHNIQUE', short: 'TECH', symbol: '⬡', color: T.cyan,
    description: 'Hard skills, code, métier, expertise pratique.',
  },
  SOCIAL: {
    label: 'SOCIAL', short: 'SOC', symbol: '◐', color: T.amber,
    description: 'Conversations qualitatives, networking, liens entretenus.',
  },
};

export const STAT_KINDS: StatKind[] = Object.keys(STAT_META) as StatKind[];
