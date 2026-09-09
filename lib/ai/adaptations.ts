// lib/ai/adaptations.ts — Règles d'adaptation système à partir des signaux.

import type { SignalSet } from './signals';
import type { BriefingPayload, MissionTemplate, StatKind } from '@/lib/types';

export type Adaptation = {
  warning: 'OVERLOAD' | 'DISPERSION' | 'INACTIVITY' | null;
  recommendation: string;
  focusSuggested: string;
  focusStatKind: StatKind | null;
  timeWindow: string;
  suggestRest: boolean;
};

/**
 * Mappe l'ensemble des 7 signaux → adaptation à appliquer dans le briefing.
 */
export function deriveAdaptation(signals: SignalSet): Adaptation {
  // 1. Surcharge prolongée → repos
  if (signals.cognitiveLoad > 85) {
    return {
      warning: 'OVERLOAD',
      recommendation: 'Charge élevée sur 5 jours. Récupération suggérée.',
      focusSuggested: 'ÉNERGIE / RÉSISTANCE',
      focusStatKind: 'FORCE',
      timeWindow: 'aujourd\'hui',
      suggestRest: true,
    };
  }

  // 2. Dispersion + constance faible
  if (signals.dispersion > 0.7 && signals.balance < 0.5) {
    return {
      warning: 'DISPERSION',
      recommendation: 'Trop de fronts ouverts. Mettre 1-2 projets en sommeil.',
      focusSuggested: 'CONSOLIDER',
      focusStatKind: 'DISCIPLINE',
      timeWindow: 'aujourd\'hui',
      suggestRest: false,
    };
  }

  // 3. Focus moyen < 15 min sur 14 jours → réveil
  if (signals.realFocus < 15 && signals.realFocus > 0) {
    return {
      warning: 'INACTIVITY',
      recommendation: 'Une session de 25 min suffirait à relancer la dynamique.',
      focusSuggested: 'DISCIPLINE / FOCUS',
      focusStatKind: 'DISCIPLINE',
      timeWindow: 'maintenant',
      suggestRest: false,
    };
  }

  // 4. Vélocité forte → garde le rythme
  if (signals.velocity > 1.4) {
    return {
      warning: null,
      recommendation: 'Vélocité haute. Garde le rythme — pas plus.',
      focusSuggested: 'CONTINUER',
      focusStatKind: null,
      timeWindow: 'matin',
      suggestRest: false,
    };
  }

  // 5. Par défaut
  return {
    warning: null,
    recommendation: 'Tout est aligné. Une session focus suffit.',
    focusSuggested: 'TECHNIQUE',
    focusStatKind: 'TECHNIQUE',
    timeWindow: 'avant 12h',
    suggestRest: false,
  };
}

/** Pioche jusqu'à 2 modèles pour la stat priorisée (fallback : n'importe lesquels). */
function pickSuggestedMissions(templates: MissionTemplate[], focusStatKind: StatKind | null) {
  if (templates.length === 0) return undefined;
  const matching = focusStatKind ? templates.filter(t => t.stat_kind === focusStatKind) : [];
  const pool = matching.length > 0 ? matching : templates;
  return pool.slice(0, 2).map(t => ({
    title: t.title,
    stat_kind: t.stat_kind,
    difficulty_tier: t.difficulty_tier,
    estimated_minutes: t.estimated_minutes,
  }));
}

export function buildBriefingPayload(opts: {
  mission?: { id: string; title: string; progress_pct: number };
  signals: SignalSet;
  questIds?: string[];
  templates?: MissionTemplate[];
}): BriefingPayload {
  const a = deriveAdaptation(opts.signals);
  return {
    mission: opts.mission,
    charge_mentale_pct: Math.round(opts.signals.cognitiveLoad),
    focus_suggested: a.focusSuggested,
    focus_stat_kind: a.focusStatKind,
    time_window: a.timeWindow,
    recommendation: a.recommendation,
    warning: a.warning,
    quests_proposed: opts.questIds,
    suggested_missions: pickSuggestedMissions(opts.templates ?? [], a.focusStatKind),
  };
}
