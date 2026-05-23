'use client';

import { motion } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';
import type { Stat, StatKind } from '@/lib/types';

const STAT_ORDER: StatKind[] = [
  'DISCIPLINE','FOCUS','INTELLIGENCE','CREATIVITY','LEADERSHIP',
  'ENERGY','MENTAL_RESISTANCE','TECHNIQUE','SOCIAL',
];

const STAT_LABEL: Record<StatKind, string> = {
  DISCIPLINE: 'DISC', FOCUS: 'FOC', INTELLIGENCE: 'INT', CREATIVITY: 'CRE',
  LEADERSHIP: 'LEAD', ENERGY: 'ENE', MENTAL_RESISTANCE: 'RES',
  TECHNIQUE: 'TECH', SOCIAL: 'SOC',
};

type Props = {
  stats: Stat[];
  size?: number;
  max?: number; // niveau max pour normalisation, défaut 100
};

/**
 * Radar des 9 stats. Hexagonal (9 axes).
 */
export function StatRadar({ stats, size = 240, max = 100 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const n = 9;

  const byKind = new Map<StatKind, Stat>();
  stats.forEach(s => byKind.set(s.kind, s));

  const points = STAT_ORDER.map((kind, i) => {
    const stat = byKind.get(kind);
    const lv = stat?.level ?? 1;
    const normalized = Math.min(1, lv / max);
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      kind,
      level: lv,
      x: cx + Math.cos(angle) * r * normalized,
      y: cy + Math.sin(angle) * r * normalized,
      labelX: cx + Math.cos(angle) * (r + 14),
      labelY: cy + Math.sin(angle) * (r + 14),
      gridX: cx + Math.cos(angle) * r,
      gridY: cy + Math.sin(angle) * r,
    };
  });

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridPolygon = points.map(p => `${p.gridX},${p.gridY}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Cercles concentriques */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke={T.line} strokeWidth={0.6} />
      ))}
      {/* Axes */}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.gridX} y2={p.gridY} stroke={T.line} strokeWidth={0.5} />
      ))}
      {/* Contour max */}
      <polygon points={gridPolygon} fill="none" stroke={T.lineMid} strokeWidth={0.8} />
      {/* Valeurs */}
      <motion.polygon
        points={polygon}
        fill={`${T.cyan}33`}
        stroke={T.cyan}
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE.outExpo }}
        style={{ transformOrigin: `${cx}px ${cy}px`, filter: `drop-shadow(0 0 6px ${T.cyanGlow})` }}
      />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={T.cyan} />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.labelX}
          y={p.labelY}
          fill={T.textDim}
          fontFamily={T.mono}
          fontSize={8}
          letterSpacing={1.5}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {STAT_LABEL[p.kind]} {p.level}
        </text>
      ))}
    </svg>
  );
}
