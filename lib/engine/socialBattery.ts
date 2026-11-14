// lib/engine/socialBattery.ts — Batterie sociale, à côté du réservoir de volonté.
// Indépendante de la volonté : une même soirée peut vider la batterie d'un introverti
// et recharger sa volonté. Elle bouge toute seule avec le temps social déjà déclaré
// (rencontres, networking, quêtes Social), selon le profil ; le joueur la règle aussi au
// ressenti (« ça m'a coûté », « je me suis rechargé »). Un extraverti sans contact depuis
// plus d'une journée la voit baisser doucement. Aucun effet sur l'XP. Aucun import à l'exécution.

import type { DifficultyTier, Quest, StatKind, StatTiers } from '@/lib/types';
import type { WillpowerEvent } from './willpower';

export type SocialProfile = 'INTROVERTI' | 'EXTRAVERTI' | 'AMBIVERTI';
export const SOCIAL_PROFILES: Record<SocialProfile, { label: string; text: string }> = {
  INTROVERTI: { label: 'Introverti', text: 'Le temps avec les autres te coûte, le temps seul te recharge.' },
  EXTRAVERTI: { label: 'Extraverti', text: 'Les autres te rechargent ; l’isolement te vide doucement.' },
  AMBIVERTI: { label: 'Entre les deux', text: 'Un peu de monde te recharge, trop te vide.' },
};

export const SOCIAL_START = 70;
export const SOCIAL_WINDOW_DAYS = 14;
export const SPENT: Record<'UN_PEU' | 'BEAUCOUP', number> = { UN_PEU: 15, BEAUCOUP: 35 };
export const RECHARGED: Record<'UN_PEU' | 'MOITIE' | 'COMPLET', number> = { UN_PEU: 20, MOITIE: 50, COMPLET: 100 };
/** Baisse par jour sans contact social, au-delà de 24 h. */
export const ISOLATION: Record<SocialProfile, number> = { INTROVERTI: 0, EXTRAVERTI: 10, AMBIVERTI: 5 };
const SOCIAL_ACTIVITIES = ['RENCONTRE', 'NETWORKING'];
const TIER_WEIGHT: Record<DifficultyTier, number> = { TRIVIAL: 15, ROUTINE: 35, NOTABLE: 80, HARD: 180, LEGENDARY: 400 };
const DAY = 86_400_000;

/** Profil choisi, sinon déduit du MBTI (première lettre I ou E), sinon « entre les deux ». */
export function socialProfileOf(explicit: string | null | undefined, mbti: string | null | undefined): { profile: SocialProfile; fromMbti: boolean } {
  if (explicit === 'INTROVERTI' || explicit === 'EXTRAVERTI' || explicit === 'AMBIVERTI') return { profile: explicit, fromMbti: false };
  const first = (mbti ?? '').trim().toUpperCase()[0];
  if (first === 'I') return { profile: 'INTROVERTI', fromMbti: true };
  if (first === 'E') return { profile: 'EXTRAVERTI', fromMbti: true };
  return { profile: 'AMBIVERTI', fromMbti: false };
}

/** Effet d'un temps social sur la batterie, selon le profil. */
export function socialDelta(profile: SocialProfile, activity: string, minutes: number): number {
  const m = Math.max(0, Number(minutes) || 0);
  if (profile === 'INTROVERTI') return -(activity === 'NETWORKING' ? 0.5 : 0.4) * m;
  if (profile === 'EXTRAVERTI') return 0.3 * m;
  return m <= 60 ? 0.15 * m : 9 - 0.25 * (m - 60);
}

type QuestLike = Pick<Quest, 'status' | 'difficulty_tier' | 'estimated_minutes' | 'completed_at' | 'reward_stats'> & { stat_tiers?: StatTiers | null };

/** Minutes sociales d'une quête terminée : sa durée × la part de la stat Social. */
export function questSocialMinutes(q: QuestLike): number {
  const tier = q.difficulty_tier ?? 'ROUTINE';
  const entries: Array<[StatKind, DifficultyTier]> = q.stat_tiers
    ? (Object.entries(q.stat_tiers) as Array<[StatKind, DifficultyTier]>)
    : (q.reward_stats ?? []).map(k => [k, tier] as [StatKind, DifficultyTier]);
  const total = entries.reduce((s, [, t]) => s + TIER_WEIGHT[t], 0);
  const social = entries.filter(([k]) => k === 'SOCIAL').reduce((s, [, t]) => s + TIER_WEIGHT[t], 0);
  return total ? (Math.max(0, Number(q.estimated_minutes) || 30) * social) / total : 0;
}

export type SocialState = 'pleine' | 'correcte' | 'basse' | 'plat';
export type SocialBattery = {
  level: number;
  state: SocialState;
  profile: SocialProfile;
  today: { spent: number; recharged: number };
  /** Niveau après chaque changement, pour savoir où en était la batterie à un instant donné. */
  timeline: Array<{ t: number; level: number }>;
};

export function computeSocialBattery(input: { profile: SocialProfile; quests: QuestLike[]; events: WillpowerEvent[]; now?: Date }): SocialBattery {
  const { profile } = input;
  const now = (input.now ?? new Date()).getTime();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const windowStart = new Date(todayStart); windowStart.setDate(windowStart.getDate() - (SOCIAL_WINDOW_DAYS - 1));
  const inWindow = (t: number) => Number.isFinite(t) && t >= windowStart.getTime() && t <= now;

  type Step = { t: number; delta?: number; full?: boolean; contact: boolean };
  const steps: Step[] = [];
  let firstActivity = Infinity;
  for (const e of input.events) {
    const t = Date.parse(e.occurred_at);
    if (!inWindow(t)) continue;
    firstActivity = Math.min(firstActivity, t);
    if ((e.kind === 'RECHARGE' || e.kind === 'DOPAMINE') && SOCIAL_ACTIVITIES.includes(e.activity)) steps.push({ t, delta: socialDelta(profile, e.activity, e.minutes), contact: true });
    else if (e.kind === 'SOCIAL_SPENT') steps.push({ t, delta: -(SPENT[e.activity as keyof typeof SPENT] ?? SPENT.UN_PEU), contact: false });
    else if (e.kind === 'SOCIAL_RECHARGE') steps.push(e.activity === 'COMPLET' ? { t, full: true, contact: false } : { t, delta: RECHARGED[e.activity as keyof typeof RECHARGED] ?? RECHARGED.UN_PEU, contact: false });
  }
  for (const q of input.quests) {
    const t = Date.parse(q.completed_at ?? '');
    if (q.status !== 'COMPLETED' || !inWindow(t)) continue;
    firstActivity = Math.min(firstActivity, t);
    const m = questSocialMinutes(q);
    if (m > 0) steps.push({ t, delta: socialDelta(profile, 'RENCONTRE', m), contact: true });
  }
  steps.sort((a, b) => a.t - b.t);

  let level = SOCIAL_START;
  // L'isolement ne se compte qu'à partir de la première activité enregistrée : un nouveau
  // joueur n'est pas « isolé » simplement parce qu'il n'a encore rien déclaré.
  let lastContact = Number.isFinite(firstActivity) ? firstActivity : null;
  const nextMidnight = new Date(windowStart); nextMidnight.setDate(nextMidnight.getDate() + 1);
  const timeline: SocialBattery['timeline'] = [];
  const pass = (t: number) => {
    while (nextMidnight.getTime() <= t) {
      if (lastContact !== null && lastContact <= nextMidnight.getTime() && nextMidnight.getTime() - lastContact > DAY && ISOLATION[profile] > 0) {
        level = Math.max(0, level - ISOLATION[profile]);
        timeline.push({ t: nextMidnight.getTime(), level });
      }
      nextMidnight.setDate(nextMidnight.getDate() + 1);
    }
  };
  const today = { spent: 0, recharged: 0 };
  for (const s of steps) {
    pass(s.t);
    const before = level;
    level = s.full ? 100 : Math.max(0, Math.min(100, level + (s.delta ?? 0)));
    if (s.contact) lastContact = s.t;
    if (s.t >= todayStart.getTime()) { if (level < before) today.spent += before - level; else today.recharged += level - before; }
    timeline.push({ t: s.t, level });
  }
  pass(now);
  const rounded = Math.round(level);
  const state: SocialState = rounded >= 70 ? 'pleine' : rounded >= 40 ? 'correcte' : rounded >= 20 ? 'basse' : 'plat';
  return { level: rounded, state, profile, today: { spent: Math.round(today.spent), recharged: Math.round(today.recharged) }, timeline };
}

/** Niveau de la batterie juste avant l'instant t. */
export function socialLevelAt(b: SocialBattery, t: number): number {
  let level = SOCIAL_START;
  for (const p of b.timeline) { if (p.t >= t) break; level = p.level; }
  return level;
}

/**
 * Lien avec la volonté, seulement aux extrêmes : un introverti à plat ne recharge plus sa
 * volonté en voyant du monde ; un extraverti à court la recharge un peu plus en sortant.
 */
export function socialWillpowerFactor(b: SocialBattery): (t: number) => number {
  return (t: number) => {
    const level = socialLevelAt(b, t);
    if (b.profile === 'INTROVERTI' && level < 20) return 0;
    if (b.profile === 'EXTRAVERTI' && level < 40) return 1.25;
    return 1;
  };
}

export function socialAdvice(b: SocialBattery): string {
  const low = b.state === 'basse' || b.state === 'plat';
  if (b.profile === 'INTROVERTI') return low
    ? 'Batterie sociale basse : bloque un vrai temps seul avant ton prochain rendez-vous. À plat, même une bonne soirée coûte.'
    : b.state === 'pleine' ? 'Batterie pleine : bon moment pour un rendez-vous, un appel, du networking.' : 'Garde un temps seul dans ta journée pour la faire remonter.';
  if (b.profile === 'EXTRAVERTI') return low
    ? 'Appelle quelqu’un, sors voir du monde : c’est ta recharge.'
    : b.state === 'pleine' ? 'Tu es chargé par les autres : profites-en pour un bloc de travail seul.' : 'Prévois un moment avec quelqu’un aujourd’hui.';
  return low
    ? 'Rééquilibre : un moment seul si tu as trop donné, un moment avec les autres si tu t’es isolé.'
    : 'Équilibre tenu : un peu de monde, un peu de calme.';
}
