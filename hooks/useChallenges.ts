'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import type { StatKind } from '@/lib/types';

export type Challenge = {
  id: string; title: string; description: string; daily_goal: string; stat_kind: StatKind;
  duration_days: number; minutes: number; mine: boolean; official: boolean; members: number;
  joined_at: string | null; project_id: string | null;
};
export type BoardRow = { display_name: string; joined_at: string; days_done: number; days_total: number; is_me: boolean };

async function fetchChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase().rpc('get_challenges');
  if (error) throw error;
  return (data ?? []) as Challenge[];
}

export function useChallenges() {
  const { data, error, isLoading } = useSWR('challenges', fetchChallenges);
  return { challenges: data ?? [], error, loading: isLoading, refresh: () => mutate('challenges') };
}

/** Journée locale [minuit, 23:59:59.999] : la quête du jour d'un défi est datée de sa fin. */
export function localDayBounds(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Crée (côté serveur) la quête du jour de chaque défi en cours ; renvoie le nombre de quêtes créées. */
export async function ensureChallengeQuests(): Promise<number> {
  const { start, end } = localDayBounds();
  const { data, error } = await supabase().rpc('ensure_challenge_quests', { p_day_start: start, p_day_end: end });
  if (error) throw error;
  const created = Number(data) || 0;
  if (created > 0) await Promise.allSettled(['quests', 'quests-today', 'projects'].map(k => mutate(k)));
  return created;
}

export async function joinChallenge(id: string) {
  const { error } = await supabase().rpc('join_challenge', { p_challenge: id });
  if (error) throw error;
  await ensureChallengeQuests();
  await Promise.allSettled(['challenges', 'projects', 'quests', 'quests-today'].map(k => mutate(k)));
}

export async function leaveChallenge(id: string, userId: string) {
  const { error } = await supabase().from('challenge_members').delete().eq('challenge_id', id).eq('user_id', userId);
  if (error) throw error;
  await mutate('challenges');
}

export async function createChallenge(input: { title: string; description: string; daily_goal: string; stat_kind: StatKind; duration_days: number; minutes: number }, userId: string) {
  const { error } = await supabase().from('challenges').insert({ ...input, created_by: userId });
  if (error) throw error;
  await mutate('challenges');
}

export async function deleteChallenge(id: string) {
  const { data, error } = await supabase().from('challenges').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('D’autres joueurs ont rejoint ce défi : il ne peut plus être supprimé.');
  await mutate('challenges');
}

export async function fetchBoard(id: string): Promise<BoardRow[]> {
  const { data, error } = await supabase().rpc('get_challenge_board', { p_challenge: id });
  if (error) throw error;
  return (data ?? []) as BoardRow[];
}
