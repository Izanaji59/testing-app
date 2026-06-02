'use client';

import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/lib/types';

async function fetchProjects(): Promise<Project[]> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from('projects')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as Project[];
}

export function useProjects() {
  const { data } = useSWR('projects', fetchProjects, {
    refreshInterval: 30_000,
  });

  useEffect(() => {
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    supabase().auth.getUser().then(({ data: auth }) => {
      if (!mounted || !auth.user) return;
      const sb = supabase();
      channel = sb
        .channel(`projects_${auth.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${auth.user.id}` },
          () => mutate('projects'))
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase().removeChannel(channel);
    };
  }, []);

  return {
    projects: data ?? [],
    refresh: () => mutate('projects'),
  };
}

export function useActiveProjects() {
  const { projects } = useProjects();
  return projects.filter(p => p.status === 'ACTIVE');
}
