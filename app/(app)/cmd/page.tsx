'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { useChallenges } from '@/hooks/useChallenges';
import { DailyCheck } from '@/components/core/DailyCheck';
import { EnergyPanels } from '@/components/core/EnergyPanels';
import { useTodayBriefing } from '@/hooks/useTodayBriefing';
import { useActiveProjects } from '@/hooks/useProjects';
import { useTodayQuests } from '@/hooks/useQuests';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { BriefingCard } from '@/components/core/BriefingCard';
import { QuestCard } from '@/components/core/QuestCard';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { xpForLevel, currentLevelXp, statXpForLevel } from '@/lib/engine/xp';
import { STAT_KINDS, STAT_META } from '@/lib/engine/stats';

export default function CmdPage() {
  const { profile, stats, loading } = useProfile();
  const briefing = useTodayBriefing();
  const projects = useActiveProjects();
  const quests = useTodayQuests();

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  const { xpInLevel, xpForNext } = currentLevelXp(profile.total_xp, profile.level);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="COMMANDEMENT" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Bilan « Qu'as-tu fait aujourd'hui ? » : alerte tant que rien n'est accompli */}
        <DailyCheck />

        {/* Réservoir de volonté (Deep Work) et batterie sociale */}
        <EnergyPanels />

        {/* Briefing du jour */}
        <BriefingCard briefing={briefing} />

        {/* XP progression vers prochain niveau */}
        <HudPanel label="PROGRESSION · NIVEAU" glow={0.4}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <DataReadout color={T.textDim}>NIVEAU {profile.level}</DataReadout>
              <DataReadout color={T.cyan}>→ {profile.level + 1}</DataReadout>
            </div>
            <XpBar current={xpInLevel} max={xpForNext} height={6} />
            <div style={{
              marginTop: 8, display: 'flex', justifyContent: 'space-between',
              fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '0.18em',
            }}>
              <span>{xpInLevel.toLocaleString('fr-FR')} / {xpForNext.toLocaleString('fr-FR')} XP</span>
              <span>CONSTANCE · {Math.round(profile.constance)}</span>
            </div>
          </div>
        </HudPanel>

        {/* Quêtes du jour (max 3) */}
        <div>
          <DataReadout color={T.textDim} size={10} letterSpacing="0.28em" style={{ padding: '0 4px 8px' }}>
            QUÊTES DU JOUR · {quests.length}/3
          </DataReadout>
          {quests.length === 0 ? (
            <HudPanel thin glow={0.1}>
              <div style={{ padding: 24, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em' }}>
                AUCUNE QUÊTE ACTIVE.
                <br />
                <span style={{ color: T.cyan }}>RENDS-TOI EN ZONE QUÊTES.</span>
              </div>
            </HudPanel>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quests.slice(0, 3).map(q => <QuestCard key={q.id} quest={q} />)}
            </div>
          )}
        </div>

        {/* Mission active */}
        {projects.length > 0 && (
          <HudPanel label="MISSION ACTIVE" glow={0.3}>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: T.display, fontSize: 16, color: T.text, marginBottom: 6 }}>
                {projects[0].title}
              </div>
              <XpBar current={projects[0].progress_pct} max={100} height={4} />
              <DataReadout style={{ marginTop: 8, display: 'block' }}>
                {projects[0].type} · {Math.round(projects[0].progress_pct)}%
              </DataReadout>
            </div>
          </HudPanel>
        )}

        {/* Défis communs */}
        <ChallengesStrip />

        {/* Status : toutes les stats, dans l'ordre du Système, avec l'avancée vers le niveau suivant */}
        <HudPanel label={`STATUS · ${STAT_KINDS.length} STATS`} thin glow={0.15}>
          <div style={{ padding: 14 }}>
            {/* 3 colonnes sur téléphone, 6 au plus sur ordinateur (deux lignes égales). */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(max(96px, calc((100% - 60px) / 6)), 1fr))', gap: '14px 12px' }}>
              {STAT_KINDS.map(kind => {
                const s = stats.find(x => x.kind === kind);
                const level = s?.level ?? 1;
                const meta = STAT_META[kind];
                return (
                  <div key={kind} title={meta.description}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: meta.color, letterSpacing: '0.16em', whiteSpace: 'nowrap' }}>
                      <span aria-hidden="true">{meta.symbol} </span>{meta.short}
                    </div>
                    <div style={{ fontFamily: T.rank, fontSize: 20, color: kind === 'RESIGNATION' ? T.danger : T.text, fontVariantNumeric: 'tabular-nums', margin: '2px 0 4px' }}>
                      {level}
                    </div>
                    <XpBar current={s?.xp ?? 0} max={statXpForLevel(level)} height={4} color={meta.color} />
                  </div>
                );
              })}
            </div>
            <Link href="/stats" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 10, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', color: T.cyan, textDecoration: 'none' }}>
              VOIR LE DÉTAIL ET LE RADAR →
            </Link>
          </div>
        </HudPanel>

        {/* Bandeau pub — lien externe, ouvre dans un nouvel onglet */}
        <a
          href="/allflix/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '14px 16px',
            border: `1px dashed ${T.lineMid}`,
            background: 'rgba(78, 205, 255, 0.03)',
            textDecoration: 'none',
            marginBottom: 8,
          }}
        >
          <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginBottom: 4 }}>
            PUB
          </DataReadout>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.1em' }}>
            ALLFLIX
          </div>
        </a>

      </div>
    </div>
  );
}

function ChallengesStrip() {
  const { challenges } = useChallenges();
  const joined = challenges.filter(c => c.joined_at);
  return (
    <Link href="/defis" style={{ display: 'block', padding: '12px 14px', border: `1px solid ${T.lineMid}`, background: 'rgba(255,178,61,0.05)', textDecoration: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <DataReadout size={9} color={T.amber}>⚑ DÉFIS COMMUNS{joined.length ? ` · ${joined.length} EN COURS` : ''}</DataReadout>
        <span aria-hidden="true" style={{ fontFamily: T.mono, fontSize: 14, color: T.amber }}>→</span>
      </div>
      {joined.length === 0
        ? <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>Rejoins un défi partagé : 100 pompes par jour, coucher avant 23 h 30…</div>
        : <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {joined.slice(0, 3).map(c => {
              const day = Math.min(c.duration_days, Math.floor((Date.now() - Date.parse(c.joined_at!)) / 86_400_000) + 1);
              return (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: T.text }}>
                  <span style={{ overflowWrap: 'anywhere' }}>{c.title}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, whiteSpace: 'nowrap' }}>JOUR {day}/{c.duration_days}</span>
                </li>
              );
            })}
          </ul>}
    </Link>
  );
}
