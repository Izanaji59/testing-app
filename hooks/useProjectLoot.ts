'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';

export type ProjectLoot = { earned_xp: number; loot_xp: number; rate: number; paid_xp: number | null };

async function fetchLoot(): Promise<Record<string, ProjectLoot>> {
  const { data, error } = await supabase().rpc('get_project_loot');
  if (error) throw error;
  const out: Record<string, ProjectLoot> = {};
  for (const r of (data ?? []) as Array<ProjectLoot & { project_id: string }>) {
    out[r.project_id] = { earned_xp: Number(r.earned_xp), loot_xp: Number(r.loot_xp), rate: Number(r.rate), paid_xp: r.paid_xp === null ? null : Number(r.paid_xp) };
  }
  return out;
}

/** Butin en réserve de chaque donjon (calculé par get_project_loot, migration 0023). */
export function useProjectLoot() {
  const { data, error } = useSWR('project-loot', fetchLoot, { refreshInterval: 30_000, revalidateOnFocus: true });
  return { loot: data ?? {}, ready: data !== undefined, error };
}

/** Termine un donjon : le butin est versé par le trigger SQL, une seule fois. */
export async function completeProject(projectId: string) {
  const { data, error } = await supabase().from('projects')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', projectId).in('status', ['ACTIVE', 'PLANNED', 'PAUSED'])
    .select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Ce donjon a changé. Actualise la page.');
  await Promise.all([mutate('projects'), mutate('project-loot'), mutate('profile-bundle')]);
}
