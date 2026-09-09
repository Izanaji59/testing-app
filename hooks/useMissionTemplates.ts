'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import type { MissionTemplate, StatKind, DifficultyTier } from '@/lib/types';

async function fetchMissionTemplates(): Promise<MissionTemplate[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from('mission_templates')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as MissionTemplate[];
}

export function useMissionTemplates() {
  const { data } = useSWR('mission-templates', fetchMissionTemplates, {
    revalidateOnFocus: true,
  });
  return {
    templates: data ?? [],
    refresh: () => mutate('mission-templates'),
  };
}

export async function createMissionTemplate(input: {
  title: string;
  description?: string;
  stat_kind: StatKind;
  difficulty_tier?: DifficultyTier;
  estimated_minutes?: number;
}) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');

  await sb.from('mission_templates').insert({
    user_id: auth.user.id,
    title: input.title,
    description: input.description || null,
    stat_kind: input.stat_kind,
    difficulty_tier: input.difficulty_tier ?? 'ROUTINE',
    estimated_minutes: input.estimated_minutes ?? 30,
  });
  mutate('mission-templates');
}

export async function deleteMissionTemplate(id: string) {
  await supabase().from('mission_templates').delete().eq('id', id);
  mutate('mission-templates');
}
