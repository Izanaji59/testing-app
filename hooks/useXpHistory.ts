'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { XpEvent } from '@/lib/types';

const PAGE_SIZE = 25;

export type XpHistoryEntry = XpEvent & {
  questTitle: string | null;
  projectTitle: string | null;
};

async function fetchXpHistoryPage(page: number): Promise<{ entries: XpHistoryEntry[]; hasMore: boolean }> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { entries: [], hasMore: false };

  const { data: events } = await sb
    .from('xp_events')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const rows = (events ?? []) as XpEvent[];
  const refIds = Array.from(new Set(rows.map(e => e.source_ref_id).filter((id): id is string => !!id)));

  if (refIds.length === 0) {
    return { entries: rows.map(e => ({ ...e, questTitle: null, projectTitle: null })), hasMore: rows.length === PAGE_SIZE };
  }

  // source_ref_id pointe soit vers une quête (QUEST_COMPLETE, et REVENU sur récompense),
  // soit directement vers un projet (ADJUSTMENT sur projet terminé) — on tente les deux.
  const { data: quests } = await sb.from('quests').select('id, title, project_id').in('id', refIds);
  const questMap = new Map((quests ?? []).map(q => [q.id, q]));

  const projectIds = new Set<string>();
  for (const id of refIds) {
    const q = questMap.get(id);
    if (q?.project_id) projectIds.add(q.project_id);
    else projectIds.add(id);
  }

  const { data: projects } = await sb.from('projects').select('id, title').in('id', Array.from(projectIds));
  const projectMap = new Map((projects ?? []).map(p => [p.id, p.title as string]));

  const entries = rows.map(e => {
    const q = e.source_ref_id ? questMap.get(e.source_ref_id) : undefined;
    if (q) {
      return { ...e, questTitle: q.title as string, projectTitle: q.project_id ? (projectMap.get(q.project_id) ?? null) : null };
    }
    return { ...e, questTitle: null, projectTitle: e.source_ref_id ? (projectMap.get(e.source_ref_id) ?? null) : null };
  });

  return { entries, hasMore: rows.length === PAGE_SIZE };
}

export function useXpHistory() {
  const [entries, setEntries] = useState<XpHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const { entries: next, hasMore: more } = await fetchXpHistoryPage(page);
      setEntries(prev => [...prev, ...next]);
      setHasMore(more);
      setPage(p => p + 1);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return { entries, hasMore, loading, loaded, loadMore };
}
