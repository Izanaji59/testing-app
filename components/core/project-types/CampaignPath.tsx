'use client';

import { T } from '@/lib/tokens';
import type { Project } from '@/lib/types';

/**
 * Vue CAMPAIGN — chemin sinueux multi-phases.
 */
export function CampaignPath({ project }: { project: Project }) {
  const phases = project.phase_count || 3;
  const current = project.phase_current || 1;
  const w = 280; const h = 60;

  // Sinusoïde simple
  const points = Array.from({ length: phases }).map((_, i) => {
    const x = (w / (phases - 1 || 1)) * i;
    const y = h / 2 + Math.sin((i / (phases - 1 || 1)) * Math.PI * 2) * 16;
    return { x, y, idx: i + 1 };
  });

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path
        d={`M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`}
        stroke={T.line}
        strokeWidth={1.2}
        fill="none"
      />
      {points.map(p => {
        const done = p.idx < current;
        const active = p.idx === current;
        return (
          <g key={p.idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill={done || active ? T.cyan : 'transparent'}
              stroke={done || active ? T.cyan : T.lineMid}
              strokeWidth={1.5}
              filter={active ? `drop-shadow(0 0 4px ${T.cyan})` : undefined}
            />
            <text x={p.x} y={p.y + 22} fill={T.textDim} fontFamily={T.mono} fontSize={8} textAnchor="middle">
              {p.idx}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
