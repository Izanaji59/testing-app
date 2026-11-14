'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { CSSProperties, PropsWithChildren } from 'react';
import { T, EASE } from '@/lib/tokens';
import { BracketCorners } from './BracketCorners';
import { tiltTo, untilt } from './tilt';

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

// Ouverture d'une fenêtre du Système : un trait de lumière horizontal qui se déplie
// en panneau, légèrement basculé, comme une projection qui se stabilise.
const windowVariants: Variants = {
  closed: { opacity: 0, rotateX: -28, scaleY: 0.06 },
  open: { opacity: 1, rotateX: 0, scaleY: 1 },
};
const seamVariants: Variants = {
  closed: { opacity: 1, scaleX: 0.15 },
  open: { opacity: 0, scaleX: 1, transition: { duration: 0.7, ease: EASE.outExpo, opacity: { delay: 0.25, duration: 0.45 } } },
};

/**
 * Panel HUD avec brackets, label optionnel, ouverture en 3D.
 * Sur ordinateur, le panneau s'incline vers la souris : les angles flottent devant la
 * vitre, une plaque arrière donne son épaisseur. Rien de tout ça si le mouvement est réduit.
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
  const reduce = useReducedMotion();

  return (
    <motion.div
      variants={windowVariants}
      initial={reduce ? false : 'closed'}
      whileInView="open"
      viewport={{ once: true, margin: '0px 0px -6% 0px' }}
      transition={{ duration: 0.55, ease: EASE.outExpo, delay }}
      className={className}
      style={{ position: 'relative', transformPerspective: 1000, ...style }}
    >
      {!reduce && (
        <motion.div
          aria-hidden="true"
          variants={seamVariants}
          style={{
            position: 'absolute', left: 0, right: 0, top: '50%', height: 2, marginTop: -1, zIndex: 2,
            background: T.cyanHi, boxShadow: `0 0 14px ${T.cyan}, 0 0 32px ${T.cyanGlow}`, pointerEvents: 'none',
          }}
        />
      )}
      <div
        onPointerMove={e => tiltTo(e.currentTarget, e)}
        onPointerLeave={e => untilt(e.currentTarget)}
        style={{ position: 'relative', transformStyle: 'preserve-3d', transition: 'transform .4s cubic-bezier(.22,1,.36,1)' }}
      >
        {/* Plaque arrière : l'épaisseur de la vitre, visible quand le panneau s'incline. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, transform: 'translateZ(-16px)', pointerEvents: 'none',
            border: `1px solid ${T.line}`, background: 'rgba(2, 6, 14, 0.7)',
            opacity: 'var(--hud-depth, 0)' as unknown as number, transition: 'opacity .3s',
          }}
        />
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
        {/* Les angles flottent devant la vitre. */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'translateZ(18px)', pointerEvents: 'none' }}>
          <BracketCorners size={corner} color={T.cyan} thickness={1.5} />
        </div>
        {label && (
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: 18,
              padding: '0 8px',
              transform: 'translateY(-50%) translateZ(24px)',
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
      </div>
    </motion.div>
  );
}
