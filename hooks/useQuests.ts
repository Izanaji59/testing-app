'use client';

import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Quest } from '@/lib/types';
import { localDayDeadline, questsForToday } from '@/lib/quest-review';

async function fetchAllQuests(): Promise<Quest[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];

  // Une lecture ne doit jamais appliquer de pénalité. Le bilan demande
  // une réponse explicite avant de traiter une échéance manquée.

  const { data, error } = await sb
    .from('quests')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quest[];
}

async function fetchTodayQuests(): Promise<Quest[]> {
  const all = await fetchAllQuests();
  return questsForToday(all);
}

export function useQuests() {
  const { data, error } = useSWR('quests', fetchAllQuests, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  useEffect(() => {
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    supabase().auth.getUser().then(({ data: auth }) => {
      if (!mounted || !auth.user) return;
      const sb = supabase();
      channel = sb
        .channel(`quests_${auth.user.id}_${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quests', filter: `user_id=eq.${auth.user.id}` },
          () => { mutate('quests'); mutate('quests-today'); })
        .subscribe();
    });

    return () => {
      mounted = false;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (channel) supabase().removeChannel(channel);
    };
  }, []);

  return {
    quests: data ?? [],
    error,
    refresh: () => mutate('quests'),
  };
}

export function useTodayQuests() {
  const { data } = useSWR('quests-today', fetchTodayQuests, {
    refreshInterval: 60_000,
  });
  return data ?? [];
}

/** Création rapide pour aujourd'hui, sauf échéance explicitement choisie (null = aucune). */
export async function createQuestFlash(input: {
  title: string;
  project_id: string | null;
  estimated_minutes?: number;
  difficulty_tier?: import('@/lib/types').DifficultyTier;
  reward_stats?: import('@/lib/types').StatKind[];
  reward_eur?: number;
  due_at?: string | null;
}) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');

  // Fixer la journée au clic, avant les éventuels allers-retours réseau.
  const dueAt = input.due_at === undefined ? localDayDeadline() : input.due_at;
  if (dueAt !== null && !Number.isFinite(Date.parse(dueAt))) throw new Error('Échéance invalide');

  // Si pas de projet, on cherche/crée un projet "Quêtes flash"
  let projectId = input.project_id;
  if (!projectId) {
    const { data: flashProject, error: lookupError } = await sb
      .from('projects')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('title', 'Quêtes flash')
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (flashProject) {
      projectId = flashProject.id;
    } else {
      const { data: created, error: projectError } = await sb
        .from('projects')
        .insert({
          user_id: auth.user.id,
          type: 'OPERATION',
          title: 'Quêtes flash',
          description: 'Quêtes ad hoc sans projet parent dédié',
          status: 'ACTIVE',
        })
        .select('id')
        .single();
      if (projectError) throw projectError;
      if (!created) throw new Error('Le projet de la quête n’a pas pu être créé');
      projectId = created.id;
    }
  }

  const result = await sb.from('quests').insert({
    user_id: auth.user.id,
    project_id: projectId,
    title: input.title,
    status: 'PENDING',
    estimated_minutes: input.estimated_minutes ?? 30,
    difficulty_tier: input.difficulty_tier ?? 'ROUTINE',
    reward_stats: input.reward_stats?.length ? input.reward_stats : null,
    reward_eur: input.reward_eur ?? 0,
    is_flash: input.project_id === null,
    due_at: dueAt,
  });
  if (result.error) throw result.error;
  await Promise.all([mutate('quests'), mutate('quests-today')]);
  return result;
}

/** Opt-in repair: date one existing undated quest from today, never backfill old days. */
export async function planUndatedQuestToday(questId: string) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');
  const { data, error } = await sb.from('quests')
    .update({ due_at: localDayDeadline() })
    .eq('id', questId).eq('user_id', auth.user.id)
    .in('status', ['PENDING', 'IN_PROGRESS']).is('due_at', null)
    .select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Cette quête a changé. Actualise la liste avant de la planifier.');
  await Promise.all([mutate('quests'), mutate('quests-today')]);
}
