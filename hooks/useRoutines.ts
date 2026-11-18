'use client';

// Quêtes quotidiennes d'un donjon (routines, migration 0025).
// Une routine émet chaque jour une quête datée de 23 h 59 (heure locale), du jour de son
// émission jusqu'à sa fin de transmission : sa date, sinon celle du donjon, sinon jusqu'à l'arrêt.

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import { localDayBounds } from '@/hooks/useChallenges';
import type { DifficultyTier, QuestRoutine, StatKind, StatTiers } from '@/lib/types';

async function fetchRoutines(): Promise<QuestRoutine[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await sb.from('quest_routines').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuestRoutine[];
}

export function useRoutines() {
  const { data, error } = useSWR('routines', fetchRoutines, { revalidateOnFocus: true });
  return { routines: data ?? [], error, refresh: () => mutate('routines') };
}

/** Émet (côté serveur) la quête du jour de chaque routine active ; renvoie le nombre de quêtes créées. */
export async function ensureRoutineQuests(): Promise<number> {
  const { start, end } = localDayBounds();
  const { data, error } = await supabase().rpc('ensure_routine_quests', { p_day_start: start, p_day_end: end });
  if (error) throw error;
  const created = Number(data) || 0;
  if (created > 0) await Promise.allSettled(['quests', 'quests-today', 'projects'].map(k => mutate(k)));
  return created;
}

export async function createRoutine(input: {
  project_id: string;
  title: string;
  estimated_minutes: number;
  difficulty_tier: DifficultyTier;
  reward_stats: StatKind[];
  stat_tiers: StatTiers | null;
  /** Fin de transmission propre (fin de journée) ; null = celle du donjon. */
  ends_at: string | null;
}) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');
  const { error } = await sb.from('quest_routines').insert({
    ...input,
    user_id: auth.user.id,
    reward_stats: input.reward_stats.length ? input.reward_stats : null,
    starts_at: new Date().toISOString(),
  });
  if (error) throw error;
  await mutate('routines');
  // Émission immédiate de la quête du jour.
  await ensureRoutineQuests();
}

/** Arrête la répétition : les quêtes déjà émises restent, plus aucune nouvelle. */
export async function stopRoutine(id: string) {
  const { data, error } = await supabase().from('quest_routines').update({ active: false }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Cette quête quotidienne n’a pas pu être arrêtée.');
  await mutate('routines');
}
