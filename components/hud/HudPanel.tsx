'use client';

import { motion } from 'framer-motion';
import type { CSSProperties, PropsWithChildren } from 'react';
import { T, EASE } from '@/lib/tokens';
import { BracketCorners } from './BracketCorners';

type Props = PropsWithChildren<{
  label?: string;
  glow?: number;        // 0..1
  thin?: boolean;
  corner?: number;
  fill?: string;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}>;

/**
 * Panel HUD avec brackets, label optionnel, reveal animation.
 * Composant le plus utilisé du système — base de toutes les cartes.
 */
export function HudPanel({
  children,
  label,
  glow = 0.3,
  thin = false,
  corner = 12,
  fill = T.surf,
  className,
  style,
  delay = 0,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE.outExpo, delay }}
      className={className}
      style={{ position: 'relative', ...style }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: fill,
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          border: `1px solid ${thin ? T.line : T.lineMid}`,
          boxShadow: `0 0 36px rgba(78, 205, 255, ${glow * 0.18}), inset 0 0 30px rgba(78, 205, 255, 0.025)`,
        }}
      />
      <BracketCorners size={corner} color={T.cyan} thickness={1.5} />
      {label && (
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 18,
            padding: '0 8px',
            transform: 'translateY(-50%)',
            background: T.bg,
            fontFamily: T.mono,
            fontSize: 9,
            letterSpacing: '0.28em',
            color: T.cyan,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 0 }}>{children}</div>
    </motion.div>
  );
}
