'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

/**
 * Total exact des gains (€) — jamais exposé à d'autres joueurs, propriétaire
 * uniquement (RLS). C'est la QUÊTE qui rapporte, pas le projet : un projet
 * n'a qu'un objectif hebdomadaire (weekly_target_eur), pas un gain propre.
 */
async function fetchTotalRevenue(): Promise<number> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return 0;

  const { data: quests } = await sb
    .from('quests')
    .select('reward_eur')
    .eq('user_id', auth.user.id)
    .eq('status', 'COMPLETED');

  return (quests ?? []).reduce((a, r) => a + (r.reward_eur ?? 0), 0);
}

export function useRevenue() {
  const { data } = useSWR('revenue-total', fetchTotalRevenue, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return data ?? 0;
}
