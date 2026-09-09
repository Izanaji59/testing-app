'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { HudPanel } from '@/components/hud/HudPanel';
import { ChargeDial } from '@/components/hud/ChargeDial';
import { DataReadout } from '@/components/hud/DataReadout';
import { T, EASE } from '@/lib/tokens';
import { STAT_META } from '@/lib/engine/stats';
import { createQuestFlash } from '@/hooks/useQuests';
import type { Briefing } from '@/lib/types';

type Props = { briefing: Briefing | null };

export function BriefingCard({ briefing }: Props) {
  const [addedTitles, setAddedTitles] = useState<string[]>([]);

  if (!briefing) {
    return (
      <HudPanel label="BRIEFING · MATIN" glow={0.3}>
        <div style={{ padding: 18, fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em' }}>
          AUCUNE MISSION ACTIVE.
          <br />
          <Link href="/donjon" style={{ color: T.cyan, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            → RENDS-TOI EN ZONE DONJON POUR EN DÉMARRER UNE.
          </Link>
        </div>
      </HudPanel>
    );
  }

  const { mission, charge_mentale_pct, focus_suggested, time_window, recommendation, warning, suggested_missions } = briefing.payload;
  const charge = charge_mentale_pct ?? 50;
  const warnColor = warning ? T.danger : T.cyan;

  async function addSuggestion(m: NonNullable<typeof suggested_missions>[number]) {
    await createQuestFlash({
      title: m.title,
      project_id: null,
      estimated_minutes: m.estimated_minutes,
      difficulty_tier: m.difficulty_tier,
      reward_stats: [m.stat_kind],
    });
    setAddedTitles(t => [...t, m.title]);
    mutate('quests');
  }

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

        {suggested_missions && suggested_missions.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DataReadout size={9}>MISSIONS SUGGÉRÉES</DataReadout>
            {suggested_missions.map(m => {
              const added = addedTitles.includes(m.title);
              return (
                <div
                  key={m.title}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '10px 12px', border: `1px solid ${T.line}`, background: T.surf2,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{m.title}</div>
                    <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginTop: 2 }}>
                      {STAT_META[m.stat_kind].short} · {m.estimated_minutes} MIN
                    </DataReadout>
                  </div>
                  <button
                    onClick={() => addSuggestion(m)}
                    disabled={added}
                    style={{
                      background: added ? 'transparent' : T.cyan,
                      color: added ? T.textMute : T.bg,
                      border: added ? `1px solid ${T.line}` : 'none',
                      padding: '6px 10px',
                      fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em',
                      cursor: added ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {added ? 'AJOUTÉE' : '+ AJOUTER'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
