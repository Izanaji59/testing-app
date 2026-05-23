'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { XpEvent } from '@/lib/types';

/**
 * Stream realtime des nouveaux xp_events.
 * Retourne le dernier event reçu — useful pour déclencher des animations.
 */
export function useXpStream(userId: string) {
  const [latest, setLatest] = useState<XpEvent | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = supabase();
    const channel = sb
      .channel(`xp_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'xp_events', filter: `user_id=eq.${userId}` },
        (payload) => setLatest(payload.new as XpEvent),
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [userId]);

  return latest;
}
