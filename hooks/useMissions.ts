'use client';

import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Mission } from '@/lib/types';

const KEY = 'missions';

async function fetchMissions(): Promise<Mission[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from('missions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .order('starts_at', { ascending: false });
  return (data ?? []) as Mission[];
}

export function useMissions() {
  const { data } = useSWR(KEY, fetchMissions, { refreshInterval: 30_000 });

  useEffect(() => {
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    supabase().auth.getUser().then(({ data: auth }) => {
      if (!mounted || !auth.user) return;
      const sb = supabase();
      channel = sb
        .channel(`missions_${auth.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${auth.user.id}` },
          () => mutate(KEY))
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase().removeChannel(channel);
    };
  }, []);

  return {
    missions: data ?? [],
    refresh: () => mutate(KEY),
  };
}

export async function createMission(input: {
  title: string;
  horizon: Mission['horizon'];
  starts_at?: string;
  ends_at?: string | null;
}) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');

  return sb.from('missions').insert({
    user_id: auth.user.id,
    title: input.title,
    horizon: input.horizon,
    starts_at: input.starts_at ?? new Date().toISOString(),
    ends_at: input.ends_at ?? null,
  });
}
