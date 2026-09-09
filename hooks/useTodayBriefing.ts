'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { computeSignals } from '@/lib/ai/signals';
import { buildBriefingPayload } from '@/lib/ai/adaptations';
import type { Briefing, SessionRow, XpEvent, Project, MissionTemplate } from '@/lib/types';

async function generateTodayBriefing(userId: string): Promise<Briefing | null> {
  const sb = supabase();
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const since35d = new Date(Date.now() - 35 * 86400000).toISOString();

  const [{ data: sessions }, { data: events }, { data: projects }, { data: stats }, { data: templates }, { data: profile }] =
    await Promise.all([
      sb.from('sessions').select('*').eq('user_id', userId).gte('started_at', since30d),
      sb.from('xp_events').select('*').eq('user_id', userId).gte('created_at', since35d),
      sb.from('projects').select('*').eq('user_id', userId),
      sb.from('stats').select('level').eq('user_id', userId),
      sb.from('mission_templates').select('*').eq('user_id', userId),
      sb.from('profiles').select('active_boss_id, active_raid_id').eq('user_id', userId).single(),
    ]);

  const signals = computeSignals({
    sessions: (sessions ?? []) as SessionRow[],
    events: (events ?? []) as XpEvent[],
    projects: (projects ?? []) as Project[],
    stats: (stats ?? []) as Array<{ level: number }>,
  });

  const activeProjectId = profile?.active_boss_id ?? profile?.active_raid_id ?? null;
  const activeProject = activeProjectId
    ? (projects ?? []).find((p: Project) => p.id === activeProjectId)
    : null;

  const payload = buildBriefingPayload({
    mission: activeProject
      ? { id: activeProject.id, title: activeProject.title, progress_pct: activeProject.progress_pct }
      : undefined,
    signals,
    templates: (templates ?? []) as MissionTemplate[],
  });

  const { data: created } = await sb
    .from('briefings')
    .insert({ user_id: userId, kind: 'MORNING', payload })
    .select('*')
    .single();

  return (created ?? null) as Briefing | null;
}

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

  if (data) return data as Briefing;

  // Aucun briefing généré aujourd'hui → on le calcule maintenant.
  return generateTodayBriefing(auth.user.id);
}

export function useTodayBriefing() {
  const { data } = useSWR('briefing-today', fetchTodayBriefing, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  });
  return data ?? null;
}
