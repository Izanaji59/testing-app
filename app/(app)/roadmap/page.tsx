'use client';

import { useProfile } from '@/hooks/useProfile';
import { useProjects } from '@/hooks/useProjects';
import { useQuests } from '@/hooks/useQuests';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { RANK_GATES } from '@/lib/engine/rank';
import { getRankTitle } from '@/lib/engine/rankTitles';
import { projectPct } from '@/lib/engine/progress';

export default function RoadmapPage() {
  const { profile, loading } = useProfile();
  const { projects } = useProjects();
  const { quests } = useQuests();
  const completedProjects = projects.filter(p=>p.status==='COMPLETED' && quests.filter(q=>q.project_id===p.id && q.status==='COMPLETED' && !q.is_flash).length>=3).length;

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="ROADMAP" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Trajectoire de rang */}
        <HudPanel label="TRAJECTOIRE · RANGS" glow={0.4}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RANK_GATES.map(g => {
              const passed = RANK_GATES.findIndex(r=>r.letter===profile.rank_letter) >= RANK_GATES.indexOf(g);
              const current = profile.rank_letter === g.letter;
              const rt = getRankTitle(profile.mbti,g.letter);
              return (
                <div key={g.letter} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 12px',
                  border: `1px solid ${current ? T.cyan : T.line}`,
                  background: current ? 'rgba(78, 205, 255, 0.06)' : 'transparent',
                }}>
                  <div style={{
                    fontFamily: T.rank, fontWeight: 800, fontSize: 24,
                    color: passed ? T.cyan : T.textMute, width: 42,
                    textAlign: 'center', textShadow: passed ? `0 0 10px ${T.cyanGlow}` : 'none',
                  }}>
                    {g.letter}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.display, fontSize: 13, color: passed ? T.text : T.textDim }}>
                      Lv {g.minLevel}{g.maxLevel ? `–${g.maxLevel}` : '+'} / {rt.title}
                    </div>
                    <DataReadout size={9} style={{ display: 'block', marginTop: 2 }}>
                      {g.gate}<br/>{rt.stage} — {rt.desc}
                    </DataReadout>
                  </div>
                  <div style={{
                    fontFamily: T.mono, fontSize: 9, color: passed ? T.green : T.textMute,
                    letterSpacing: '0.18em',
                  }}>
                    {passed ? (current ? 'ICI' : 'PASSÉ') : 'À VENIR'}
                  </div>
                </div>
              );
            })}
            <p style={{fontSize:12,color:T.textDim,lineHeight:1.7}}>{profile.total_xp.toLocaleString('fr-FR')} XP acquis. {completedProjects} projet(s) reconnu(s) : projet terminé contenant au moins trois quêtes accomplies hors quêtes flash. Tes statistiques gardent leur propre progression.</p>
            <p style={{fontSize:12,color:T.textDim,lineHeight:1.7}}>Repère : 180 XP par journée active, cinq jours par semaine, permettent d’atteindre le seuil du rang A en environ 17 mois. Cours, entraînement et projets peuvent contribuer. Un minuteur seul n’accorde pas d’XP.</p>
          </div>
        </HudPanel>

        {/* Missions actives */}
        <HudPanel label={`PROJETS / ${projects.length}`}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.length === 0 ? (
              <DataReadout>AUCUN PROJET ENCORE.</DataReadout>
            ) : projects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 6, height: 6, background: T.cyan,
                  boxShadow: `0 0 6px ${T.cyan}`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.display, fontSize: 13, color: T.text }}>{p.title}</div>
                  <DataReadout size={9} style={{ display: 'block', marginTop: 2 }}>
                    {p.type} · {Math.round(projectPct(p))}% · {p.status}
                  </DataReadout>
                </div>
              </div>
            ))}
          </div>
        </HudPanel>

        {/* Roadmap produit (les V) */}
        <HudPanel label="PHASES · PRODUIT" thin glow={0.15}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PhaseRow code="MVP"     name="PRIMER"      desc="Boucle journalière — 1 type de projet" status="ACTIF" />
            <PhaseRow code="V1"      name="ENGINE"      desc="5 types · specs · skills · adaptatif" status="EN DEV" />
            <PhaseRow code="V2"      name="INTELLIGENCE" desc="LLM · multi-spec · boss à phases"   status="PLANIFIÉ" />
            <PhaseRow code="V3"      name="MONARCH"     desc="Binôme · glyphes · natif mobile"    status="VISION" />
          </div>
        </HudPanel>
      </div>
    </div>
  );
}

function PhaseRow({ code, name, desc, status }: { code: string; name: string; desc: string; status: string }) {
  const color = status === 'ACTIF' ? T.green : status === 'EN DEV' ? T.cyan : T.textDim;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        fontFamily: T.rank, fontWeight: 800, fontSize: 13, color, width: 36,
      }}>
        {code}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.display, fontSize: 12, color: T.text, letterSpacing: '0.08em' }}>
          {name} · <span style={{ color: T.textDim, letterSpacing: 0 }}>{desc}</span>
        </div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 8, color, letterSpacing: '0.22em' }}>{status}</div>
    </div>
  );
}
