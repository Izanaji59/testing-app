'use client';

import { useEffect } from 'react';
import { ensureChallengeQuests } from '@/hooks/useChallenges';
import { ensureRoutineQuests } from '@/hooks/useRoutines';

/**
 * Émet les quêtes du jour (défis rejoints et quêtes quotidiennes des donjons),
 * une fois par jour et par onglet, puis à chaque retour sur l'onglet si la journée a changé.
 */
export function ChallengeSync({ userId }: { userId: string }) {
  useEffect(() => {
    let running = false;
    const sync = () => {
      const key = `grind-daily-sync:${userId}:${new Date().toDateString()}`;
      try { if (sessionStorage.getItem(key)) return; } catch {}
      if (running) return;
      running = true;
      Promise.all([ensureChallengeQuests(), ensureRoutineQuests()])
        .then(() => { try { sessionStorage.setItem(key, '1'); } catch {} })
        .catch(() => { /* réessayé au prochain retour sur l'onglet */ })
        .finally(() => { running = false; });
    };
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId]);
  return null;
}
