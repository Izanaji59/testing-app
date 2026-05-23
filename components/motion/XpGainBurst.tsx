'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';

type Props = {
  amount: number;
  stat?: string | null;
  isCrit?: boolean;
  onComplete?: () => void;
};

/**
 * Animation +XP — brève (< 800ms), élégante, non-bruyante.
 */
export function XpGainBurst({ amount, stat, isCrit, onComplete }: Props) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.98 }}
        transition={{ duration: 0.32, ease: EASE.outExpo }}
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          letterSpacing: '0.22em',
          color: isCrit ? T.cyanHi : T.cyan,
          textShadow: `0 0 8px ${isCrit ? T.cyanHi : T.cyanGlow}`,
          padding: '5px 12px',
          border: `1px solid ${isCrit ? T.lineHot : T.lineMid}`,
          background: 'rgba(6, 9, 26, 0.86)',
          backdropFilter: 'blur(6px)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {isCrit && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.7, times: [0, 0.15, 0.7, 1] }}
            style={{ color: T.amber, fontWeight: 700 }}
          >
            CRIT
          </motion.span>
        )}
        <span>+{amount} XP</span>
        {stat && <span style={{ color: T.textDim }}>· {stat.slice(0, 4)}</span>}
      </motion.div>
    </AnimatePresence>
  );
}
