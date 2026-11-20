'use client';

// Événements communautaires (0028) : liste, inscription, création. Tout passe par des RPC sécurisées.

import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase/client';
import type { CommunityEvent, EventCategory, EventMode } from '@/lib/events';

export type EventScope = 'a_venir' | 'mes' | 'passes';
export type EventInput = {
  title: string; description: string; category: EventCategory; starts_at: string; ends_at: string | null;
  mode: EventMode; place: string; online_url: string | null; capacity: number | null;
};

async function list(scope: EventScope, id?: string | null): Promise<CommunityEvent[]> {
  const { data, error } = await supabase().rpc('list_events', { p_scope: scope, p_id: id ?? null });
  if (error) throw error;
  return (data ?? []) as CommunityEvent[];
}

export function useEvents(scope: EventScope) {
  const { data, error, isLoading } = useSWR(['events', scope], () => list(scope));
  return { events: data ?? [], error, loading: isLoading };
}

export function useEvent(id: string | null) {
  const { data, error, isLoading } = useSWR(id ? ['event', id] : null, () => list('a_venir', id));
  return { event: data?.[0] ?? null, error, loading: isLoading };
}

const refreshAll = () => mutate(key => Array.isArray(key) && (key[0] === 'events' || key[0] === 'event'));

/** Message lisible : les erreurs métier du serveur sont déjà rédigées en français. */
export function eventError(error: unknown): string {
  const text = (error as { message?: string })?.message ?? '';
  if (/^(Donne|Description|Choisis|La date|La fin|Indique|Le lien|Le nombre|Tu as déjà|Seul|Cet événement|Complet|Il y a déjà|Événement introuvable|Connecte-toi)/.test(text)) return text + '.';
  return 'L’opération n’a pas abouti. Réessaie dans un instant.';
}

function args(input: EventInput) {
  return {
    p_title: input.title, p_description: input.description, p_category: input.category, p_starts_at: input.starts_at,
    p_ends_at: input.ends_at, p_mode: input.mode, p_place: input.place, p_online_url: input.online_url, p_capacity: input.capacity,
  };
}

export async function createEvent(input: EventInput): Promise<string> {
  const { data, error } = await supabase().rpc('create_event', args(input));
  if (error) throw error;
  await refreshAll();
  return data as string;
}

export async function updateEvent(id: string, input: EventInput) {
  const { error } = await supabase().rpc('update_event', { p_id: id, ...args(input) });
  if (error) throw error;
  await refreshAll();
}

export async function cancelEvent(id: string) {
  const { error } = await supabase().rpc('cancel_event', { p_id: id });
  if (error) throw error;
  await refreshAll();
}

export async function registerEvent(id: string) {
  const { error } = await supabase().rpc('register_event', { p_id: id });
  if (error) throw error;
  await refreshAll();
}

export async function unregisterEvent(id: string) {
  const { error } = await supabase().rpc('unregister_event', { p_id: id });
  if (error) throw error;
  await refreshAll();
}

export async function fetchParticipants(id: string): Promise<{ display_name: string; registered_at: string }[]> {
  const { data, error } = await supabase().rpc('get_event_participants', { p_id: id });
  if (error) throw error;
  return (data ?? []) as { display_name: string; registered_at: string }[];
}
