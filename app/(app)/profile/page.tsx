'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useRevenue } from '@/hooks/useRevenue';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { ProfileSpace } from '@/components/profile/ProfileSpace';
import { T } from '@/lib/tokens';
import { supabase } from '@/lib/supabase/client';
import { SPECS } from '@/lib/engine/specs';
import { getMbtiClass } from '@/lib/engine/mbtiClasses';
import { fmtRank } from '@/lib/utils';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, stats, specializations, refresh, loading } = useProfile();
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

        <ProfileSpace profile={profile} stats={stats} owner onIdentityChange={refresh} />

        <VisibilitySettings profile={profile} onChange={refresh} />

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

// ─────────────────────── Ce que les autres joueurs voient ───────────────────────

const VISIBILITY: Array<{ key: 'show_stats' | 'show_revenue' | 'show_rank' | 'show_mbti'; label: string; detail: string }> = [
  { key: 'show_stats',   label: 'Mes statistiques',        detail: 'Discipline, Focus, Force… et le radar.' },
  { key: 'show_revenue', label: 'Ma dimension économique', detail: 'Le niveau de la stat Revenu. Les montants en euros restent toujours privés.' },
  { key: 'show_rank',    label: 'Mon rang et mon niveau',  detail: 'Rang, titre de rang, niveau et XP totale.' },
  { key: 'show_mbti',    label: 'Mon MBTI',                detail: 'Ta classe MBTI et le titre de rang propre à ton type.' },
];

function VisibilitySettings({ profile, onChange }: { profile: Profile; onChange: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function toggle(key: (typeof VISIBILITY)[number]['key'], value: boolean) {
    setSaving(key); setError('');
    const { error: failure } = await supabase().from('profiles').update({ [key]: value }).eq('user_id', profile.user_id);
    if (failure) setError('Ce choix n’a pas pu être enregistré. Réessaie.');
    else onChange();
    setSaving(null);
  }

  return (
    <HudPanel label="CE QUE LES AUTRES VOIENT" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
          Ton pseudo <strong style={{ color: T.text }}>{profile.display_name || profile.operator_code}</strong> est toujours affiché. Le reste, c’est toi qui choisis.
        </p>
        {VISIBILITY.map(v => (
          <label key={v.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minHeight: 44, cursor: saving ? 'wait' : 'pointer' }}>
            <input
              type="checkbox"
              checked={!!profile[v.key]}
              disabled={saving !== null}
              onChange={e => toggle(v.key, e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2, accentColor: T.cyan, flexShrink: 0 }}
            />
            <span>
              <span style={{ display: 'block', fontFamily: T.display, fontSize: 14, color: T.text }}>{v.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: T.textDim, marginTop: 2 }}>{v.detail}</span>
            </span>
          </label>
        ))}
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
        <a href={'/member/?id=' + profile.user_id} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.cyan }}>
          → VOIR MON PROFIL COMME LES AUTRES
        </a>
      </div>
    </HudPanel>
  );
}
