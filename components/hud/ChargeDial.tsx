'use client';

import { motion } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';

type Props = { pct: number; size?: number; label?: string };

/**
 * Dial circulaire — affiche un pourcentage avec couleur adaptative
 * (cyan < 60 / amber 60-80 / danger > 80).
 */
export function ChargeDial({ pct, size = 56, label }: Props) {
  const color = pct > 80 ? T.danger : pct > 60 ? T.amber : T.cyan;
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * pct) / 100;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} stroke={T.line} strokeWidth={2} fill="none" />
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: EASE.outExpo }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: T.rank,
          fontWeight: 800,
          fontSize: Math.round(size * 0.28),
          color: T.text,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {pct}
        {label && (
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 7,
              color: T.textDim,
              letterSpacing: '0.22em',
              marginTop: 1,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
