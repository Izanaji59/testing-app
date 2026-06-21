'use client';

import useSWR, { mutate } from 'swr';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Profile, Stat, Specialization, Skill } from '@/lib/types';

async function fetchProfileBundle() {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { profile: null, stats: [], specializations: [], skills: [] };
  const uid = auth.user.id;

  const [{ data: profile }, { data: stats }, { data: specs }, { data: skills }] = await Promise.all([
    sb.from('profiles').select('*').eq('user_id', uid).single(),
    sb.from('stats').select('*').eq('user_id', uid).order('kind'),
    sb.from('specializations').select('*').eq('user_id', uid),
    sb.from('skills').select('*').eq('user_id', uid),
  ]);

  return {
    profile: (profile ?? null) as Profile | null,
    stats: (stats ?? []) as Stat[],
    specializations: (specs ?? []) as Specialization[],
    skills: (skills ?? []) as Skill[],
  };
}

export function useProfile() {
  const { data } = useSWR('profile-bundle', fetchProfileBundle, {
    refreshInterval: 20_000,
    revalidateOnFocus: true,
  });

  // Subscription realtime sur profiles → revalide à chaque update
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

 useEffect(() => {
  if (!userId) return;

  const sb = supabase();

  const channelName = `profile_${userId}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;

  const channel = sb
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${userId}`,
      },
      () => mutate('profile-bundle')
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stats',
        filter: `user_id=eq.${userId}`,
      },
      () => mutate('profile-bundle')
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'specializations',
        filter: `user_id=eq.${userId}`,
      },
      () => mutate('profile-bundle')
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'skills',
        filter: `user_id=eq.${userId}`,
      },
      () => mutate('profile-bundle')
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}, [userId]);

  return {
    profile: data?.profile ?? null,
    stats: data?.stats ?? [],
    specializations: data?.specializations ?? [],
    skills: data?.skills ?? [],
    refresh: () => mutate('profile-bundle'),
  };
}
