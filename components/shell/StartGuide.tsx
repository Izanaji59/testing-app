'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import type { Project, Quest } from '@/lib/types';

const FLASH_PROJECT = 'Quêtes flash';
const PAGES = ['/cmd', '/donjon', '/quests'];

export type GuideProgress = { donjon: boolean; quest: boolean; started: boolean };

/** Étapes franchies : un vrai donjon, une quête rattachée à ce donjon, une quête démarrée ou terminée. */
export function guideProgress(projects: Pick<Project, 'id' | 'title'>[], quests: Pick<Quest, 'project_id' | 'status'>[]): GuideProgress {
  const donjons = new Set(projects.filter(p => p.title !== FLASH_PROJECT).map(p => p.id));
  return {
    donjon: donjons.size > 0,
    quest: quests.some(q => donjons.has(q.project_id)),
    started: quests.some(q => q.status === 'IN_PROGRESS' || q.status === 'COMPLETED'),
  };
}

const STEPS: Array<{ key: keyof GuideProgress; title: string; text: string; cta: string; href: string }> = [
  { key: 'donjon', title: 'Crée ton premier donjon', text: 'Un objectif qui compte : lancer un projet, reprendre le sport, réussir un examen…', cta: 'Créer un donjon', href: '/donjon/?creer=1' },
  { key: 'quest', title: 'Découpe-le en quête', text: 'Une action concrète, datée, qui fait avancer ce donjon.', cta: 'Créer une quête', href: '/quests/?creer=1' },
  { key: 'started', title: 'Lance ta première quête', text: 'Démarre-la, ou appuie sur « J’ai besoin de me concentrer » pour la travailler maintenant.', cta: 'Voir mes quêtes', href: '/quests/' },
];

/** Guide des premiers pas après l'inscription : donjon → quête → action. Refermable. */
export function StartGuide({ userId }: { userId: string }) {
  const pathname = usePathname();
  // Lecture du cache SWR alimenté par useProjects / useQuests (montés dans FocusProvider).
  const { data: projects } = useSWR<Project[]>('projects');
  const { data: quests } = useSWR<Quest[]>('quests');
  const key = 'grind-guide-dismissed:' + userId;
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { try { setDismissed(localStorage.getItem(key) === '1'); } catch { setDismissed(false); } }, [key]);

  if (dismissed || !projects || !quests || !PAGES.some(p => pathname?.startsWith(p))) return null;
  const progress = guideProgress(projects, quests);
  const done = STEPS.filter(s => progress[s.key]).length;
  if (done === STEPS.length) return null;
  const current = STEPS.find(s => !progress[s.key]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(key, '1'); } catch {}
  }

  return (
    <div style={{ padding: '14px 14px 0' }}>
      <HudPanel label={`PREMIERS PAS · ${done}/${STEPS.length}`} glow={0.5}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DataReadout color={T.cyan} size={10}>{done === 0 ? 'BIENVENUE, JOUEUR. TROIS ÉTAPES POUR LANCER TA PROGRESSION.' : 'CONTINUE : TA PROGRESSION SE MET EN PLACE.'}</DataReadout>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEPS.map((step, i) => {
              const ok = progress[step.key], isCurrent = step === current;
              return (
                <li key={step.key} aria-current={isCurrent ? 'step' : undefined} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', opacity: ok || isCurrent ? 1 : 0.5 }}>
                  <span aria-hidden="true" style={{ fontFamily: T.mono, fontSize: 12, color: ok ? T.green : isCurrent ? T.cyan : T.textMute, width: 18 }}>{ok ? '✓' : isCurrent ? '▸' : i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.display, fontSize: 14, color: ok ? T.textDim : T.text, textDecoration: ok ? 'line-through' : 'none' }}>
                      {step.title}<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{ok ? ' (fait)' : ''}</span>
                    </div>
                    {isCurrent && <p style={{ margin: '4px 0 10px', fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>{step.text}</p>}
                    {isCurrent && (
                      <Link href={step.href} style={{ display: 'inline-block', background: T.cyan, color: T.bg, padding: '10px 14px', fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textDecoration: 'none', boxShadow: `0 0 10px ${T.cyanGlow}` }}>
                        {step.cta.toUpperCase()} →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={dismiss} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: T.textMute, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', cursor: 'pointer', minHeight: 32 }}>
            JE PRÉFÈRE DÉCOUVRIR SEUL
          </button>
        </div>
      </HudPanel>
    </div>
  );
}
