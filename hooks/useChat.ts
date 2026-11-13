'use client';

import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ChatMessage } from '@/lib/types';

const KEY = 'chat-messages';
const CHANNEL = 'chat_messages_global';

async function fetchMessages(): Promise<ChatMessage[]> {
  // Les 200 messages les plus récents, affichés du plus ancien au plus récent.
  const { data } = await supabase()
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Envoie un message dans la salle des opérateurs (texte de 1 à 500 caractères). */
export async function sendChatMessage(body: string) {
  const text = body.trim();
  if (!text) return;
  if (text.length > 500) throw new Error('Message trop long');
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Non authentifié');

  const { data: profile } = await sb
    .from('profiles')
    .select('display_name, operator_code')
    .eq('user_id', auth.user.id)
    .single();

  const senderName = profile?.display_name || profile?.operator_code || 'OPERATEUR';

  const { error } = await sb.from('chat_messages').insert({
    user_id: auth.user.id,
    sender_name: senderName,
    body: text,
  });
  if (error) throw error;
  await mutate(KEY);
}

export function useChat() {
  const { data } = useSWR(KEY, fetchMessages, { revalidateOnFocus: true });

  useEffect(() => {
    const sb = supabase();
    const channel = sb
      .channel(CHANNEL)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => mutate(KEY))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  return {
    messages: data ?? [],
    send: sendChatMessage,
  };
}
