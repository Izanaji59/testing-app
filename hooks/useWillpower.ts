'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import { useQuests } from '@/hooks/useQuests';
import { useProfile } from '@/hooks/useProfile';
import { computeWillpower, WINDOW_DAYS, type WillpowerEvent } from '@/lib/engine/willpower';
import { computeSocialBattery, socialProfileOf, socialWillpowerFactor, type SocialProfile } from '@/lib/engine/socialBattery';

/** Déclarations et distractions des 14 derniers jours (les jauges se rejouent sur cette fenêtre). */
async function fetchWillpowerData() {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { events: [] as WillpowerEvent[], sessions: [] };
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - WINDOW_DAYS);
  const [events, sessions] = await Promise.all([
    sb.from('willpower_events').select('id,kind,activity,minutes,occurred_at').eq('user_id', auth.user.id).gte('occurred_at', since.toISOString()).order('occurred_at'),
    sb.from('sessions').select('ended_at,interruptions').eq('user_id', auth.user.id).gte('ended_at', since.toISOString()).gt('interruptions', 0),
  ]);
  if (events.error) throw events.error;
  if (sessions.error) throw sessions.error;
  return { events: (events.data ?? []) as WillpowerEvent[], sessions: sessions.data ?? [] };
}

/**
 * Réservoir de volonté et batterie sociale, rejoués à partir des quêtes, des distractions
 * et des déclarations. La batterie se calcule d'abord : aux extrêmes, elle module ce que
 * le temps social rend à la volonté.
 */
export function useWillpower() {
  const { quests } = useQuests();
  const { profile } = useProfile();
  const { data, error } = useSWR('willpower', fetchWillpowerData, { refreshInterval: 60_000, revalidateOnFocus: true });
  const events = data?.events ?? [];
  const { profile: socialProfile, fromMbti } = socialProfileOf(profile?.social_profile, profile?.mbti);
  const social = computeSocialBattery({ profile: socialProfile, quests, events });
  return {
    willpower: computeWillpower({ quests, sessions: data?.sessions ?? [], events, socialFactor: socialWillpowerFactor(social) }),
    social,
    socialFromMbti: fromMbti,
    events,
    ready: data !== undefined,
    error,
  };
}

/** Déclare une distraction, la méthode 20/20/20, ou un mouvement de la batterie sociale. */
export async function declareWillpower(input: { kind: WillpowerEvent['kind']; activity: WillpowerEvent['activity']; minutes?: number; occurred_at?: string }) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');
  const { error } = await sb.from('willpower_events').insert({ user_id: auth.user.id, ...input });
  if (error) throw error;
  await mutate('willpower');
}

export async function cancelWillpower(id: string) {
  const { error } = await supabase().from('willpower_events').delete().eq('id', id);
  if (error) throw error;
  await mutate('willpower');
}

/** Profil social choisi par le joueur (sinon déduit du MBTI). */
export async function setSocialProfile(value: SocialProfile) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');
  const { error } = await sb.from('profiles').update({ social_profile: value }).eq('user_id', auth.user.id);
  if (error) throw error;
  await mutate('profile-bundle');
}
