'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useXpStream } from '@/hooks/useXpStream';
import { useProfile } from '@/hooks/useProfile';
import { XpGainBurst } from '@/components/motion/XpGainBurst';
import { LevelUpSequence } from '@/components/motion/LevelUpSequence';
import { CritFlash } from '@/components/motion/CritFlash';

type Toast = {
  id: string;
  amount: number;
  stat: string | null;
  isCrit: boolean;
};

/**
 * Portal global : écoute le stream realtime d'xp_events et joue les animations.
 * Posé une fois dans le layout (app) — ne dépend que du userId.
 */
export function XpToaster({ userId }: { userId: string }) {
  const last = useXpStream(userId);
  const { profile } = useProfile();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [critMult, setCritMult] = useState<number | null>(null);
  const [prevLevel, setPrevLevel] = useState<number | null>(null);

  // Réception d'un nouveau gain XP
  useEffect(() => {
    if (!last) return;
    const t: Toast = {
      id: last.id,
      amount: last.xp_amount,
      stat: last.stat_kind,
      isCrit: !!last.is_crit,
    };
    setToasts(prev => [...prev, t].slice(-3));

    if (last.is_crit && last.crit_multiplier) {
      setCritMult(last.crit_multiplier);
    }

    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(p => p.id !== t.id));
    }, 1600);
    return () => clearTimeout(timeout);
  }, [last]);

  // Détection de level-up : si le profile.level monte
  useEffect(() => {
    if (!profile) return;
    if (prevLevel === null) {
      setPrevLevel(profile.level);
      return;
    }
    if (profile.level > prevLevel) {
      setLevelUp(profile.level);
    }
    setPrevLevel(profile.level);
  }, [profile, prevLevel]);

  return (
    <>
      {/* Toasts XP en haut */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map(t => (
            <XpGainBurst key={t.id} amount={t.amount} stat={t.stat} isCrit={t.isCrit} />
          ))}
        </AnimatePresence>
      </div>

      {/* Crit flash plein écran */}
      <AnimatePresence>
        {critMult !== null && (
          <CritFlash multiplier={critMult} onDone={() => setCritMult(null)} />
        )}
      </AnimatePresence>

      {/* Level-up cinematic */}
      <AnimatePresence>
        {levelUp !== null && (
          <LevelUpSequence newLevel={levelUp} onDone={() => setLevelUp(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
