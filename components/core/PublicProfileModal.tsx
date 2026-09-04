'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { T, EASE } from '@/lib/tokens';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { StatRadar } from '@/components/hud/StatRadar';
import { fmtRank } from '@/lib/utils';
import type { PublicProfile, Stat } from '@/lib/types';

type Props = {
  userId: string;
  onClose: () => void;
};

/**
 * Aperçu du profil d'un autre joueur, ouvert en overlay depuis le chat
 * (clic sur un pseudo). Passe par get_public_profile / get_public_stats
 * (RPC security definer) — jamais une lecture directe de profiles/stats
 * pour un autre user_id, RLS oblige.
 */
export function PublicProfileModal({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const sb = supabase();

    Promise.all([
      sb.rpc('get_public_profile', { target_user: userId }),
      sb.rpc('get_public_stats', { target_user: userId }),
    ]).then(([profileRes, statsRes]) => {
      if (cancelled) return;
      const row = (profileRes.data as PublicProfile[] | null)?.[0] ?? null;
      if (!row || profileRes.error) {
        setStatus('error');
        return;
      }
      setProfile(row);
      setStats((statsRes.data ?? []) as Stat[]);
      setStatus('ready');
    });

    return () => { cancelled = true; };
  }, [userId]);

  const rank = profile ? fmtRank(profile.rank_letter, profile.rank_tier) : 'E';
  const letter = rank.replace(/[+\-−]/g, '');
  const tier = rank.endsWith('+') ? '+' : rank.endsWith('−') ? '-' : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3, 6, 13, 0.82)',
          backdropFilter: 'blur(4px)',
          display: 'grid', placeItems: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.28, ease: EASE.outExpo }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <HudPanel label="PROFIL OPÉRATEUR" glow={0.6}>
            <div style={{ padding: 20 }}>
              {status === 'loading' && (
                <DataReadout color={T.cyan}>CHARGEMENT…</DataReadout>
              )}
              {status === 'error' && (
                <DataReadout color={T.danger}>PROFIL INDISPONIBLE.</DataReadout>
              )}
              {status === 'ready' && profile && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                    <RankEmblem letter={letter} tier={tier as '+' | '-' | ''} size={56} color={T.cyan} glow={1.1} />
                    <div>
                      <div style={{ fontFamily: T.display, fontSize: 18, color: T.text, letterSpacing: '0.04em' }}>
                        {profile.display_name || profile.operator_code}
                      </div>
                      <DataReadout size={9} style={{ display: 'block', marginTop: 2 }}>
                        {profile.mbti_class} · RANG {rank} · NIV. {profile.level}
                      </DataReadout>
                    </div>
                  </div>

                  <DataReadout size={9} style={{ display: 'block', marginBottom: 4 }}>
                    {profile.total_xp.toLocaleString('fr-FR')} XP TOTAL
                  </DataReadout>

                  <div style={{ display: 'grid', placeItems: 'center', marginTop: 10 }}>
                    <StatRadar stats={stats} size={220} />
                  </div>
                </>
              )}

              <button
                onClick={onClose}
                style={{
                  marginTop: 16,
                  background: 'transparent',
                  color: T.textDim,
                  border: `1px solid ${T.line}`,
                  padding: '10px',
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
                  cursor: 'pointer', width: '100%',
                }}
              >
                FERMER
              </button>
            </div>
          </HudPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
