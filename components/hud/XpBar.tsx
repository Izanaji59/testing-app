'use client';

import { motion } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';
import { clamp } from '@/lib/utils';

type Props = {
  current: number;
  max: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
};

/**
 * Barre de progression XP. Animation de remplissage à l'apparition.
 */
export function XpBar({
  current,
  max,
  color = T.cyan,
  height = 4,
  showLabel = false,
  label,
}: Props) {
  const pct = max > 0 ? clamp((current / max) * 100, 0, 100) : 0;

  return (
    <div>
      {showLabel && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: T.mono, fontSize: 9, color: T.textDim,
          letterSpacing: '0.22em', marginBottom: 4,
        }}>
          <span>{label ?? 'XP'}</span>
          <span style={{ color: T.text }}>
            {current.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')}
          </span>
        </div>
      )}
      <div
        style={{
          position: 'relative',
          height,
          background: 'rgba(78, 205, 255, 0.07)',
          border: `1px solid ${T.line}`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: EASE.outExpo }}
          style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 6px ${color}, inset 0 0 4px ${color}`,
          }}
        />
        {/* Reflet animé subtil */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.4, ease: 'linear', repeat: Infinity, repeatDelay: 1.2 }}
          style={{
            position: 'absolute',
            top: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
