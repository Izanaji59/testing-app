'use client';

import type { CSSProperties, PropsWithChildren } from 'react';
import { T } from '@/lib/tokens';

type Props = PropsWithChildren<{
  color?: string;
  size?: number;
  letterSpacing?: string;
  uppercase?: boolean;
  style?: CSSProperties;
}>;

/**
 * Texte HUD mono — utilisé pour les readouts secondaires (timestamps, labels, codes).
 */
export function DataReadout({
  children,
  color = T.textDim,
  size = 10,
  letterSpacing = '0.24em',
  uppercase = true,
  style,
}: Props) {
  return (
    <span
      style={{
        fontFamily: T.mono,
        fontSize: size,
        color,
        letterSpacing,
        textTransform: uppercase ? 'uppercase' : 'none',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
