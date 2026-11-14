// lib/engine/willpower.ts — Réservoir de volonté.
// Une jauge, pas un compteur par quête. Le joueur juge lui-même ses distractions :
// ressourcé ou vidé. L'appli guide vers les bonnes (calmes, presque méditatives :
// lecture, marche, sport, rencontres), rappelle qu'une partie très prenante (LoL, échecs
// au long cours) consomme de la concentration même appréciée, et que le scroll au réveil
// coûte double. La méthode 20/20/20 à l'aube recharge. L'effort des quêtes l'entame en
// compte interne. Le sommeil seul ne la remplit qu'à moitié.
// Indicateur seulement : il ne donne ni ne retire jamais d'XP. Aucun import à l'exécution.

import type { DifficultyTier, Quest, SessionRow, StatKind, StatTiers } from '@/lib/types';

export const WILLPOWER_MAX = 100;
export const START_LEVEL = 50;
export const SLEEP_GAIN = 15;         // chaque nuit…
export const SLEEP_CEILING = 60;      // …mais le sommeil seul ne remplit pas au-delà
export const DAILY_RECHARGE_CAP = 60; // les recharges d'une même journée plafonnent
export const MORNING_END_HOUR = 11;
export const WINDOW_DAYS = 14;
export const DISTRACTION_COST = 3;    // « Je me suis déconcentré » pendant le minuteur
export const DRAIN_PER_MIN = 0.4;     // distraction qui a vidé
export const MORNING_MULT = 2;        // ce qui vide coûte double avant 11 h
export const LONG_AFTER = 90;         // au-delà, une même distraction recharge de moins en moins
export const LONG_FACTOR = 0.3;
export const METHOD_MORNING = 15;     // méthode 20/20/20 à l'aube
export const METHOD_LATER = 6;

/** Effort des quêtes, par minute (compte interne, jamais affiché par quête). */
export const EFFORT_PER_MIN: Record<DifficultyTier, number> = { TRIVIAL: 0.03, ROUTINE: 0.08, NOTABLE: 0.15, HARD: 0.25, LEGENDARY: 0.35 };
/** Quêtes qui rechargent au lieu de vider : liens humains et épreuves hors zone de confort. */
export const RECHARGE_STAT_PER_MIN: Partial<Record<StatKind, number>> = { SOCIAL: 0.2, AGUERRISSEMENT: 0.35 };
const TIER_MULT: Record<DifficultyTier, number> = { TRIVIAL: 0.5, ROUTINE: 0.75, NOTABLE: 1, HARD: 1.25, LEGENDARY: 1.5 };
const TIER_WEIGHT: Record<DifficultyTier, number> = { TRIVIAL: 15, ROUTINE: 35, NOTABLE: 80, HARD: 180, LEGENDARY: 400 };

export type Activity =
  | 'LECTURE' | 'MARCHE' | 'SPORT' | 'MEDITATION' | 'NATURE' | 'RENCONTRE' | 'NETWORKING' | 'AVENTURE' | 'LOISIR'
  | 'ECHECS' | 'JEU_VIDEO' | 'JEU_ARGENT' | 'VIDEO' | 'SCROLL' | 'AUTRE';
export type ActivityGroup = 'saine' | 'doser' | 'piege';

/**
 * recharge : ce qu'une minute rend quand le joueur s'en dit ressourcé.
 * attention : ce qu'une minute consomme de concentration, ressourcé ou pas.
 */
export const ACTIVITIES: Record<Activity, { label: string; group: ActivityGroup; recharge: number; attention: number; hint?: string }> = {
  LECTURE: { label: 'Lecture', group: 'saine', recharge: 0.3, attention: 0 },
  MARCHE: { label: 'Marche', group: 'saine', recharge: 0.3, attention: 0 },
  SPORT: { label: 'Sport', group: 'saine', recharge: 0.3, attention: 0 },
  MEDITATION: { label: 'Méditation, respiration', group: 'saine', recharge: 0.35, attention: 0 },
  NATURE: { label: 'Nature, grand air', group: 'saine', recharge: 0.3, attention: 0 },
  RENCONTRE: { label: 'Rencontre, discussion', group: 'saine', recharge: 0.3, attention: 0 },
  NETWORKING: { label: 'Networking', group: 'saine', recharge: 0.25, attention: 0 },
  AVENTURE: { label: 'Aguerrissement, aventure', group: 'saine', recharge: 0.4, attention: 0 },
  LOISIR: { label: 'Loisir créatif', group: 'saine', recharge: 0.25, attention: 0, hint: 'Musique, dessin, bateau, cuisine : ce que tu fais pour le plaisir de le faire.' },
  ECHECS: { label: 'Échecs', group: 'doser', recharge: 0.2, attention: 0.08, hint: 'Une partie peut être méditative ; cinq heures, c’est une autre histoire. Tout dépend du temps dont tu disposes.' },
  JEU_VIDEO: { label: 'Jeu vidéo (LoL…)', group: 'doser', recharge: 0.15, attention: 0.2, hint: 'Une partie demande beaucoup de concentration : même appréciée, elle puise dans ta volonté. Cette concentration, garde-la pour gagner ta journée.' },
  JEU_ARGENT: { label: 'Jeu d’argent', group: 'doser', recharge: 0.1, attention: 0.15, hint: 'L’excitation du gain n’est pas du repos. Sois honnête sur ce que ça t’a fait.' },
  VIDEO: { label: 'Séries, vidéos', group: 'doser', recharge: 0.12, attention: 0.02, hint: 'Un épisode choisi peut détendre ; l’enchaînement automatique, rarement.' },
  SCROLL: { label: 'Scroll, réseaux', group: 'piege', recharge: 0.05, attention: 0.1, hint: 'De la dopamine sans repos. Au réveil, ça coûte double.' },
  AUTRE: { label: 'Autre', group: 'doser', recharge: 0.15, attention: 0 },
};

export const GROUPS: Record<ActivityGroup, { title: string; text: string }> = {
  saine: { title: 'Bonnes distractions', text: 'Calmes, presque méditatives : de la dopamine saine et de la sérotonine, sans gâcher ta volonté.' },
  doser: { title: 'À doser', text: 'Elles peuvent ressourcer ou vider : tout dépend du temps dont tu disposes, de l’abus et de la distraction elle-même.' },
  piege: { title: 'Piège', text: 'Elles excitent sans reposer.' },
};

/** Déclarations du joueur (table willpower_events) : distractions, méthode 20/20/20, batterie sociale. */
export type WillpowerEvent = {
  id: string;
  kind: 'DOPAMINE' | 'RECHARGE' | 'RITUAL' | 'SOCIAL_SPENT' | 'SOCIAL_RECHARGE';
  activity: Activity | 'RITUEL_202020' | 'UN_PEU' | 'BEAUCOUP' | 'MOITIE' | 'COMPLET';
  minutes: number;
  occurred_at: string;
};
const SOCIAL_ACTIVITIES = ['RENCONTRE', 'NETWORKING'];

export type WillpowerState = 'charge' | 'stable' | 'bas' | 'vide';

export type Willpower = {
  level: number;
  state: WillpowerState;
  today: { recharge: number; drain: number; method: boolean; morningDrain: boolean };
  morning: boolean;
};

type QuestLike = Pick<Quest, 'status' | 'difficulty_tier' | 'estimated_minutes' | 'completed_at' | 'reward_stats'> & { stat_tiers?: StatTiers | null };
type SessionLike = Pick<SessionRow, 'ended_at' | 'interruptions'>;

const isMorning = (t: number) => new Date(t).getHours() < MORNING_END_HOUR;
const activityOf = (a: string) => ACTIVITIES[a as Activity] ?? ACTIVITIES.AUTRE;

/** Minutes qui rechargent : pleines jusqu'à 1 h 30, puis de moins en moins. */
export function restfulMinutes(m: number): number {
  return Math.min(m, LONG_AFTER) + LONG_FACTOR * Math.max(0, m - LONG_AFTER);
}

/** Effet d'une distraction déclarée : ce qu'elle rend et ce qu'elle coûte. */
export function distractionImpact(e: Pick<WillpowerEvent, 'kind' | 'activity' | 'minutes'>, morning: boolean): { recharge: number; cost: number } {
  const a = activityOf(e.activity);
  const m = Math.max(0, Number(e.minutes) || 0);
  const mult = morning ? MORNING_MULT : 1;
  const attention = a.attention * m * mult;
  if (e.kind === 'RECHARGE') return { recharge: a.recharge * restfulMinutes(m), cost: attention };
  return { recharge: 0, cost: DRAIN_PER_MIN * m * mult + attention };
}

/** Part de recharge et d'effort d'une quête terminée, selon ses stats et leur difficulté ; `social` = recharge venue de la stat Social. */
export function questImpact(q: QuestLike): { effort: number; recharge: number; social: number } {
  const minutes = Math.max(0, Number(q.estimated_minutes) || 30);
  const tier = q.difficulty_tier ?? 'ROUTINE';
  const entries: Array<[StatKind, DifficultyTier]> = q.stat_tiers
    ? (Object.entries(q.stat_tiers) as Array<[StatKind, DifficultyTier]>)
    : (q.reward_stats ?? []).map(k => [k, tier] as [StatKind, DifficultyTier]);
  const total = entries.reduce((s, [, t]) => s + TIER_WEIGHT[t], 0);
  let recharge = 0, rechargeShare = 0, social = 0;
  for (const [kind, t] of entries) {
    const rate = RECHARGE_STAT_PER_MIN[kind];
    if (!rate || !total) continue;
    const share = TIER_WEIGHT[t] / total;
    const part = minutes * rate * TIER_MULT[t] * share;
    rechargeShare += share;
    recharge += part;
    if (kind === 'SOCIAL') social += part;
  }
  return { effort: minutes * EFFORT_PER_MIN[tier] * (1 - rechargeShare), recharge, social };
}

/**
 * `socialFactor(t)` (batterie sociale) multiplie ce que le temps social rend à la volonté :
 * 0 pour un introverti à plat, 1,25 pour un extraverti à court, 1 sinon.
 */
export function computeWillpower(input: { quests: QuestLike[]; sessions: SessionLike[]; events: WillpowerEvent[]; now?: Date; socialFactor?: (t: number) => number }): Willpower {
  const factor = input.socialFactor ?? (() => 1);
  const now = (input.now ?? new Date()).getTime();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const windowStart = new Date(todayStart); windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
  const inWindow = (t: number) => Number.isFinite(t) && t >= windowStart.getTime() && t <= now;

  type Step = { t: number; delta: number; cat: 'recharge' | 'drain' | 'cost' };
  const steps: Step[] = [];
  for (const q of input.quests) {
    const t = Date.parse(q.completed_at ?? '');
    if (q.status !== 'COMPLETED' || !inWindow(t)) continue;
    const { effort, recharge, social } = questImpact(q);
    const gained = recharge - social + social * factor(t);
    if (effort > 0) steps.push({ t, delta: -effort, cat: 'cost' });
    if (gained > 0) steps.push({ t, delta: gained, cat: 'recharge' });
  }
  for (const s of input.sessions) {
    const t = Date.parse(s.ended_at ?? '');
    if (inWindow(t) && (s.interruptions ?? 0) > 0) steps.push({ t, delta: -DISTRACTION_COST * Math.floor(s.interruptions), cat: 'cost' });
  }
  for (const e of input.events) {
    const t = Date.parse(e.occurred_at);
    if (!inWindow(t)) continue;
    if (e.kind === 'RITUAL') { steps.push({ t, delta: isMorning(t) ? METHOD_MORNING : METHOD_LATER, cat: 'recharge' }); continue; }
    if (e.kind !== 'RECHARGE' && e.kind !== 'DOPAMINE') continue; // batterie sociale : pas la volonté
    const { recharge, cost } = distractionImpact(e, isMorning(t));
    const gained = SOCIAL_ACTIVITIES.includes(e.activity) ? recharge * factor(t) : recharge;
    if (cost > 0) steps.push({ t, delta: -cost, cat: 'drain' });
    if (gained > 0) steps.push({ t, delta: gained, cat: 'recharge' });
  }
  steps.sort((a, b) => a.t - b.t);

  let level = START_LEVEL;
  let dayRecharge = 0;
  const nextMidnight = new Date(windowStart); nextMidnight.setDate(nextMidnight.getDate() + 1);
  const sleepUntil = (t: number) => {
    while (nextMidnight.getTime() <= t) {
      if (level < SLEEP_CEILING) level = Math.min(SLEEP_CEILING, level + SLEEP_GAIN);
      dayRecharge = 0;
      nextMidnight.setDate(nextMidnight.getDate() + 1);
    }
  };
  const today = { recharge: 0, drain: 0, method: false, morningDrain: false };
  for (const s of steps) {
    sleepUntil(s.t);
    let delta = s.delta;
    if (delta > 0) { delta = Math.min(delta, Math.max(0, DAILY_RECHARGE_CAP - dayRecharge)); dayRecharge += delta; }
    level = Math.max(0, Math.min(WILLPOWER_MAX, level + delta));
    if (s.t >= todayStart.getTime()) {
      if (s.cat === 'recharge') today.recharge += delta;
      if (s.cat === 'drain') { today.drain += -delta; if (isMorning(s.t)) today.morningDrain = true; }
    }
  }
  sleepUntil(now);
  today.method = input.events.some(e => e.kind === 'RITUAL' && Date.parse(e.occurred_at) >= todayStart.getTime() && Date.parse(e.occurred_at) <= now);
  today.recharge = Math.round(today.recharge);
  today.drain = Math.round(today.drain);

  const rounded = Math.round(level);
  const state: WillpowerState = rounded >= 70 ? 'charge' : rounded >= 40 ? 'stable' : rounded >= 20 ? 'bas' : 'vide';
  return { level: rounded, state, today, morning: isMorning(now) };
}

/** Un ou deux conseils, selon le moment de la journée et la jauge. */
export function willpowerAdvice(w: Willpower): string[] {
  const out: string[] = [];
  if (w.today.morningDrain) out.push('Ce qui vide coûte double le matin : il entame la volonté avant la première vraie tâche. Demain, téléphone loin du lit.');
  else if (w.morning && !w.today.method) out.push('L’aube décide de la journée : commence par la méthode 20/20/20 (bouger, réfléchir, apprendre) plutôt que par ton téléphone.');
  if (w.state === 'charge') out.push('Volonté chargée : c’est le moment d’attaquer ce qui compte vraiment.');
  else if (w.state === 'stable') out.push('Garde ta concentration pour ce qui fait gagner ta journée. Entre deux blocs, choisis une distraction qui repose (marche, lecture), pas une qui aspire (partie classée, scroll).');
  else out.push('Recharge-la par une bonne distraction : lecture, marche, sport, une rencontre. Einstein allait discuter au café ou faire du bateau ; Franklin alternait concentration et activités variées.');
  return out;
}
