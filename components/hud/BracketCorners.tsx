'use client';

import { T } from '@/lib/tokens';
import type { CSSProperties } from 'react';

type Props = {
  size?: number;
  color?: string;
  thickness?: number;
  opacity?: number;
  inset?: number;
};

/**
 * 4 chevrons d'angle, signature visuelle HUD LATRACTION.
 * Réutilisable autour de n'importe quel panel.
 */
export function BracketCorners({
  size = 12,
  color = T.cyan,
  thickness = 1.5,
  opacity = 1,
  inset = 0,
}: Props) {
  const armStyle: CSSProperties = { position: 'absolute', background: color };

  return (
    <>
      <div style={{ position: 'absolute', top: inset, left: inset, width: size, height: size, opacity, pointerEvents: 'none' }}>
        <div style={{ ...armStyle, top: 0, left: 0, width: size, height: thickness }} />
        <div style={{ ...armStyle, top: 0, left: 0, width: thickness, height: size }} />
      </div>
      <div style={{ position: 'absolute', top: inset, right: inset, width: size, height: size, opacity, pointerEvents: 'none' }}>
        <div style={{ ...armStyle, top: 0, right: 0, width: size, height: thickness }} />
        <div style={{ ...armStyle, top: 0, right: 0, width: thickness, height: size }} />
      </div>
      <div style={{ position: 'absolute', bottom: inset, left: inset, width: size, height: size, opacity, pointerEvents: 'none' }}>
        <div style={{ ...armStyle, bottom: 0, left: 0, width: size, height: thickness }} />
        <div style={{ ...armStyle, bottom: 0, left: 0, width: thickness, height: size }} />
      </div>
      <div style={{ position: 'absolute', bottom: inset, right: inset, width: size, height: size, opacity, pointerEvents: 'none' }}>
        <div style={{ ...armStyle, bottom: 0, right: 0, width: size, height: thickness }} />
        <div style={{ ...armStyle, bottom: 0, right: 0, width: thickness, height: size }} />
      </div>
    </>
  );
}
