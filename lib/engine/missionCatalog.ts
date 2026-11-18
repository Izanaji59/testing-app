// lib/engine/missionCatalog.ts — Suggestions de mission du Système.
// Même source que les modèles de donjons : chaque suggestion est une quête d'un modèle,
// avec sa cadence (une fois / chaque jour), à rattacher au donjon de son choix.

import type { DifficultyTier, StatKind } from '@/lib/types';
import { PROJECT_TEMPLATES, templateQuestStat } from './projectTemplates';

export type MissionSuggestion = {
  key: string;
  title: string;
  minutes: number;
  tier: DifficultyTier;
  stat: StatKind;
  daily: boolean;
  /** Modèle de donjon d'origine, ex. « Santé ». */
  domain: string;
};

export const SYSTEM_MISSIONS: MissionSuggestion[] = PROJECT_TEMPLATES.flatMap(t =>
  t.quests.map((q, i) => ({
    key: `${t.id}-${i}`,
    title: q.title,
    minutes: q.minutes,
    tier: q.tier,
    stat: templateQuestStat(t),
    daily: !!q.daily,
    domain: t.domain,
  })));

/** Suggestions pour les stats choisies (toutes sans filtre), les quotidiennes d'abord, sans doublon de titre. */
export function suggestMissions(stats: StatKind[], limit = 8): MissionSuggestion[] {
  const pool = stats.length ? SYSTEM_MISSIONS.filter(m => stats.includes(m.stat)) : SYSTEM_MISSIONS;
  const seen = new Set<string>();
  return pool
    .slice()
    .sort((a, b) => Number(b.daily) - Number(a.daily))
    .filter(m => (seen.has(m.title) ? false : (seen.add(m.title), true)))
    .slice(0, limit);
}
