'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { T, EASE } from '@/lib/tokens';
import { RankEmblem } from '@/components/hud/RankEmblem';

type Props = {
  fromRank: string;
  toRank: string;
  citation?: string;
  onDone: () => void;
};

/**
 * Cérémonie de rank-up. La plus longue animation du système (~5s).
 * Black flash → ancien glyphe → shockwave → nouveau glyphe → citation → retour.
 */
export function RankUpCinematic({ fromRank, toRank, citation, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 5200);
    return () => clearTimeout(t);
  }, [onDone]);

  const fromLetter = fromRank.replace(/[+\-−]/g, '');
  const fromTier = fromRank.endsWith('+') ? '+' : fromRank.endsWith('−') || fromRank.endsWith('-') ? '-' : '';
  const toLetter = toRank.replace(/[+\-−]/g, '');
  const toTier = toRank.endsWith('+') ? '+' : toRank.endsWith('−') || toRank.endsWith('-') ? '-' : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: T.bg,
        display: 'grid', placeItems: 'center',
      }}
    >
      {/* Phase 1 : ancien rang qui se dissout (0–1.2s) */}
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [1, 1, 1.4, 2] }}
        transition={{ times: [0, 0.15, 0.6, 1], duration: 1.6, ease: EASE.outExpo }}
        style={{ position: 'absolute' }}
      >
        <RankEmblem letter={fromLetter} tier={fromTier as '+' | '-' | ''} size={96} color={T.textMute} glow={0.4} />
      </motion.div>

      {/* Shockwave (~1.6s mark) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 5], opacity: [0, 0.8, 0] }}
        transition={{ duration: 4, times: [0, 0.4, 1], ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 200, height: 200, borderRadius: '50%',
          border: `2px solid ${T.cyan}`,
          boxShadow: `0 0 80px ${T.cyanGlow}`,
        }}
      />

      {/* Phase 2 : nouveau rang qui apparaît (1.6s+) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ delay: 1.8, duration: 1, ease: EASE.outExpo }}
        style={{ textAlign: 'center', position: 'absolute' }}
      >
        <RankEmblem letter={toLetter} tier={toTier as '+' | '-' | ''} size={140} color={T.cyan} glow={2.4} />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.7, ease: EASE.outExpo }}
          style={{
            marginTop: 30,
            fontFamily: T.mono, fontSize: 11, color: T.cyan,
            letterSpacing: '0.5em', textTransform: 'uppercase',
          }}
        >
          RANG {toRank} · CONFIRMÉ
        </motion.div>
      </motion.div>

      {/* Citation (~3.5s) */}
      {citation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '12%',
            maxWidth: '70%',
            fontFamily: T.display,
            fontSize: 14,
            color: T.textDim,
            textAlign: 'center',
            fontStyle: 'italic',
            letterSpacing: '0.04em',
            lineHeight: 1.5,
          }}
        >
          « {citation} »
        </motion.div>
      )}
    </motion.div>
  );
}
