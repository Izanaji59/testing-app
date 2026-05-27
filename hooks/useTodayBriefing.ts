'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import type { Briefing } from '@/lib/types';

async function fetchTodayBriefing(): Promise<Briefing | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from('briefings')
    .select('*')
    .eq('user_id', auth.user.id)
    .gte('generated_at', `${today}T00:00:00Z`)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as Briefing | null;
}

export function useTodayBriefing() {
  const { data } = useSWR('briefing-today', fetchTodayBriefing, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  });
  return data ?? null;
}
