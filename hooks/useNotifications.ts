'use client';

// Notifications de la communauté (0029) + rappels « ça commence bientôt » calculés depuis tes événements.

import { useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { eventEnd, eventPath } from '@/lib/events';

export type Notification = { id: string; kind: 'mention' | 'inscription' | 'evenement_modifie' | 'evenement_annule' | 'rappel'; title: string; body: string; link: string; read_at: string | null; created_at: string };

const KEY = 'notifications';
const REMINDER_SEEN = 'grind-reminder-seen:';

async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase().from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) { if (error.code === '42P01' || error.code === 'PGRST205') return []; throw error; }
  return (data ?? []) as Notification[];
}

const seen = (id: string) => { try { return localStorage.getItem(REMINDER_SEEN + id) === '1'; } catch { return false; } };

export function useNotifications(userId: string | null) {
  const { data } = useSWR(userId ? KEY : null, fetchNotifications, { refreshInterval: 120_000, revalidateOnFocus: true });
  const { events } = useEvents('mes');

  // Temps réel : une nouvelle notification arrive sans recharger.
  useEffect(() => {
    if (!userId) return;
    const sb = supabase();
    let channel: RealtimeChannel | null = sb.channel(`notifications_${userId}_${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => { void mutate(KEY); })
      .subscribe();
    return () => { if (channel) sb.removeChannel(channel); channel = null; };
  }, [userId]);

  // Rappels : tes événements (inscrit ou organisateur) qui commencent dans les 24 h.
  const now = Date.now();
  const reminders: Notification[] = events
    .filter(e => !e.cancelled && (e.registered || e.is_organizer) && Date.parse(e.starts_at) > now && Date.parse(e.starts_at) - now < 86_400_000 && eventEnd(e).getTime() > now)
    .map(e => ({
      id: 'rappel-' + e.id, kind: 'rappel', title: `Bientôt : ${e.title}`,
      body: `Commence ${new Date(e.starts_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.`,
      link: eventPath(e.id), read_at: seen(e.id) ? 'vu' : null, created_at: e.starts_at,
    }));

  const items = [...reminders, ...(data ?? [])];
  const unread = items.filter(n => !n.read_at).length;

  async function markRead(ids?: string[]) {
    for (const r of reminders) if (!ids || ids.includes(r.id)) { try { localStorage.setItem(REMINDER_SEEN + r.id.slice(7), '1'); } catch {} }
    const real = ids?.filter(id => !id.startsWith('rappel-'));
    if (ids && !real?.length) { void mutate(KEY); return; }
    await supabase().rpc('mark_notifications_read', { p_ids: real ?? null });
    await mutate(KEY);
  }

  return { items, unread, markRead };
}
