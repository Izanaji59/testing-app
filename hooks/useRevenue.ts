'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

async function fetchTotalRevenue(): Promise<number> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return 0;
  const uid = auth.user.id;

  const [{ data: quests }, { data: projects }] = await Promise.all([
    sb.from('quests').select('reward_eur').eq('user_id', uid).eq('status', 'COMPLETED'),
    sb.from('projects').select('reward_eur').eq('user_id', uid).eq('status', 'COMPLETED'),
  ]);

  const sum = (rows: { reward_eur: number }[] | null) =>
    (rows ?? []).reduce((a, r) => a + (r.reward_eur ?? 0), 0);

  return sum(quests) + sum(projects);
}

/** Total exact des gains (€) — jamais exposé à d'autres joueurs, propriétaire uniquement (RLS). */
export function useRevenue() {
  const { data } = useSWR('revenue-total', fetchTotalRevenue, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return data ?? 0;
}
