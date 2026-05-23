'use client';

import { motion } from 'framer-motion';
import { T, EASE } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import type { Project } from '@/lib/types';

/**
 * Vue BOSS — barre HP géante, phases visibles.
 */
export function BossHpBar({ project }: { project: Project }) {
  const total = project.hp_total ?? 1000;
  const remaining = project.hp_remaining ?? total;
  const pct = Math.max(0, Math.min(100, (1 - remaining / total) * 100));
  const phases = project.phase_count || 3;
  const currentPhase = project.phase_current || 1;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 9, color: T.amber,
        letterSpacing: '0.22em', marginBottom: 6,
      }}>
        <span>BOSS · PHASE {currentPhase}/{phases}</span>
        <span style={{ color: T.text }}>{remaining.toLocaleString('fr-FR')} HP</span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 22,
          background: 'rgba(255, 178, 61, 0.06)',
          border: `1px solid ${T.amber}66`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: EASE.outExpo }}
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            background: `linear-gradient(90deg, ${T.amber}aa, ${T.amber})`,
            boxShadow: `0 0 14px ${T.amber}88, inset 0 0 8px ${T.amber}`,
          }}
        />
        {/* phase markers */}
        {Array.from({ length: phases - 1 }).map((_, i) => {
          const left = ((i + 1) / phases) * 100;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${left}%`, width: 1,
                background: T.bg,
              }}
            />
          );
        })}
      </div>
      <DataReadout size={9} style={{ display: 'block', marginTop: 6, textAlign: 'right' }}>
        {Math.round(pct)}% INFLIGÉ
      </DataReadout>
    </div>
  );
}
