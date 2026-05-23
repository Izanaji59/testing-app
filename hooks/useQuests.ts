'use client';

import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Quest } from '@/lib/types';

async function fetchAllQuests(): Promise<Quest[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from('quests')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as Quest[];
}

async function fetchTodayQuests(): Promise<Quest[]> {
  const all = await fetchAllQuests();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter(q =>
    (q.status === 'PENDING' || q.status === 'IN_PROGRESS') &&
    (!q.due_at || q.due_at.slice(0, 10) <= today)
  );
}

export function useQuests() {
  const { data } = useSWR('quests', fetchAllQuests, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  useEffect(() => {
    let mounted = true;
    supabase().auth.getUser().then(({ data: auth }) => {
      if (!mounted || !auth.user) return;
      const sb = supabase();
      const channel = sb
        .channel(`quests_${auth.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quests', filter: `user_id=eq.${auth.user.id}` },
          () => mutate('quests'))
        .subscribe();
      return () => { sb.removeChannel(channel); };
    });
    return () => { mounted = false; };
  }, []);

  return {
    quests: data ?? [],
    refresh: () => mutate('quests'),
  };
}

export function useTodayQuests() {
  const { data } = useSWR('quests-today', fetchTodayQuests, {
    refreshInterval: 60_000,
  });
  return data ?? [];
}

/** Création rapide de quête (flash si pas de projet). */
export async function createQuestFlash(input: {
  title: string;
  project_id: string | null;
  estimated_minutes?: number;
  difficulty_tier?: import('@/lib/types').DifficultyTier;
  reward_stats?: import('@/lib/types').StatKind[];
}) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');

  // Si pas de projet, on cherche/crée un projet "Quêtes flash"
  let projectId = input.project_id;
  if (!projectId) {
    const { data: flashProject } = await sb
      .from('projects')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('title', 'Quêtes flash')
      .maybeSingle();

    if (flashProject) {
      projectId = flashProject.id;
    } else {
      const { data: created } = await sb
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
      projectId = created!.id;
    }
  }

  return sb.from('quests').insert({
    user_id: auth.user.id,
    project_id: projectId,
    title: input.title,
    status: 'PENDING',
    estimated_minutes: input.estimated_minutes ?? 30,
    difficulty_tier: input.difficulty_tier ?? 'ROUTINE',
    reward_stats: input.reward_stats?.length ? input.reward_stats : null,
    is_flash: input.project_id === null,
  });
}
