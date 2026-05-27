'use client';

import { T } from '@/lib/tokens';

type Props = {
  letter: string;
  tier?: '+' | '-' | '';
  size?: number;
  color?: string;
  glow?: number; // 0..1
};

/**
 * Glyphe de rang — losange diamanté avec lettre + tier.
 */
export function RankEmblem({ letter, tier = '', size = 36, color = T.cyan, glow = 1 }: Props) {
  const half = size / 2;
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        filter: glow > 0 ? `drop-shadow(0 0 ${4 + glow * 6}px ${color})` : undefined,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
        <polygon
          points={`${half},${size * 0.18} ${size * 0.82},${half} ${half},${size * 0.82} ${size * 0.18},${half}`}
          fill={`${color}22`}
          stroke={color}
          strokeWidth={0.6}
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
          fontSize: size * 0.42,
          color: T.text,
          letterSpacing: '0.04em',
          textShadow: `0 0 6px ${color}`,
          lineHeight: 1,
        }}
      >
        {letter}
        {tier && (
          <sup
            style={{
              fontSize: size * 0.22,
              marginLeft: 1,
              color,
              top: '-0.4em',
              position: 'relative',
            }}
          >
            {tier}
          </sup>
        )}
      </div>
    </div>
  );
}
