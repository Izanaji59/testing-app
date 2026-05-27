'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { Header } from '@/components/shell/Header';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import { SPECS } from '@/lib/engine/specs';
import { fmtRank } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, specializations, refresh } = useProfile();
  const [savingMbti, setSavingMbti] = useState(false);

  if (!profile) return null;

  const primarySpec = specializations.find(s => s.is_primary);
  const rank = fmtRank(profile.rank_letter, profile.rank_tier);
  const letter = rank.replace(/[+\-−]/g, '');
  const tier = rank.endsWith('+') ? '+' : rank.endsWith('−') ? '-' : '';

  async function logout() {
    await supabase().auth.signOut();
    router.replace('/login');
  }

  async function updateMbti(value: string) {
    setSavingMbti(true);
    try {
      await supabase().from('profiles').update({ mbti: value || null }).eq('user_id', profile!.user_id);
      refresh();
    } finally {
      setSavingMbti(false);
    }
  }

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="PROFIL" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Identité */}
        <HudPanel label="IDENTITÉ" glow={0.4}>
          <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <RankEmblem letter={letter} tier={tier as '+' | '-' | ''} size={64} color={T.cyan} glow={1.2} />
            <div style={{ flex: 1 }}>
              <DataReadout>{profile.operator_code}</DataReadout>
              <div style={{ fontFamily: T.display, fontSize: 22, color: T.text, marginTop: 4 }}>
                Rang {rank}
              </div>
              <DataReadout style={{ display: 'block', marginTop: 2 }}>
                NIVEAU {profile.level} · {profile.total_xp.toLocaleString('fr-FR')} XP
              </DataReadout>
            </div>
          </div>
        </HudPanel>

        {/* MBTI */}
        <HudPanel label="MBTI · OPTIONNEL">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DataReadout>4 LETTRES — EX: INTJ</DataReadout>
            <input
              defaultValue={profile.mbti ?? ''}
              maxLength={4}
              onBlur={e => updateMbti(e.target.value.toUpperCase())}
              placeholder="—"
              style={{
                background: 'rgba(78, 205, 255, 0.04)',
                border: `1px solid ${T.lineMid}`,
                color: T.text, padding: '10px 12px',
                fontFamily: T.mono, fontSize: 14, letterSpacing: '0.18em',
                textTransform: 'uppercase', outline: 'none',
              }}
            />
            {savingMbti && <DataReadout color={T.cyan}>SAUVEGARDE…</DataReadout>}
          </div>
        </HudPanel>

        {/* Spécialisation */}
        <HudPanel label={primarySpec ? `SPÉCIALISATION · ${SPECS[primarySpec.kind].label}` : 'SPÉCIALISATION'}>
          <div style={{ padding: 16 }}>
            {primarySpec ? (
              <>
                <div style={{ fontFamily: T.display, fontSize: 18, color: T.cyan, letterSpacing: '0.08em' }}>
                  {SPECS[primarySpec.kind].label}
                </div>
                <DataReadout style={{ display: 'block', marginTop: 6 }}>
                  {SPECS[primarySpec.kind].identity}
                </DataReadout>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.green, marginTop: 8, letterSpacing: '0.16em' }}>
                  BONUS · {SPECS[primarySpec.kind].bonus}
                </div>
              </>
            ) : profile.level >= 25 ? (
              <DataReadout color={T.cyan}>
                → DISPONIBLE. ALLER DÉBLOQUER UNE SPÉCIALISATION.
              </DataReadout>
            ) : (
              <DataReadout>
                VERROUILLÉ. DÉBLOQUÉ AU NIVEAU 25 (RANG C).
              </DataReadout>
            )}
          </div>
        </HudPanel>

        {/* Stats globales */}
        <HudPanel thin>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <Stat label="CONSTANCE" value={`${Math.round(profile.constance)}%`} />
            <Stat label="MASTERY PTS" value={profile.mastery_points.toString()} />
          </div>
        </HudPanel>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            color: T.danger,
            border: `1px solid ${T.danger}55`,
            padding: '12px',
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.28em',
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          DÉCONNEXION
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <DataReadout size={9}>{label}</DataReadout>
      <div style={{ fontFamily: T.rank, fontSize: 22, color: T.text, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}
