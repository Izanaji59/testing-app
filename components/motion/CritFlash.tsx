'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { T } from '@/lib/tokens';

type Props = { multiplier: number; onDone: () => void };

/**
 * Flash cyan court (~0.6s) — confirme un crit avant le XpGainBurst.
 */
export function CritFlash({ multiplier, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.55, 0] }}
      transition={{ duration: 0.6, times: [0, 0.25, 1], ease: 'easeOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: `radial-gradient(circle at 50% 50%, ${T.cyanGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.2, opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: T.rank, fontWeight: 800, fontSize: 56,
          color: T.amber,
          textShadow: `0 0 24px ${T.amber}`,
          letterSpacing: '0.08em',
        }}
      >
        CRIT × {multiplier.toFixed(1)}
      </motion.div>
    </motion.div>
  );
}
