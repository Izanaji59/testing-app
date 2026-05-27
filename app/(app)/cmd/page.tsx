'use client';

import { useProfile } from '@/hooks/useProfile';
import { useTodayBriefing } from '@/hooks/useTodayBriefing';
import { useActiveProjects } from '@/hooks/useProjects';
import { useTodayQuests } from '@/hooks/useQuests';
import { Header } from '@/components/shell/Header';
import { BriefingCard } from '@/components/core/BriefingCard';
import { QuestCard } from '@/components/core/QuestCard';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { xpForLevel, currentLevelXp } from '@/lib/engine/xp';

export default function CmdPage() {
  const { profile, stats } = useProfile();
  const briefing = useTodayBriefing();
  const projects = useActiveProjects();
  const quests = useTodayQuests();

  if (!profile) return null;

  const { xpInLevel, xpForNext } = currentLevelXp(profile.total_xp, profile.level);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="COMMANDEMENT" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

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

        {/* Stats rapides */}
        <HudPanel label="STATUS" thin glow={0.15}>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {stats.slice(0, 6).map(s => (
              <div key={s.id}>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.textDim, letterSpacing: '0.2em' }}>
                  {s.kind.slice(0, 4)}
                </div>
                <div style={{ fontFamily: T.rank, fontSize: 18, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                  {s.level}
                </div>
              </div>
            ))}
          </div>
        </HudPanel>

      </div>
    </div>
  );
}
