'use client';

import { motion } from 'framer-motion';
import { HudPanel } from '@/components/hud/HudPanel';
import { ChargeDial } from '@/components/hud/ChargeDial';
import { DataReadout } from '@/components/hud/DataReadout';
import { T, EASE } from '@/lib/tokens';
import type { Briefing } from '@/lib/types';

type Props = { briefing: Briefing | null };

export function BriefingCard({ briefing }: Props) {
  if (!briefing) {
    return (
      <HudPanel label="BRIEFING · MATIN" glow={0.3}>
        <div style={{ padding: 18, fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em' }}>
          AUCUNE MISSION ACTIVE.
          <br />
          <span style={{ color: T.cyan }}>RENDS-TOI EN ZONE DONJON POUR EN DÉMARRER UNE.</span>
        </div>
      </HudPanel>
    );
  }

  const { mission, charge_mentale_pct, focus_suggested, time_window, recommendation, warning } = briefing.payload;
  const charge = charge_mentale_pct ?? 50;
  const warnColor = warning ? T.danger : T.cyan;

  return (
    <HudPanel label={`BRIEFING · ${briefing.kind === 'MORNING' ? 'MATIN' : briefing.kind === 'EVENING' ? 'SOIR' : 'HEBDO'}`} glow={0.5}>
      <div style={{ padding: 16 }}>
        {mission && (
          <>
            <DataReadout size={9}>MISSION ACTIVE</DataReadout>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE.outExpo }}
              style={{
                fontFamily: T.display, fontSize: 18, color: T.text,
                letterSpacing: '0.04em', marginTop: 4,
              }}
            >
              {mission.title}
            </motion.div>
            <DataReadout size={9} style={{ display: 'block', marginTop: 4 }}>
              {Math.round(mission.progress_pct)}% COMPLET
            </DataReadout>
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ChargeDial pct={charge} size={56} />
          <div style={{ flex: 1 }}>
            <DataReadout size={9}>{warning ? `⚠ ${warning}` : 'CHARGE MENTALE'}</DataReadout>
            <div style={{ fontFamily: T.display, fontSize: 14, color: warnColor, marginTop: 4 }}>
              {focus_suggested ?? 'Repos suggéré'} {time_window && `· ${time_window}`}
            </div>
          </div>
        </div>

        {recommendation && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              border: `1px solid ${T.lineMid}`,
              background: 'rgba(78, 205, 255, 0.03)',
              fontFamily: T.mono, fontSize: 11, color: T.text,
              letterSpacing: '0.04em', lineHeight: 1.5,
            }}
          >
            → {recommendation}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
