'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useRevenue } from '@/hooks/useRevenue';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import { SPECS } from '@/lib/engine/specs';
import { getMbtiClass } from '@/lib/engine/mbtiClasses';
import { fmtRank } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, specializations, refresh, loading } = useProfile();
  const totalRevenue = useRevenue();
  const [savingMbti, setSavingMbti] = useState(false);
  const [mbtiSubmissions, setMbtiSubmissions] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase()
      .from('mbti_submissions')
      .select('mbti')
      .eq('user_id', profile.user_id)
      .then(({ data }) => setMbtiSubmissions((data ?? []).map(r => r.mbti as string)));
  }, [profile?.user_id]);

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  const primarySpec = specializations.find(s => s.is_primary);
  const mbtiClass = getMbtiClass(profile.mbti);
  const rank = fmtRank(profile.rank_letter, profile.rank_tier);
  const letter = rank.replace(/[+\-−]/g, '');
  const tier = rank.endsWith('+') ? '+' : rank.endsWith('−') ? '-' : '';

  async function logout() {
    await supabase().auth.signOut();
    router.replace('/login');
  }

  async function updateMbti(rawValue: string) {
    const mbti = rawValue.toUpperCase().trim();
    setSavingMbti(true);
    try {
      const sb = supabase();

      if (mbti === '') {
        await sb.from('profiles').update({ mbti: null, mbti_class: getMbtiClass(null).label }).eq('user_id', profile!.user_id);
        refresh();
        return;
      }
      if (!/^[EI][NS][TF][JP]$/.test(mbti)) return; // format invalide (4 lettres attendues) — ignoré

      await sb.from('mbti_submissions').insert({ user_id: profile!.user_id, mbti });
      const { data: subs } = await sb.from('mbti_submissions').select('mbti').eq('user_id', profile!.user_id);
      const types = (subs ?? []).map(r => r.mbti as string);

      const tally: Record<string, number> = {};
      for (const t of types) tally[t] = (tally[t] ?? 0) + 1;
      const [dominant] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] ?? [mbti];

      await sb.from('profiles').update({ mbti: dominant, mbti_class: getMbtiClass(dominant).label }).eq('user_id', profile!.user_id);
      setMbtiSubmissions(types);
      refresh();
    } finally {
      setSavingMbti(false);
    }
  }

  const mbtiTally: Record<string, number> = {};
  for (const t of mbtiSubmissions) mbtiTally[t] = (mbtiTally[t] ?? 0) + 1;
  const mbtiRanking = Object.entries(mbtiTally).sort((a, b) => b[1] - a[1]);
  const [dominantType, dominantCount] = mbtiRanking[0] ?? [null, 0];
  const mbtiConfidence = mbtiSubmissions.length > 0 ? Math.round((dominantCount / mbtiSubmissions.length) * 100) : 0;

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="PROFIL" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Identité */}
        <HudPanel label="IDENTITÉ" glow={0.4}>
          <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <RankEmblem letter={letter} tier={tier as '+' | '-' | ''} size={64} color={T.cyan} glow={1.2} />
            <div style={{ flex: 1 }}>
              <DataReadout>{profile.display_name || profile.operator_code}</DataReadout>
              {profile.display_name && (
                <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginTop: 2 }}>
                  {profile.operator_code}
                </DataReadout>
              )}
              <div style={{ fontFamily: T.display, fontSize: 22, color: T.text, marginTop: 4 }}>
                Rang {rank}
              </div>
              <DataReadout style={{ display: 'block', marginTop: 2 }}>
                NIVEAU {profile.level} · {profile.total_xp.toLocaleString('fr-FR')} XP
              </DataReadout>
            </div>
          </div>
        </HudPanel>

        {/* MBTI → classe */}
        <HudPanel label={`CLASSE · ${mbtiClass.label}`} glow={0.3}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: T.display, fontSize: 18, color: T.cyan, letterSpacing: '0.08em' }}>
              {mbtiClass.label}
            </div>
            <DataReadout style={{ display: 'block' }}>{mbtiClass.identity}</DataReadout>

            <DataReadout style={{ display: 'block', marginTop: 6 }}>MBTI · 4 LETTRES — EX: INTJ</DataReadout>
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

            <a
              href="https://www.16personalities.com/fr/test-de-personnalite"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
                color: T.cyan, textDecoration: 'none', marginTop: 2,
              }}
            >
              → PASSER LE TEST SUR 16PERSONALITIES.COM
            </a>

            {mbtiSubmissions.length > 0 && (
              <div style={{ marginTop: 4, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
                <DataReadout size={9} style={{ display: 'block', marginBottom: 4 }}>
                  {mbtiRanking.map(([type, count]) => `${count}× ${type}`).join(' · ')}
                </DataReadout>
                <DataReadout color={T.cyan} size={10} letterSpacing="0.1em">
                  {dominantType} ASSURÉ À {mbtiConfidence}% · SUR {mbtiSubmissions.length} TEST{mbtiSubmissions.length > 1 ? 'S' : ''}
                </DataReadout>
              </div>
            )}
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

        {/* Revenu total — exact, jamais visible des autres joueurs */}
        <HudPanel label="REVENU TOTAL GÉNÉRÉ" glow={0.3}>
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: T.rank, fontSize: 28, color: T.green, fontVariantNumeric: 'tabular-nums' }}>
              {totalRevenue.toLocaleString('fr-FR')} €
            </div>
            <DataReadout size={9} style={{ display: 'block', marginTop: 6 }}>
              QUÊTES + PROJETS TERMINÉS · VISIBLE UNIQUEMENT PAR TOI
            </DataReadout>
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
