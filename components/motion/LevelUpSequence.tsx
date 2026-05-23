'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { T, EASE } from '@/lib/tokens';

type Props = { newLevel: number; onDone: () => void };

/**
 * Séquence cinématique de level-up. Plein écran ~1.8s.
 */
export function LevelUpSequence({ newLevel, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(3, 6, 13, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0.7 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: 240, height: 240, borderRadius: '50%',
          border: `1px solid ${T.cyan}`,
          boxShadow: `0 0 60px ${T.cyanGlow}`,
        }}
      />
      <div style={{ textAlign: 'center', color: T.text }}>
        <motion.div
          initial={{ letterSpacing: '0.6em', opacity: 0 }}
          animate={{ letterSpacing: '0.32em', opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE.outExpo }}
          style={{ fontFamily: T.mono, fontSize: 12, color: T.cyan, textTransform: 'uppercase' }}
        >
          NIVEAU SUPÉRIEUR
        </motion.div>
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: EASE.outExpo }}
          style={{
            fontFamily: T.rank, fontWeight: 800, fontSize: 96,
            color: T.text, textShadow: `0 0 24px ${T.cyanGlow}`,
            lineHeight: 1, marginTop: 16, fontVariantNumeric: 'tabular-nums',
          }}
        >
          {newLevel}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{
            fontFamily: T.mono, fontSize: 10, color: T.textDim,
            letterSpacing: '0.28em', marginTop: 8,
          }}
        >
          +1 POINT DE MAÎTRISE
        </motion.div>
      </div>
    </motion.div>
  );
}
