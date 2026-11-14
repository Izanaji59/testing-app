'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';
import type { Stat, StatKind } from '@/lib/types';
import { radarScale } from '@/lib/engine/radar';

const STAT_ORDER: StatKind[] = [
  'DISCIPLINE','FOCUS','INTELLIGENCE','CREATIVITY','LEADERSHIP',
  'FORCE','MENTALITE','TECHNIQUE','SOCIAL','AGUERRISSEMENT','REVENU','RESIGNATION',
];

const STAT_LABEL: Record<StatKind, string> = {
  DISCIPLINE: 'DISC', FOCUS: 'FOC', INTELLIGENCE: 'INT', CREATIVITY: 'CRE',
  LEADERSHIP: 'LEAD', FORCE: 'FOR', MENTALITE: 'MEN',
  TECHNIQUE: 'TECH', SOCIAL: 'SOC', AGUERRISSEMENT: 'AGU', REVENU: 'REV', RESIGNATION: 'RÉS',
};

type RadarStat = Pick<Stat, 'kind' | 'level'>;

type Props = {
  stats: RadarStat[];
  size?: number;
  /** Niveau du cercle extérieur. Par défaut, échelle adaptative (radarScale). */
  max?: number;
};

/** Radar des stats fournies (les stats masquées d'un profil public n'apparaissent pas). */
export function StatRadar({ stats, size = 240, max }: Props) {
  const gradientId = `res-${useId().replace(/:/g, '')}`;
  const padX = 34, padTop = 14, padBottom = 30;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  const byKind = new Map<StatKind, RadarStat>();
  stats.forEach(s => byKind.set(s.kind, s));
  const kinds = STAT_ORDER.filter(kind => byKind.has(kind));
  const n = kinds.length;
  const scale = max ?? radarScale(kinds.map(kind => byKind.get(kind)!.level));
  if (n < 3) return null;

  const points = kinds.map((kind, i) => {
    const lv = byKind.get(kind)!.level;
    const normalized = Math.min(1, Math.max(0, lv / scale));
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return {
      kind,
      level: lv,
      x: cx + cos * r * normalized,
      y: cy + sin * r * normalized,
      labelX: cx + cos * (r + 10),
      labelY: cy + sin * (r + 10),
      anchor: (cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle') as 'start' | 'end' | 'middle',
      gridX: cx + cos * r,
      gridY: cy + sin * r,
    };
  });

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridPolygon = points.map(p => `${p.gridX},${p.gridY}`).join(' ');
  const width = size + padX * 2, height = size + padTop + padBottom;

  // Pointe rouge : la partie de la forme qui s'étire vers la Résignation (stat négative),
  // du centre jusqu'aux milieux des côtés voisins.
  const res = points.findIndex(p => p.kind === 'RESIGNATION');
  const wedge = res < 0 ? null : (() => {
    const p = points[res], prev = points[(res - 1 + n) % n], next = points[(res + 1) % n];
    const m1 = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 }, m2 = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
    return { area: `${cx},${cy} ${m1.x},${m1.y} ${p.x},${p.y} ${m2.x},${m2.y}`, edge: `${m1.x},${m1.y} ${p.x},${p.y} ${m2.x},${m2.y}`, axis: p };
  })();

  return (
    <svg
      width={width} height={height} viewBox={`${-padX} ${-padTop} ${width} ${height}`}
      role="img" aria-label={`Radar des statistiques, échelle de 0 à ${scale} : ${points.map(p => `${STAT_LABEL[p.kind]} ${p.level}`).join(', ')}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* Cercles concentriques : quarts de l'échelle */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke={T.line} strokeWidth={0.6} />
      ))}
      {wedge && (
        <defs>
          <radialGradient id={gradientId} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={T.danger} stopOpacity={0.08} />
            <stop offset="1" stopColor={T.danger} stopOpacity={0.6} />
          </radialGradient>
        </defs>
      )}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.gridX} y2={p.gridY}
          stroke={p.kind === 'RESIGNATION' ? T.danger : T.line}
          strokeOpacity={p.kind === 'RESIGNATION' ? 0.55 : 1}
          strokeWidth={p.kind === 'RESIGNATION' ? 1 : 0.5} />
      ))}
      <polygon points={gridPolygon} fill="none" stroke={T.lineMid} strokeWidth={0.8} />
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE.outExpo }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <polygon
          points={polygon}
          fill={`${T.cyan}33`}
          stroke={T.cyan}
          strokeWidth={1.5}
          style={{ filter: `drop-shadow(0 0 6px ${T.cyanGlow})` }}
        />
        {wedge && <>
          <polygon points={wedge.area} fill={`url(#${gradientId})`} />
          <polyline points={wedge.edge} fill="none" stroke={T.danger} strokeWidth={1.6} strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 5px ${T.danger}aa)` }} />
          <line x1={cx} y1={cy} x2={wedge.axis.x} y2={wedge.axis.y} stroke={T.danger} strokeWidth={1.2} />
        </>}
      </motion.g>
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={p.kind === 'RESIGNATION' ? T.danger : T.cyan} />
      ))}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.labelX}
          y={p.labelY}
          fill={p.kind === 'RESIGNATION' ? T.danger : T.textDim}
          fontFamily={T.mono}
          fontSize={8}
          letterSpacing={1.5}
          textAnchor={p.anchor}
          dominantBaseline="central"
        >
          {STAT_LABEL[p.kind]} {p.level}
        </text>
      ))}
      <text x={cx} y={size + padBottom - 10} fill={T.textMute} fontFamily={T.mono} fontSize={7.5} letterSpacing={1.5} textAnchor="middle">
        ÉCHELLE 0 → {scale} · S’AGRANDIT AVEC TA PROGRESSION
      </text>
    </svg>
  );
}
